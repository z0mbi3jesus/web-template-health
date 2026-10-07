const { createClient } = require('@supabase/supabase-js');

const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingEnvVars.length > 0) {
  throw new Error(`Missing required Supabase environment variables: ${missingEnvVars.join(', ')}`);
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Client for frontend (limited permissions)
const authOptions = { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } };
const createAuthClient = () => createClient(supabaseUrl, supabaseAnonKey, authOptions);
const supabase = createAuthClient();

// Admin client for backend operations (full permissions)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Database schema and table definitions
const TABLES = {
  USERS: 'users',
  APPOINTMENTS: 'appointments',
  AVAILABLE_SLOTS: 'available_slots',
  APPOINTMENT_TYPES: 'appointment_types',
  NOTIFICATIONS: 'notifications',
  AUDIT_LOG: 'audit_log'
};

// User roles
const USER_ROLES = {
  CLIENT: 'client',
  STAFF: 'staff',
  ADMIN: 'admin'
};

// Appointment statuses
const APPOINTMENT_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  NO_SHOW: 'no_show'
};

module.exports = {
  supabase,
  createAuthClient,
  supabaseAdmin,
  TABLES,
  USER_ROLES,
  APPOINTMENT_STATUS
};