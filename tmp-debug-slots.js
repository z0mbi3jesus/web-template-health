require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

(async () => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@healthclinic.com',
    password: 'password123'
  });
  if (error) {
    console.error('Auth error:', error.message);
    process.exit(1);
  }
  const token = data.session.access_token;
  const res = await fetch('http://localhost:3001/api/available-slots', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const body = await res.text();
  console.log('Status:', res.status);
  console.log('Body:', body.substring(0, 1000));
  process.exit(0);
})();
