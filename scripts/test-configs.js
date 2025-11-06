// Test with different Supabase configurations
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testDifferentConfigs() {
    console.log('🔍 Testing different Supabase configurations...\n');
    
    // Test 1: Service Role with bypass RLS
    console.log('1️⃣ Testing Service Role with RLS bypass...');
    const supabaseService = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            },
            db: {
                schema: 'public'
            }
        }
    );
    
    try {
        const { data, error } = await supabaseService
            .from('appointment_types')
            .select('*')
            .limit(1);
        
        if (error) {
            console.error(`   ❌ Service role failed: ${error.message}`);
        } else {
            console.log(`   ✅ Service role works! Data:`, data);
        }
    } catch (err) {
        console.error(`   ❌ Service role exception: ${err.message}`);
    }
    
    // Test 2: Anon key
    console.log('\n2️⃣ Testing Anonymous key...');
    const supabaseAnon = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    );
    
    try {
        const { data, error } = await supabaseAnon
            .from('appointment_types')
            .select('*')
            .limit(1);
        
        if (error) {
            console.error(`   ❌ Anon key failed: ${error.message}`);
        } else {
            console.log(`   ✅ Anon key works! Data:`, data);
        }
    } catch (err) {
        console.error(`   ❌ Anon key exception: ${err.message}`);
    }
    
    // Test 3: Check environment variables
    console.log('\n3️⃣ Environment check...');
    console.log(`   URL: ${process.env.SUPABASE_URL}`);
    console.log(`   Service Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 30)}...`);
    console.log(`   Anon Key: ${process.env.SUPABASE_ANON_KEY?.substring(0, 30)}...`);
    
    // Test 4: Try raw fetch to Supabase REST API
    console.log('\n4️⃣ Testing raw REST API...');
    try {
        const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/appointment_types?select=*&limit=1`, {
            headers: {
                'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log(`   ✅ Raw API works! Data:`, data);
        } else {
            const error = await response.text();
            console.error(`   ❌ Raw API failed (${response.status}): ${error}`);
        }
    } catch (err) {
        console.error(`   ❌ Raw API exception: ${err.message}`);
    }
}

testDifferentConfigs();