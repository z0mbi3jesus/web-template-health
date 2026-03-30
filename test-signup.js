/**
 * Test script for user signup and registration flow
 * Usage: node test-signup.js
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test data
const testEmail = `testuser${Date.now()}@example.com`;
const testPassword = 'Test1234!Password';
const testName = 'Test User';
const testPhone = '+1234567890';

async function runTests() {
    console.log('🧪 Starting signup flow tests...\n');
    
    try {
        // Test 1: Create user with Supabase Auth
        console.log('📝 Test 1: Creating Supabase Auth user...');
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: testEmail,
            password: testPassword,
            email_confirm: true, // Auto-confirm email for testing
            user_metadata: {
                firstName: 'Test',
                lastName: 'User',
                phone: testPhone
            }
        });

        if (authError) {
            console.error('❌ Auth creation failed:', authError);
            return;
        }

        const userId = authData.user.id;
        console.log(`✅ Auth user created: ${userId}\n`);

        // Test 2: Create user profile in database
        console.log('📊 Test 2: Creating user profile in database...');
        const { data: profileData, error: profileError } = await supabaseAdmin
            .from('users')
            .insert([{
                id: userId,
                email: testEmail,
                name: testName,
                phone: testPhone,
                role: 'client',
                is_active: true
            }])
            .select()
            .single();

        if (profileError) {
            console.error('❌ Profile creation failed:', profileError);
            return;
        }

        console.log('✅ User profile created:', profileData, '\n');

        // Test 3: Try to sign in with the new user
        console.log('🔐 Test 3: Testing sign in with new credentials...');
        const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
            email: testEmail,
            password: testPassword
        });

        if (signInError) {
            console.error('❌ Sign in failed:', signInError);
            return;
        }

        console.log('✅ Sign in successful');
        console.log('   User ID:', signInData.user.id);
        console.log('   Email:', signInData.user.email);
        console.log('   Access Token:', signInData.session.access_token.substring(0, 20) + '...\n');

        // Test 4: Fetch user profile as the signed-in user
        console.log('📋 Test 4: Fetching user profile as authenticated user...');
        
        // Create a new client with the user's token
        const userClient = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY,
            {
                global: {
                    headers: {
                        Authorization: `Bearer ${signInData.session.access_token}`
                    }
                }
            }
        );

        const { data: userData, error: userError } = await userClient
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (userError) {
            console.error('❌ Profile fetch failed:', userError);
            return;
        }

        console.log('✅ User profile fetched:', userData, '\n');

        // Test 5: Verify user role
        console.log('👥 Test 5: Verifying user role...');
        if (userData.role === 'client') {
            console.log('✅ User role is correct (client)\n');
        } else {
            console.error('❌ User role is incorrect. Expected "client", got:', userData.role, '\n');
            return;
        }

        // Test 6: List all users to verify registration
        console.log('📊 Test 6: Listing all users in database...');
        const { data: allUsers, error: listError } = await supabaseAdmin
            .from('users')
            .select('id, email, name, role, is_active')
            .order('created_at', { ascending: false })
            .limit(10);

        if (listError) {
            console.error('❌ User list fetch failed:', listError);
            return;
        }

        console.log('✅ Users in database (latest 10):');
        allUsers.forEach((user, index) => {
            console.log(`   ${index + 1}. ${user.email} - ${user.role} (${user.is_active ? 'active' : 'inactive'})`);
        });

        console.log('\n✅ All tests passed! User registration flow is working correctly.\n');

    } catch (error) {
        console.error('❌ Test error:', error);
    }
}

// Run tests
runTests().catch(console.error);
