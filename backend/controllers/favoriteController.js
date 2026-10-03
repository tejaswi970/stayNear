const supabase = require('../config/supabase');
const AppError = require('../utils/AppError');
const { DEMO_LISTING_FILTER, isDemoListing } = require('../utils/demoData');

exports.getFavorites = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('favorites')
      .select('id, pg_id, created_at, pg:pg_id(id,name,description,location,address,rent,deposit,maintenance,electricity,food_cost,room_type,amenities,images,availability,verified,verification_status,created_at,updated_at)')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw new AppError('Failed to fetch favorites.', 500);

    res.json({ success: true, data: (data || []).filter(item => item.pg && !isDemoListing(item.pg.id)) });
  } catch (err) {
    next(err);
  }
};

exports.addFavorite = async (req, res, next) => {
  try {
    const { pg_id } = req.body;

    if (!pg_id) throw new AppError('PG ID is required.', 400);

    // Verify PG exists
    const { data: pg } = await supabase
      .from('pg_listings')
      .select('id')
      .eq('id', pg_id)
      .not('id', 'in', DEMO_LISTING_FILTER)
      .single();

    if (!pg) throw new AppError('PG listing not found.', 404);

    const { data, error } = await supabase
      .from('favorites')
      .insert([{ user_id: req.user.id, pg_id }])
      .select()
      .single();

    if (error) {
      // Unique constraint violation
      if (error.code === '23505') {
        throw new AppError('This PG is already in your favorites.', 409);
      }
      throw new AppError('Failed to add favorite.', 500);
    }

    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.removeFavorite = async (req, res, next) => {
  try {
    const { pgId } = req.params;

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', req.user.id)
      .eq('pg_id', pgId);

    if (error) throw new AppError('Failed to remove favorite.', 500);

    res.json({ success: true, message: 'Removed from favorites.' });
  } catch (err) {
    next(err);
  }
};
