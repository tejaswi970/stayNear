const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');
const AppError = require('../utils/AppError');
const { isDemoUser } = require('../utils/demoData');

function authSchemaError(error) {
  const message = error?.message || '';
  if (/phone.*column.*users|column.*phone|users.*phone/i.test(message) && /schema cache|does not exist|not found/i.test(message)) {
    throw new AppError('Database setup is incomplete: run database/add_users_phone.sql in the Supabase SQL Editor, then restart the backend.', 503);
  }
  if (/is_demo/i.test(message) && /column|schema cache|does not exist|not found/i.test(message)) {
    throw new AppError('Database setup is incomplete: run database/filter_seed_data.sql in the Supabase SQL Editor.', 503);
  }
}

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const safeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone || '',
  created_at: user.created_at,
});

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body;

    // Only allow tenant and owner registration publicly
    if (!['tenant', 'owner'].includes(role)) {
      throw new AppError('Invalid role. Only tenant or owner registration is allowed.', 400);
    }

    // Check duplicate email
    const { data: existing, error: lookupError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (lookupError) {
      authSchemaError(lookupError);
      console.error('[Auth] Registration duplicate check failed:', lookupError.code || 'unknown');
      throw new AppError('Unable to check account details right now. Please try again.', 503);
    }

    if (existing) {
      throw new AppError('An account with this email already exists.', 409);
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { data: user, error } = await supabase
      .from('users')
      .insert([{ name, email: email.toLowerCase(), password_hash, role, phone: phone || null }])
      .select('id, name, email, role, phone, created_at')
      .single();

    if (error) {
      authSchemaError(error);
      if (error.code === '23505') throw new AppError('An account with this email already exists.', 409);
      console.error('[Auth] Supabase registration failed:', error.code || 'unknown');
      throw new AppError('Registration failed because the database rejected the account. Please try again.', 500);
    }

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      data: { user: safeUser(user), token },
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, role, phone, password_hash, created_at')
      .eq('email', email.toLowerCase())
      .single();

    if (error) {
      authSchemaError(error);
      if (error.code !== 'PGRST116') {
        console.error('[Auth] Supabase login lookup failed:', error.code || 'unknown');
        throw new AppError('Login is temporarily unavailable. Please try again.', 503);
      }
    }

    if (user && isDemoUser(user.id)) throw new AppError('Invalid email or password.', 401);

    if (error || !user) {
      throw new AppError('Invalid email or password.', 401);
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new AppError('Invalid email or password.', 401);
    }

    const token = generateToken(user);

    res.json({
      success: true,
      data: { user: safeUser(user), token },
    });
  } catch (err) {
    next(err);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, role, phone, created_at')
      .eq('id', req.user.id)
      .single();

    if (error) {
      authSchemaError(error);
      console.error('[Auth] Supabase profile lookup failed:', error.code || 'unknown');
      throw new AppError('Your profile is temporarily unavailable. Please try again.', 503);
    }
    if (isDemoUser(user?.id)) throw new AppError('User not found.', 404);
    if (!user) throw new AppError('User not found.', 404);

    res.json({ success: true, data: safeUser(user) });
  } catch (err) {
    next(err);
  }
};
