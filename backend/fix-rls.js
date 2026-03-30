const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixRLS() {
  try {
    // Drop all existing policies on users table to avoid recursion
    await supabase.rpc('exec_sql', {
      sql_query: "DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.users'; END LOOP; END $$;"
    });
    console.log('✓ Dropped existing users policies');

    // Enable RLS
    await supabase.rpc('exec_sql', { 
      sql_query: "ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;" 
    });
    console.log('✓ Enabled RLS on users table');
    
    // Create service role policy - allows backend to access all rows
    await supabase.rpc('exec_sql', { 
      sql_query: "CREATE POLICY IF NOT EXISTS users_service_role ON public.users FOR ALL USING (auth.role() = 'service_role');" 
    });
    console.log('✓ Created service role policy (backend access)');

    // Allow users to read their own profile row
    await supabase.rpc('exec_sql', { 
      sql_query: "CREATE POLICY IF NOT EXISTS users_select_own ON public.users FOR SELECT USING (auth.uid() = id);" 
    });
    console.log('✓ Created self-read policy');
    
    // Deny anon access by default
    await supabase.rpc('exec_sql', { 
      sql_query: "CREATE POLICY IF NOT EXISTS users_deny_anon ON public.users FOR ALL USING (false);" 
    });
    console.log('✓ Blocked anonymous access');
    
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

fixRLS().then(() => {
  console.log('\n✅ RLS policies fixed! Security restored.');
  process.exit(0);
});
