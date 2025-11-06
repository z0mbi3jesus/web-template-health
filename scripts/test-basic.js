// Simple Supabase connection test - no RLS, just basic functionality
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

console.log('🏥 Testing Supabase Connection - Health Portal');

// Basic environment check
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase environment variables!');
    console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

// Create client with service role
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

async function testBasicConnection() {
    try {
        console.log('\n🔧 Testing raw connection...');
        
        // Test 1: Simple query that should always work
        const { data: testData, error: testError } = await supabase
            .from('appointment_types')
            .select('*')
            .limit(1);
        
        if (testError) {
            console.error('❌ Basic query failed:', testError.message);
            console.error('Details:', testError);
            return false;
        }
        
        console.log('✅ Basic connection successful!');
        console.log('Data returned:', testData);
        
        // Test 2: Count all tables
        console.log('\n📊 Checking all tables...');
        
        const tables = ['users', 'appointment_types', 'available_slots', 'appointments', 'notifications', 'audit_log'];
        
        for (const table of tables) {
            try {
                const { count, error } = await supabase
                    .from(table)
                    .select('*', { count: 'exact' });
                
                if (error) {
                    console.error(`❌ ${table}: ${error.message}`);
                } else {
                    console.log(`✅ ${table}: ${count || 0} rows`);
                }
            } catch (err) {
                console.error(`❌ ${table}: ${err.message}`);
            }
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Connection test failed:', error.message);
        return false;
    }
}

async function runTests() {
    console.log('Starting connection test...\n');
    
    const success = await testBasicConnection();
    
    if (success) {
        console.log('\n🎉 All tests passed! Supabase is ready.');
    } else {
        console.log('\n💥 Tests failed. Check your configuration.');
        process.exit(1);
    }
}

runTests();