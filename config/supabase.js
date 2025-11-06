import { createClient } from '@supabase/supabase-js'

// These will be filled in when you create your Supabase project
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key'

// Client for frontend (limited permissions)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client for backend operations (full permissions)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Database schema and table definitions
export const TABLES = {
  USERS: 'users',
  APPOINTMENTS: 'appointments',
  AVAILABLE_SLOTS: 'available_slots',
  APPOINTMENT_TYPES: 'appointment_types',
  NOTIFICATIONS: 'notifications',
  AUDIT_LOG: 'audit_log'
}

// User roles
export const USER_ROLES = {
  CLIENT: 'client',
  STAFF: 'staff',
  ADMIN: 'admin'
}

// Appointment statuses
export const APPOINTMENT_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  NO_SHOW: 'no_show'
}

export default supabase