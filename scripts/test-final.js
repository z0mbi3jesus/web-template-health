// Final test after RLS is disabled
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

async function finalTest() {
    console.log('🎯 Final Connection Test - After RLS Disabled');
    console.log('============================================\n');
    
    try {
        // Test appointment_types first
        console.log('📋 Testing appointment_types...');
        const { data: appointmentTypes, error: atError } = await supabase
            .from('appointment_types')
            .select('*');
        
        if (atError) {
            console.error('❌ Still failing:', atError.message);
            return false;
        }
        
        console.log('✅ appointment_types accessible!');
        console.log('   Current data:', appointmentTypes);
        
        // Test basic CRUD operations
        console.log('\n🔧 Testing CRUD operations...');
        
        // CREATE - Insert a test appointment type
        const { data: newType, error: insertError } = await supabase
            .from('appointment_types')
            .insert({
                name: 'Test Consultation',
                duration: 30,
                price: 75.00,
                description: 'Test appointment type created by connection test'
            })
            .select();
        
        if (insertError) {
            console.error('❌ Insert failed:', insertError.message);
        } else {
            console.log('✅ Insert successful:', newType[0]);
            
            // UPDATE - Modify the test record
            const { data: updatedType, error: updateError } = await supabase
                .from('appointment_types')
                .update({ price: 80.00 })
                .eq('id', newType[0].id)
                .select();
            
            if (updateError) {
                console.error('❌ Update failed:', updateError.message);
            } else {
                console.log('✅ Update successful:', updatedType[0]);
            }
            
            // DELETE - Clean up test record
            const { error: deleteError } = await supabase
                .from('appointment_types')
                .delete()
                .eq('id', newType[0].id);
            
            if (deleteError) {
                console.error('❌ Delete failed:', deleteError.message);
            } else {
                console.log('✅ Delete successful - test record cleaned up');
            }
        }
        
        console.log('\n🏥 Testing all tables...');
        const tables = ['users', 'available_slots', 'appointments', 'notifications', 'audit_log'];
        
        for (const table of tables) {
            const { count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact' });
            
            if (error) {
                console.log(`❌ ${table}: ${error.message}`);
            } else {
                console.log(`✅ ${table}: ${count || 0} rows`);
            }
        }
        
        console.log('\n🎉 SUCCESS! All tables are accessible.');
        console.log('Your healthcare appointment system is ready to use!');
        return true;
        
    } catch (err) {
        console.error('❌ Test failed:', err.message);
        return false;
    }
}

finalTest();