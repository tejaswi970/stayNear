const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const hasPlaceholder = value => /your[_-]|replace[_-]with|placeholder/i.test(value || '');

if (!supabaseUrl || !supabaseKey || hasPlaceholder(supabaseUrl) || hasPlaceholder(supabaseKey)) {
  throw new Error('Supabase credentials are missing or still using placeholder values. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env.');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

module.exports = supabase;
