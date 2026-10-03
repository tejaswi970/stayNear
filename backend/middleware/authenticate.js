const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');
const { isDemoUser } = require('../utils/demoData');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }

  try {
    const { data: account, error } = await supabase.from('users')
      .select('id,role').eq('id', decoded.id).maybeSingle();
    if (error) {
      console.error('[Auth] Session account check failed:', error.code || 'unknown');
      if (['42703', 'PGRST204'].includes(error.code) && /is_demo/i.test(error.message || '')) {
        return res.status(503).json({ success: false, message: 'Database setup is incomplete: run database/filter_seed_data.sql.' });
      }
      return res.status(503).json({ success: false, message: 'Account verification is temporarily unavailable.' });
    }
    if (!account || isDemoUser(account.id)) {
      return res.status(401).json({ success: false, message: 'This account is not available.' });
    }
    req.user = { ...decoded, role: account.role };
    next();
  } catch (err) {
    console.error('[Auth] Session account verification failed:', err.message);
    return res.status(503).json({ success: false, message: 'Account verification is temporarily unavailable.' });
  }
};

module.exports = authenticate;
