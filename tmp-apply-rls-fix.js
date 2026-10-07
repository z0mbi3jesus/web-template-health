require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, 'database', 'rls-recursion-fix.sql'), 'utf8');
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log('RLS fix applied successfully');
  } catch (err) {
    console.error('Failed to apply RLS fix:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
  }
  await pool.end();
}

main();
