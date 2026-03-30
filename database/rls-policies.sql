-- Row Level Security (RLS) Setup for Healthcare Calendar
-- This script enables RLS on tables and creates policies for data protection
-- To execute: Copy and paste into Supabase SQL Editor

-- ============================================
-- 1. USERS TABLE - RLS POLICIES
-- ============================================

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "user_read_own_profile" 
ON public.users 
FOR SELECT 
USING (auth.uid() = id);

-- Policy: Admin and staff can read all user profiles (for appointment management)
CREATE POLICY "admin_staff_read_all_profiles" 
ON public.users 
FOR SELECT 
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'staff')
);

-- Policy: Users can update their own profile
CREATE POLICY "user_update_own_profile" 
ON public.users 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy: Admin can update any profile
CREATE POLICY "admin_update_any_profile" 
ON public.users 
FOR UPDATE 
USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin')
WITH CHECK ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

-- ============================================
-- 2. APPOINTMENTS TABLE - RLS POLICIES
-- ============================================

-- Enable RLS on appointments table
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Policy: Clients can read their own appointments
CREATE POLICY "client_read_own_appointments" 
ON public.appointments 
FOR SELECT 
USING (
  auth.uid() = client_id
  AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'client'
);

-- Policy: Staff can read appointments assigned to them or all if admin
CREATE POLICY "staff_read_assigned_appointments" 
ON public.appointments 
FOR SELECT 
USING (
  auth.uid() = staff_id
  OR (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'staff')
);

-- Policy: Clients can create appointments (booking)
CREATE POLICY "client_create_appointments" 
ON public.appointments 
FOR INSERT 
WITH CHECK (
  auth.uid() = client_id
  AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'client'
);

-- Policy: Clients can update their own pending appointments
CREATE POLICY "client_update_own_pending_appointments" 
ON public.appointments 
FOR UPDATE 
USING (
  auth.uid() = client_id
  AND status = 'pending'
)
WITH CHECK (
  auth.uid() = client_id
  AND status = 'pending'
);

-- Policy: Staff/Admin can update any appointment
CREATE POLICY "staff_admin_update_appointments" 
ON public.appointments 
FOR UPDATE 
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'staff')
)
WITH CHECK (
  (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'staff')
);

-- ============================================
-- 3. AVAILABLE_SLOTS TABLE - RLS POLICIES
-- ============================================

-- Enable RLS on available_slots table
ALTER TABLE public.available_slots ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read available slots (for booking)
CREATE POLICY "authenticated_read_available_slots" 
ON public.available_slots 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Policy: Only admin/staff can create/update slots
CREATE POLICY "admin_staff_manage_slots" 
ON public.available_slots 
FOR INSERT 
WITH CHECK (
  (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'staff')
);

CREATE POLICY "admin_staff_update_slots" 
ON public.available_slots 
FOR UPDATE 
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'staff')
)
WITH CHECK (
  (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'staff')
);

-- ============================================
-- 4. APPOINTMENT_TYPES TABLE - RLS POLICIES
-- ============================================

-- Enable RLS on appointment_types table
ALTER TABLE public.appointment_types ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read appointment types
CREATE POLICY "authenticated_read_appointment_types" 
ON public.appointment_types 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Policy: Only admin can manage appointment types
CREATE POLICY "admin_manage_appointment_types" 
ON public.appointment_types 
FOR INSERT 
WITH CHECK (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "admin_update_appointment_types" 
ON public.appointment_types 
FOR UPDATE 
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);

-- ============================================
-- 5. VERIFY RLS IS ENABLED
-- ============================================

-- Check that RLS is enabled on all tables
-- SELECT tablename, rowlevelssecurity FROM pg_tables 
-- WHERE schemaname = 'public' AND tablename IN ('users', 'appointments', 'available_slots', 'appointment_types');

-- ============================================
-- 6. GRANT PERMISSIONS (if needed)
-- ============================================

-- Grant necessary permissions to authenticated users
GRANT SELECT ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.appointments TO authenticated;
GRANT SELECT ON public.available_slots TO authenticated;
GRANT SELECT ON public.appointment_types TO authenticated;

-- Grant admin permissions for management tables

-- ============================================
-- IMPORTANT NOTES
-- ============================================
-- 1. These policies assume the 'role' column in users table exists
-- 2. RLS policies are evaluated in order - first matching policy applies
-- 3. UPDATE policies have both USING and WITH CHECK clauses for security
-- 4. ANON role users cannot access data (no policies for anon)
-- 5. To test policies, switch between different user roles in Supabase
-- ============================================
