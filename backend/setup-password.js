const readline = require('readline');
const { Pool } = require('pg');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🔐 Let\'s find your PostgreSQL password...');
console.log('Common passwords to try: postgres, admin, password, or your custom password');

rl.question('Enter PostgreSQL password for user "postgres": ', async (password) => {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'health_calendar',
    user: 'postgres',
    password: password
  });

  try {
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Connection successful!');
    console.log(`⏰ Database time: ${result.rows[0].current_time}`);
    
    // Update the .env file
    const fs = require('fs');
    const envPath = '.env';
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Replace the password line
    envContent = envContent.replace(/DB_PASSWORD=.*/, `DB_PASSWORD=${password}`);
    fs.writeFileSync(envPath, envContent);
    
    console.log('✅ Updated .env file with correct password');
    console.log('🚀 Now run: npm run db:migrate');
    
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
    console.log('Please try again with the correct password');
  }
  
  await pool.end();
  rl.close();
});