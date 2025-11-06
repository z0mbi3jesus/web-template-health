-- =====================================================
-- Fix RLS Policy Infinite Recursion
-- =====================================================

-- Fix the recursive policy issue by using a different approach
-- The problem is that the policies reference the same table they're protecting

-- Drop problematic policies
DROP POLICY IF EXISTS "Staff and admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Staff and admins can manage appointment types" ON public.appointment_types;
DROP POLICY IF EXISTS "Staff can manage their own slots" ON public.available_slots;
DROP POLICY IF EXISTS "Staff can view their assigned appointments" ON public.appointments;
DROP POLICY IF EXISTS "Staff and admins can update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_log;

-- Create non-recursive policies using auth.jwt() instead of querying the users table

-- Users policies (fixed)
CREATE POLICY "Staff and admins can view all users" ON public.users
    FOR SELECT USING (
        -- Use auth metadata instead of querying users table
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('staff', 'admin') OR
        -- Allow service role full access
        auth.role() = 'service_role'
    );

-- Appointment types policies (fixed)
CREATE POLICY "Staff and admins can manage appointment types" ON public.appointment_types
    FOR ALL USING (
        -- Use auth metadata or service role
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('staff', 'admin') OR
        auth.role() = 'service_role'
    );

-- Available slots policies (fixed)
CREATE POLICY "Staff can manage their own slots" ON public.available_slots
    FOR ALL USING (
        staff_id = auth.uid() OR 
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR
        auth.role() = 'service_role'
    );

-- Appointments policies (fixed)
CREATE POLICY "Staff can view their assigned appointments" ON public.appointments
    FOR SELECT USING (
        staff_id = auth.uid() OR 
        client_id = auth.uid() OR
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR
        auth.role() = 'service_role'
    );

CREATE POLICY "Staff and admins can update appointments" ON public.appointments
    FOR UPDATE USING (
        staff_id = auth.uid() OR 
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('staff', 'admin') OR
        auth.role() = 'service_role'
    );

-- Audit log policies (fixed)
CREATE POLICY "Admins can view audit logs" ON public.audit_log
    FOR SELECT USING (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR
        auth.role() = 'service_role'
    );

-- Success message
SELECT 'RLS policies fixed - no more infinite recursion!' AS status;