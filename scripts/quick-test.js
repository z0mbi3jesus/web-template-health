// Quick test to match what user might have run
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

async function quickTest() {
    console.log('🔍 Quick permission test...');
    
    try {
        const { data, error } = await supabase
            .from('appointment_types')
            .select('name, duration_minutes')
            .limit(3);
        
        if (error) {
            console.error('❌ Failed:', error.message);
            console.log('\n💡 Please run this SQL in your Supabase SQL Editor:');
            console.log('ALTER TABLE public.appointment_types DISABLE ROW LEVEL SECURITY;');
        } else {
            console.log('✅ SUCCESS! Data retrieved:', data);
            console.log('\n🎉 Supabase is working correctly!');
        }
    } catch (err) {
        console.error('❌ Exception:', err.message);
    }
}

quickTest();