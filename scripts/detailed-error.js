// More detailed error analysis
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

async function detailedErrorAnalysis() {
    console.log('🔍 Detailed Error Analysis');
    console.log('==========================');
    
    try {
        const { data, error } = await supabase
            .from('appointment_types')
            .select('*')
            .limit(1);
        
        if (error) {
            console.log('❌ Full error object:');
            console.log(JSON.stringify(error, null, 2));
            console.log('');
            console.log('Error properties:');
            console.log('- Code:', error.code);
            console.log('- Message:', error.message);
            console.log('- Details:', error.details);
            console.log('- Hint:', error.hint);
            console.log('');
            
            // Check if this is a specific PostgreSQL error
            if (error.code === '42501') {
                console.log('🔍 Error 42501 Analysis:');
                console.log('This is a PostgreSQL "insufficient privilege" error.');
                console.log('Even though RLS is disabled, there might be table-level permissions missing.');
                console.log('');
                console.log('💡 Possible causes:');
                console.log('1. Service role doesn\'t have SELECT permissions on the table');
                console.log('2. Table was created by a different user/role');
                console.log('3. Supabase API configuration issue');
                console.log('4. Project-level permissions problem');
            }
        } else {
            console.log('✅ Success! Data retrieved:', data);
        }
        
    } catch (err) {
        console.error('❌ JavaScript exception:', err.message);
        console.error('Stack trace:', err.stack);
    }
}

detailedErrorAnalysis();