const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🔐 PostgreSQL Setup');
console.log('We need to update your .env file with the correct PostgreSQL password.');

rl.question('Enter your PostgreSQL password: ', (password) => {
  
  // Read current .env file
  const envPath = path.join(__dirname, '.env');
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Update the password line
  envContent = envContent.replace(/DB_PASSWORD=.*/, `DB_PASSWORD=${password}`);
  
  // Write back to .env file
  fs.writeFileSync(envPath, envContent);
  
  console.log('✅ Password updated in .env file');
  console.log('🚀 Now running migration...');
  
  rl.close();
  
  // Run migration
  const { runMigrations } = require('./database/migrate');
  runMigrations();
});