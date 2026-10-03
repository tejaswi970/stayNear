const supabase = require('../config/supabase');
const AppError = require('../utils/AppError');
const { DEMO_LISTING_FILTER } = require('../utils/demoData');

const VALID_REASONS = [
  'wrong_rent', 'wrong_location', 'fake_listing',
  'occupied_pg', 'incorrect_facilities', 'suspicious_listing', 'other'
];

exports.createReport = async (req, res, next) => {
  try {
    const { pg_id, reason, description } = req.body;

    if (!pg_id || !reason) throw new AppError('PG ID and reason are required.', 400);
    if (!VALID_REASONS.includes(reason)) throw new AppError('Invalid report reason.', 400);

    // Verify PG exists
    const { data: pg } = await supabase
      .from('pg_listings')
      .select('id')
      .eq('id', pg_id)
      .not('id', 'in', DEMO_LISTING_FILTER)
      .single();

    if (!pg) throw new AppError('PG listing not found.', 404);

    const { data, error } = await supabase
      .from('reports')
      .insert([{
        user_id: req.user.id,
        pg_id,
        reason,
        description: description || null,
        status: 'open',
      }])
      .select()
      .single();

    if (error) throw new AppError('Failed to submit report.', 500);

    res.status(201).json({ success: true, data, message: 'Report submitted. Thank you.' });
  } catch (err) {
    next(err);
  }
};
