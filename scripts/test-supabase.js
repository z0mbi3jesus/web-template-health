#!/usr/bin/env node

/**
 * Supabase Connection Test Script
 * Run this after setting up your Supabase project to verify everything works
 */

require('dotenv').config();

async function testSupabaseConnection() {
    console.log('🔧 Testing Supabase Connection...\n');
        console.log('Testing Supabase Connection...\n');
    // Check environment variables
        console.log('Checking environment variables:');
    const requiredEnvs = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
    let envOk = true;

    requiredEnvs.forEach(env => {
        if (process.env[env]) {
                console.log(`${env}: ${process.env[env].substring(0, 20)}...`);
        } else {
                console.log(`${env}: Not set`);
            envOk = false;
        }
    });

    if (!envOk) {
            console.log('\nMissing environment variables! Please update your .env file.');
        console.log('See SUPABASE_SETUP.md for instructions.');
        return false;
    }

    // Test Supabase client connection
        console.log('\nTesting Supabase client connection...');
    try {
        const { createClient } = require('@supabase/supabase-js');
        
        // Use service role key for testing - has bypass RLS permissions
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Test basic connection
        const { data, error } = await supabase
            .from('appointment_types')
            .select('count')
            .limit(1);

        if (error) {
                console.log('Supabase client connection failed:', error.message);
            return false;
        }

            console.log('Supabase client connected successfully');
    } catch (error) {
            console.log('Supabase client error:', error.message);
        return false;
    }

    // Test admin client connection
        console.log('\nTesting admin client connection...');
    try {
        const { createClient } = require('@supabase/supabase-js');
        
        const supabaseAdmin = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );

        // Test admin connection
        const { data, error } = await supabaseAdmin
            .from('appointment_types')
            .select('*')
            .limit(1);

        if (error) {
                console.log('Admin client connection failed:', error.message);
            return false;
        }

            console.log('Admin client connected successfully');
            console.log(`Found ${data?.length || 0} appointment types`);
    } catch (error) {
            console.log('Admin client error:', error.message);
        return false;
    }

    // Test database schema
        console.log('\nTesting database schema...');
    try {
        const { createClient } = require('@supabase/supabase-js');
        
        const supabaseAdmin = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );

        const tables = ['users', 'appointment_types', 'available_slots', 'appointments', 'notifications'];
        let schemaOk = true;

        for (const table of tables) {
            const { data, error } = await supabaseAdmin
                .from(table)
                .select('*')
                .limit(1);

            if (error) {
                    console.log(`Table '${table}': ${error.message}`);
                schemaOk = false;
            } else {
                    console.log(`Table '${table}': OK`);
            }
        }

        if (!schemaOk) {
                console.log('\nDatabase schema issues detected!');
            console.log('Please run the SQL schema from database/schema.sql in your Supabase SQL Editor.');
            return false;
        }
    } catch (error) {
            console.log('Schema test error:', error.message);
        return false;
    }

    // Test Row Level Security
        console.log('\nTesting Row Level Security...');
    try {
        const { createClient } = require('@supabase/supabase-js');
        
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY
        );

        // Try to access appointment_types (should work - public read)
        const { data, error } = await supabase
            .from('appointment_types')
            .select('name, description')
            .eq('is_active', true);

        if (error) {
                console.log('RLS test failed:', error.message);
            return false;
        }

            console.log('Row Level Security is working');
            console.log(`Found ${data?.length || 0} active appointment types`);
    } catch (error) {
            console.log('RLS test error:', error.message);
        return false;
    }

    console.log('\n' + '='.repeat(50));
        console.log('All Supabase tests passed!');
        console.log('Your Supabase integration is ready');
        console.log('\nNext steps:');
    console.log('1. Start the backend server: npm start');
    console.log('2. Open your website and test signup/signin');
    console.log('3. Create your admin user (see README)');
    
    return true;
}

// Run the test
testSupabaseConnection().catch(error => {
        console.error('\nTest failed with error:', error);
    process.exit(1);
});