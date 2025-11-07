// Debug which .env file is being loaded
require('dotenv').config();

console.log('🔍 Environment Variable Debug');
console.log('============================');
console.log('Current working directory:', process.cwd());
console.log('');

console.log('Environment variables loaded:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL || 'NOT FOUND');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? `${process.env.SUPABASE_ANON_KEY.substring(0, 20)}...` : 'NOT FOUND');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? `${process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...` : 'NOT FOUND');
console.log('');

console.log('Old PostgreSQL variables (should be empty):');
console.log('DB_HOST:', process.env.DB_HOST || 'NOT FOUND');
console.log('DB_NAME:', process.env.DB_NAME || 'NOT FOUND');
console.log('DB_USER:', process.env.DB_USER || 'NOT FOUND');
console.log('');

// Check if .env file exists in current directory
const fs = require('fs');
const path = require('path');

const rootEnvPath = path.join(process.cwd(), '.env');
const backendEnvPath = path.join(process.cwd(), 'backend', '.env');

console.log('File system check:');
console.log(`Root .env exists: ${fs.existsSync(rootEnvPath)}`);
console.log(`Backend .env exists: ${fs.existsSync(backendEnvPath)}`);

if (fs.existsSync(rootEnvPath)) {
    const envContent = fs.readFileSync(rootEnvPath, 'utf8');
    console.log('Root .env contains SUPABASE_URL:', envContent.includes('SUPABASE_URL'));
    console.log('Root .env contains DB_HOST:', envContent.includes('DB_HOST'));
}