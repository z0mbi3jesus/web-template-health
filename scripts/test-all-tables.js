// Test if this is specific to appointment_types or all tables
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

async function testAllTablesQuick() {
    console.log('🔍 Quick test of all tables...\n');
    
    const tables = ['users', 'appointment_types', 'available_slots', 'appointments', 'notifications', 'audit_log'];
    
    for (const table of tables) {
        try {
            const { data, error } = await supabase
                .from(table)
                .select('id')
                .limit(1);
            
            if (error) {
                console.log(`❌ ${table}: ${error.message}`);
            } else {
                console.log(`✅ ${table}: Accessible!`);
            }
        } catch (err) {
            console.log(`❌ ${table}: Exception - ${err.message}`);
        }
    }
    
    console.log('\n💡 If ALL tables fail, it\'s a project-level API issue.');
    console.log('💡 If SOME tables work, it\'s a table-specific permission issue.');
}

testAllTablesQuick();