// Check table existence and permissions
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

async function checkTables() {
    console.log('🔍 Checking table information...');
    
    try {
        // Check what tables exist in information_schema
        const { data, error } = await supabase
            .from('pg_tables')
            .select('schemaname, tablename, tableowner')
            .eq('schemaname', 'public');
        
        if (error) {
            console.error('❌ Cannot access pg_tables:', error.message);
            
            // Try alternative approach - list schemas
            const { data: schemas, error: schemaError } = await supabase
                .from('information_schema.schemata')
                .select('schema_name')
                .limit(10);
            
            if (schemaError) {
                console.error('❌ Cannot access schemas either:', schemaError.message);
            } else {
                console.log('✅ Available schemas:', schemas);
            }
        } else {
            console.log('✅ Tables in public schema:');
            data.forEach(table => {
                console.log(`  - ${table.tablename} (owner: ${table.tableowner})`);
            });
            
            // Check if our tables exist
            const ourTables = ['appointment_types', 'users', 'available_slots', 'appointments', 'notifications', 'audit_log'];
            const existingTables = data.map(t => t.tablename);
            
            console.log('\n📊 Our table status:');
            ourTables.forEach(table => {
                const exists = existingTables.includes(table);
                console.log(`  ${exists ? '✅' : '❌'} ${table}`);
            });
        }
        
    } catch (err) {
        console.error('❌ Exception:', err.message);
    }
}

async function testRawQuery() {
    console.log('\n🧪 Testing raw SQL query...');
    
    try {
        // Try to access PostgreSQL system tables
        const { data, error } = await supabase.rpc('get_table_info');
        
        if (error) {
            console.error('❌ RPC failed:', error.message);
        } else {
            console.log('✅ RPC successful:', data);
        }
    } catch (err) {
        console.error('❌ Exception:', err.message);
    }
}

async function main() {
    await checkTables();
    await testRawQuery();
}

main();