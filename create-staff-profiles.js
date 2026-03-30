const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function createStaffProfiles() {
  console.log('Creating staff profiles...\n');

  const staffUsers = [
    {
      email: 'doctor@example.com',
      name: 'Michael Smith',
      role: 'staff'
    },
    {
      email: 'therapist@healthclinic.com',
      name: 'Emily Davis',
      role: 'staff'
    }
  ];

  for (const user of staffUsers) {
    // Get the auth user ID
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error listing auth users:', authError);
      continue;
    }

    const authUser = authUsers.find(u => u.email === user.email);
    if (!authUser) {
      console.log(`❌ Auth user not found for ${user.email}`);
      continue;
    }

    // Check if profile already exists
    const { data: existing } = await supabase
      .from('users')
      .select('*')
      .eq('email', user.email)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`⏭️  Profile already exists: ${user.email}`);
      continue;
    }

    // Create the profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .insert({
        id: authUser.id,
        email: user.email,
        name: user.name,
        role: user.role,
        is_active: true
      })
      .select()
      .single();

    if (profileError) {
      console.error(`❌ Error creating profile for ${user.email}:`, profileError.message);
    } else {
      console.log(`✅ Created profile for ${user.email}`);
    }
  }

  console.log('\n✅ Done creating staff profiles!');
}

createStaffProfiles().catch(console.error);
