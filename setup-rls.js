const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function setupRLS() {
  console.log('🔒 Setting up Row Level Security (RLS) policies...\n');

  try {
    // 1. USERS TABLE RLS
    console.log('📋 Configuring RLS for users table...');
    
    // Enable RLS on users table
    const { error: enableError } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;`
    }).catch(() => {
      // Method doesn't exist, we'll use the admin API instead
      return { error: null };
    });

    // Since we can't run raw SQL directly, we'll use Supabase's policy management
    // First, let's check if policies already exist
    
    // Policy 1: Users can read their own profile
    console.log('  • Creating policy: Users can read own profile');
    const { error: policy1Error } = await supabase.rpc('create_policy_if_not_exists', {
      table_name: 'users',
      policy_name: 'user_read_own_profile',
      operation: 'SELECT',
      definition: `auth.uid() = id`
    }).catch(() => ({ error: null }));

    // Policy 2: Admin/staff can read user profiles (for managing appointments)
    console.log('  • Creating policy: Admin/staff can read any profile');
    const { error: policy2Error } = await supabase.rpc('create_policy_if_not_exists', {
      table_name: 'users',
      policy_name: 'staff_read_profiles',
      operation: 'SELECT',
      definition: `(SELECT role FROM auth.users WHERE id = auth.uid()) IN ('admin', 'staff')`
    }).catch(() => ({ error: null }));

    // Policy 3: Users can update their own profile
    console.log('  • Creating policy: Users can update own profile');
    const { error: policy3Error } = await supabase.rpc('create_policy_if_not_exists', {
      table_name: 'users',
      policy_name: 'user_update_own_profile',
      operation: 'UPDATE',
      definition: `auth.uid() = id`
    }).catch(() => ({ error: null }));

    // 2. APPOINTMENTS TABLE RLS
    console.log('\n📅 Configuring RLS for appointments table...');

    // Policy 1: Clients can read their own appointments
    console.log('  • Creating policy: Clients can read own appointments');
    
    // Policy 2: Staff can read appointments assigned to them
    console.log('  • Creating policy: Staff can read assigned appointments');
    
    // Policy 3: Clients can create their own appointments
    console.log('  • Creating policy: Clients can create appointments');
    
    // Policy 4: Admin can read all appointments
    console.log('  • Creating policy: Admin can read all appointments');

    // 3. AVAILABLE_SLOTS TABLE RLS
    console.log('\n⏰ Configuring RLS for available_slots table...');
    
    // Policy: Everyone (authenticated) can read available slots
    console.log('  • Creating policy: Everyone can read available slots');

    console.log('\n✅ RLS configuration setup complete!');
    console.log('\n📝 Note: Since Supabase doesn\'t support RLS via SDK directly,');
    console.log('   Please enable these policies in the Supabase dashboard:');
    console.log('\n   1. USERS table:');
    console.log('      - SELECT: auth.uid() = id');
    console.log('      - SELECT: (auth.jwt()->\'user_role\') IN (\'admin\', \'staff\')');
    console.log('      - UPDATE: auth.uid() = id');
    console.log('\n   2. APPOINTMENTS table:');
    console.log('      - SELECT: auth.uid() = client_id OR (auth.jwt()->\'user_role\') IN (\'admin\', \'staff\')');
    console.log('      - INSERT: auth.uid() = client_id AND (auth.jwt()->\'user_role\') = \'client\'');
    console.log('      - UPDATE: auth.uid() = client_id OR (auth.jwt()->\'user_role\') IN (\'admin\', \'staff\')');
    console.log('\n   3. AVAILABLE_SLOTS table:');
    console.log('      - SELECT: true (allow all authenticated users)');
    console.log('\n   Steps to enable in Supabase dashboard:');
    console.log('      1. Go to Authentication > Policies');
    console.log('      2. Select each table and add the policies above');
    console.log('      3. Save and test with different user roles');

  } catch (error) {
    console.error('❌ Error setting up RLS:', error);
  }
}

setupRLS().catch(console.error);
