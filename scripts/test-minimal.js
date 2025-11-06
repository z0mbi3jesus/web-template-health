// Minimal test to see what we can access
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

async function testAllTables() {
    console.log('🔍 Testing access to all tables...');
    
    const tables = [
        'users',
        'appointment_types', 
        'available_slots',
        'appointments',
        'notifications',
        'audit_log'
    ];
    
    for (const tableName of tables) {
        try {
            console.log(`\n📋 Testing ${tableName}...`);
            
            const { data, error, count } = await supabase
                .from(tableName)
                .select('*', { count: 'exact' })
                .limit(1);
            
            if (error) {
                console.error(`❌ ${tableName}: ${error.message} (Code: ${error.code})`);
                
                // Try different approaches
                if (error.code === '42501') { // permission denied
                    console.log(`   🔒 Permission denied - table exists but not accessible`);
                } else if (error.code === '42P01') { // table doesn't exist
                    console.log(`   🚫 Table does not exist`);
                } else {
                    console.log(`   ❓ Unknown error: ${error.code}`);
                }
            } else {
                console.log(`✅ ${tableName}: Accessible (${count || 0} rows)`);
                if (data && data.length > 0) {
                    console.log(`   📄 Sample data:`, data[0]);
                }
            }
        } catch (err) {
            console.error(`❌ ${tableName}: Exception - ${err.message}`);
        }
    }
}

async function testConnection() {
    console.log('🔗 Testing basic Supabase connection...');
    console.log('URL:', process.env.SUPABASE_URL);
    console.log('Service Role Key (first 20 chars):', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + '...');
    
    try {
        // Test if Supabase client is working at all
        const { data, error } = await supabase.auth.getUser();
        
        if (error && error.message !== 'Invalid token') {
            console.error('❌ Auth test failed:', error.message);
        } else {
            console.log('✅ Supabase client is responding');
        }
    } catch (err) {
        console.error('❌ Connection failed:', err.message);
    }
}

async function main() {
    await testConnection();
    await testAllTables();
    
    console.log('\n📋 Summary:');
    console.log('If you see "permission denied" errors, the tables exist but RLS is blocking access.');
    console.log('If you see "table does not exist" errors, the tables were not created properly.');
    console.log('You may need to create the tables manually in the Supabase SQL Editor.');
}

main();