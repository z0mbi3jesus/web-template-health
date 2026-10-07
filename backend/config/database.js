const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Use Supabase SDK for database operations (bypasses password issues)
if (supabaseUrl && supabaseServiceKey) {
  console.log('Using Supabase SDK for database connection');
  console.log(`Supabase URL: ${supabaseUrl}`);
} else {
  console.error('Missing Supabase credentials');
  console.error('   SUPABASE_URL:', supabaseUrl ? '' : '');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '' : '');
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false, autoRefreshToken: false } });

// Keep pg pool for legacy/transaction support if needed
const connectionString = process.env.DATABASE_URL;
const pool = connectionString ? new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
}) : null;

if (pool) {
  pool.on('connect', () => {
    console.log('PostgreSQL pool ready (fallback)');
  });
  
  pool.on('error', (err) => {
    console.error('PostgreSQL pool error:', err.message);
  });
}

// Helper function to execute queries using Supabase
const query = async (text, params) => {
  const start = Date.now();
  try {
    // For now, fall back to pg pool if available
    if (pool) {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Executed query', { text: text.substring(0, 50), duration, rows: res.rowCount });
      return res;
    }
    throw new Error('No database connection available');
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// Helper function to get a client for transactions
const getClient = async () => {
  if (!pool) {
    throw new Error('PostgreSQL pool not available');
  }
  const client = await pool.connect();
  const query = client.query;
  const release = client.release;
  
  // Set a timeout of 5 seconds, after which we will log this client's last query
  const timeout = setTimeout(() => {
    console.error('⏰ A client has been checked out for more than 5 seconds!');
    console.error(`The last executed query on this client was: ${client.lastQuery}`);
  }, 5000);
  
  // Monkey patch the query method to keep track of the last query executed
  client.query = (...args) => {
    client.lastQuery = args;
    return query.apply(client, args);
  };
  
  client.release = () => {
    clearTimeout(timeout);
    // Call the actual 'release' method
    release.call(client);
  };
  
  return client;
};

// Graceful shutdown
const gracefulShutdown = () => {
  if (pool) {
    pool.end(() => {
      console.log('Database connection pool has ended');
    });
  }
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

module.exports = {
  supabase,
  pool,
  query,
  getClient,
  gracefulShutdown
};