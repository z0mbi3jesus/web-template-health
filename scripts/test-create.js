// Test if we can create a simple table
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

async function testCreateTable() {
    console.log('🧪 Testing table creation...');
    
    try {
        // Try to create a simple test table
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS public.test_table (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `;
        
        const { data, error } = await supabase.rpc('exec', { sql: createTableSQL });
        
        if (error) {
            console.error('❌ Create table failed:', error.message);
        } else {
            console.log('✅ Table created successfully');
            
            // Try to insert data
            const { data: insertData, error: insertError } = await supabase
                .from('test_table')
                .insert({ name: 'Test Entry' })
                .select();
            
            if (insertError) {
                console.error('❌ Insert failed:', insertError.message);
            } else {
                console.log('✅ Insert successful:', insertData);
                
                // Try to select data
                const { data: selectData, error: selectError } = await supabase
                    .from('test_table')
                    .select('*');
                
                if (selectError) {
                    console.error('❌ Select failed:', selectError.message);
                } else {
                    console.log('✅ Select successful:', selectData);
                }
            }
        }
        
    } catch (err) {
        console.error('❌ Exception:', err.message);
    }
}

async function main() {
    await testCreateTable();
}

main();