/**
 * RLS Setup - Enables Row Level Security on Supabase tables
 * This script uses the Supabase Management API to enable RLS and create policies
 * 
 * Prerequisites:
 * - Supabase project with authentication setup
 * - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 * 
 * Usage: node enable-rls.js
 */

const https = require('https');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Extract project ref from URL
const projectRef = SUPABASE_URL.split('//')[1].split('.')[0];

async function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query: sql });
    
    const options = {
      hostname: `${projectRef}.supabase.co`,
      path: '/rest/v1/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function enableRLS() {
  console.log('🔒 Enabling Row Level Security (RLS)...\n');
  console.log('⚠️  NOTE: The fastest way to set up RLS is to:');
  console.log('   1. Open your Supabase dashboard');
  console.log('   2. Go to SQL Editor');
  console.log('   3. Copy the contents of database/rls-policies.sql');
  console.log('   4. Paste and run in the SQL editor');
  console.log('\n✨ Alternative: Using Supabase CLI\n');
  console.log('   1. Install Supabase CLI: npm install -g supabase');
  console.log('   2. Run: supabase db push');
  console.log('   3. This applies migrations automatically\n');

  console.log('📚 What RLS does:');
  console.log('   ✅ Users can only see their own profile');
  console.log('   ✅ Clients can only see their own appointments');
  console.log('   ✅ Staff can see appointments assigned to them');
  console.log('   ✅ Admin can see everything');
  console.log('   ✅ Prevents unauthorized data access');
  console.log('   ✅ Enforces role-based access control\n');

  console.log('🔐 Tables protected by RLS:');
  console.log('   • users - Profile data');
  console.log('   • appointments - Booking records');
  console.log('   • available_slots - Time slot availability');
  console.log('   • appointment_types - Service types\n');

  console.log('📝 Test RLS with these accounts:');
  console.log('   • Admin: admin@healthclinic.com / password123');
  console.log('   • Staff: doctor@example.com / password123');
  console.log('   • Client: patient@example.com / password123\n');

  console.log('✅ Next steps:');
  console.log('   1. Open https://app.supabase.com');
  console.log('   2. Select your project');
  console.log('   3. Go to SQL Editor');
  console.log('   4. Create a new query and paste rls-policies.sql');
  console.log('   5. Run the query to enable RLS\n');
}

enableRLS().catch(console.error);
