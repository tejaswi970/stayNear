const supabase = require('../config/supabase');
const AppError = require('../utils/AppError');
const { DEMO_USER_FILTER, DEMO_LISTING_FILTER } = require('../utils/demoData');

exports.getStats = async (req, res, next) => {
  try {
    const results = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'tenant').not('id', 'in', DEMO_USER_FILTER),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'owner').not('id', 'in', DEMO_USER_FILTER),
      supabase.from('pg_listings').select('*', { count: 'exact', head: true }).not('id', 'in', DEMO_LISTING_FILTER),
      supabase.from('pg_listings').select('*', { count: 'exact', head: true }).not('id', 'in', DEMO_LISTING_FILTER).eq('verification_status', 'verified'),
      supabase.from('pg_listings').select('*', { count: 'exact', head: true }).not('id', 'in', DEMO_LISTING_FILTER).neq('verification_status', 'verified'),
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    ]);
    const failedQuery = results.find(result => result.error);
    if (failedQuery) {
      console.error('Admin dashboard stats query failed:', failedQuery.error.code, failedQuery.error.message);
      throw new AppError('Failed to load dashboard statistics.', 500);
    }
    const [totalUsers, totalOwners, totalPGs, verifiedPGs, unverifiedPGs, openReports] = results.map(result => result.count || 0);

    res.json({
      success: true,
      data: {
        totalUsers: totalUsers || 0,
        totalOwners: totalOwners || 0,
        totalPGs: totalPGs || 0,
        verifiedPGs: verifiedPGs || 0,
        unverifiedPGs: unverifiedPGs || 0,
        openReports: openReports || 0,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllListings = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, verified } = req.query;
    const requestedPage = Number.parseInt(page, 10);
    const requestedLimit = Number.parseInt(limit, 10);
    const pageNum = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
    const limitNum = Number.isFinite(requestedLimit) ? Math.min(50, Math.max(1, requestedLimit)) : 20;
    const offset = (pageNum - 1) * limitNum;

    let query = supabase
      .from('pg_listings')
      .select('*, owner:owner_id(name, email)', { count: 'exact' })
      .not('id', 'in', DEMO_LISTING_FILTER)
      .order('created_at', { ascending: false });
    if (verified === 'true') query = query.eq('verification_status', 'verified');
    if (verified === 'false') query = query.neq('verification_status', 'verified');
    const { data, error, count } = await query.range(offset, offset + limitNum - 1);

    if (error) throw new AppError('Failed to fetch listings.', 500);

    res.json({
      success: true,
      data: data || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.verifyListing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const status = req.body?.status || 'verified';
    if (!['pending', 'verified', 'rejected'].includes(status)) {
      throw new AppError('Invalid verification status.', 400);
    }

    const { data, error } = await supabase
      .from('pg_listings')
      .update({
        verification_status: status,
        verified: status === 'verified',
      })
      .eq('id', id)
      .not('id', 'in', DEMO_LISTING_FILTER)
      .select()
      .single();

    if (error || !data) throw new AppError('PG listing not found.', 404);

    res.json({ success: true, data, message: `Listing ${status}.` });
  } catch (err) {
    next(err);
  }
};

exports.deleteListing = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('pg_listings')
      .delete()
      .eq('id', id)
      .not('id', 'in', DEMO_LISTING_FILTER);

    if (error) throw new AppError('Failed to remove listing.', 500);

    res.json({ success: true, message: 'Listing removed.' });
  } catch (err) {
    next(err);
  }
};

exports.getReports = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const requestedPage = Number.parseInt(page, 10);
    const requestedLimit = Number.parseInt(limit, 10);
    const pageNum = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
    const limitNum = Number.isFinite(requestedLimit) ? Math.min(50, Math.max(1, requestedLimit)) : 20;
    const offset = (pageNum - 1) * limitNum;

    let query = supabase
      .from('reports')
      .select('*, user:user_id(name, email), pg:pg_id(name, location)', { count: 'exact' });

    if (status === 'open' || status === 'resolved') {
      query = query.eq('status', status);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    const { data, error, count } = await query;
    if (error) throw new AppError('Failed to fetch reports.', 500);

    res.json({
      success: true,
      data: data || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.resolveReport = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('reports')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) throw new AppError('Report not found.', 404);

    res.json({ success: true, data, message: 'Report resolved.' });
  } catch (err) {
    next(err);
  }
};

exports.getUsers = async (req, res, next) => {
  try {
    const { role, page = 1, limit = 20 } = req.query;
    const requestedPage = Number.parseInt(page, 10);
    const requestedLimit = Number.parseInt(limit, 10);
    const pageNum = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
    const limitNum = Number.isFinite(requestedLimit) ? Math.min(50, Math.max(1, requestedLimit)) : 20;
    const offset = (pageNum - 1) * limitNum;

    let query = supabase
      .from('users')
      .select('id, name, email, role, created_at', { count: 'exact' })
      .not('id', 'in', DEMO_USER_FILTER);

    const validRoles = ['tenant', 'owner'];
    if (role && validRoles.includes(role)) {
      query = query.eq('role', role);
    } else {
      query = query.in('role', ['tenant', 'owner']);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    const { data, error, count } = await query;
    if (error) throw new AppError('Failed to fetch users.', 500);

    res.json({
      success: true,
      data: data || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
};
