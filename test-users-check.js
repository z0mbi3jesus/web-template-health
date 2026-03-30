const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkUsers() {
  const { data: users, error } = await supabase
    .from('users')
    .select('*');
  
  console.log('Users in database:');
  if (error) {
    console.error('Error:', error);
  } else {
    users.forEach(user => {
      console.log(`  - ${user.email} (${user.role})`);
    });
  }
}

checkUsers().catch(console.error);
