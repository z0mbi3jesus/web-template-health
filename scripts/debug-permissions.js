// Direct Supabase SQL execution to disable RLS
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

async function disableRLS() {
    console.log('🔧 Attempting to disable RLS via SQL...');
    
    const sqlCommands = [
        'ALTER TABLE public.appointment_types DISABLE ROW LEVEL SECURITY;',
        'ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;',
        'ALTER TABLE public.available_slots DISABLE ROW LEVEL SECURITY;',
        'ALTER TABLE public.appointments DISABLE ROW LEVEL SECURITY;',
        'ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;',
        'ALTER TABLE public.audit_log DISABLE ROW LEVEL SECURITY;'
    ];
    
    for (const sql of sqlCommands) {
        try {
            console.log(`Executing: ${sql}`);
            const { data, error } = await supabase.rpc('exec_sql', { sql });
            
            if (error) {
                console.error(`❌ Failed: ${error.message}`);
            } else {
                console.log('✅ Success');
            }
        } catch (err) {
            console.error(`❌ Error: ${err.message}`);
        }
    }
}

async function testSimpleSelect() {
    console.log('\n🧪 Testing simple select...');
    
    try {
        // Try the most basic possible query
        const { data, error } = await supabase
            .from('appointment_types')
            .select('id')
            .limit(1);
        
        if (error) {
            console.error('❌ Select failed:', error.message);
            console.error('Code:', error.code);
            console.error('Details:', error.details);
            console.error('Hint:', error.hint);
        } else {
            console.log('✅ Select successful:', data);
        }
    } catch (err) {
        console.error('❌ Exception:', err.message);
    }
}

async function main() {
    await disableRLS();
    await testSimpleSelect();
}

main();