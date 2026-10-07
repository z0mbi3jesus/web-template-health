-- =====================================================
-- Fix RLS infinite recursion in users table policies
-- =====================================================
-- The policies in rls-policies.sql query public.users to determine the
-- current user's role, which triggers the same SELECT policy recursively.
-- This fix replaces those subqueries with a SECURITY DEFINER function that
-- reads the role without re-evaluating RLS policies.

-- 1. Create (or replace) a helper function to read the current user's role.
--    SECURITY DEFINER lets it bypass RLS on public.users.
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM public.users
    WHERE id = auth.uid();

    RETURN user_role;
END;
$$;

-- Restrict execution to authenticated users only.
REVOKE EXECUTE ON FUNCTION public.get_current_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO service_role;

-- 2. Drop the old recursive policies (ignore if they don't exist).
DROP POLICY IF EXISTS "user_read_own_profile" ON public.users;
DROP POLICY IF EXISTS "admin_staff_read_all_profiles" ON public.users;
DROP POLICY IF EXISTS "user_update_own_profile" ON public.users;
DROP POLICY IF EXISTS "admin_update_any_profile" ON public.users;

DROP POLICY IF EXISTS "client_read_own_appointments" ON public.appointments;
DROP POLICY IF EXISTS "staff_read_assigned_appointments" ON public.appointments;
DROP POLICY IF EXISTS "client_create_appointments" ON public.appointments;
DROP POLICY IF EXISTS "client_update_own_pending_appointments" ON public.appointments;
DROP POLICY IF EXISTS "staff_admin_update_appointments" ON public.appointments;

DROP POLICY IF EXISTS "authenticated_read_available_slots" ON public.available_slots;
DROP POLICY IF EXISTS "admin_staff_manage_slots" ON public.available_slots;
DROP POLICY IF EXISTS "admin_staff_update_slots" ON public.available_slots;

DROP POLICY IF EXISTS "authenticated_read_appointment_types" ON public.appointment_types;
DROP POLICY IF EXISTS "admin_manage_appointment_types" ON public.appointment_types;
DROP POLICY IF EXISTS "admin_update_appointment_types" ON public.appointment_types;

-- 3. Recreate policies using the helper function.

-- Users
CREATE POLICY "user_read_own_profile"
ON public.users FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "admin_staff_read_all_profiles"
ON public.users FOR SELECT
USING (public.get_current_user_role() IN ('admin', 'staff'));

CREATE POLICY "user_update_own_profile"
ON public.users FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "admin_update_any_profile"
ON public.users FOR UPDATE
USING (public.get_current_user_role() = 'admin')
WITH CHECK (public.get_current_user_role() = 'admin');

-- Appointments
CREATE POLICY "client_read_own_appointments"
ON public.appointments FOR SELECT
USING (
  auth.uid() = client_id
  AND public.get_current_user_role() = 'client'
);

CREATE POLICY "staff_read_assigned_appointments"
ON public.appointments FOR SELECT
USING (
  auth.uid() = staff_id
  OR public.get_current_user_role() IN ('admin', 'staff')
);

CREATE POLICY "client_create_appointments"
ON public.appointments FOR INSERT
WITH CHECK (
  auth.uid() = client_id
  AND public.get_current_user_role() = 'client'
);

CREATE POLICY "client_update_own_pending_appointments"
ON public.appointments FOR UPDATE
USING (
  auth.uid() = client_id
  AND status = 'pending'
)
WITH CHECK (
  auth.uid() = client_id
  AND status = 'pending'
);

CREATE POLICY "staff_admin_update_appointments"
ON public.appointments FOR UPDATE
USING (public.get_current_user_role() IN ('admin', 'staff'))
WITH CHECK (public.get_current_user_role() IN ('admin', 'staff'));

-- Available slots
CREATE POLICY "authenticated_read_available_slots"
ON public.available_slots FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "admin_staff_manage_slots"
ON public.available_slots FOR INSERT
WITH CHECK (public.get_current_user_role() IN ('admin', 'staff'));

CREATE POLICY "admin_staff_update_slots"
ON public.available_slots FOR UPDATE
USING (public.get_current_user_role() IN ('admin', 'staff'))
WITH CHECK (public.get_current_user_role() IN ('admin', 'staff'));

-- Appointment types
CREATE POLICY "authenticated_read_appointment_types"
ON public.appointment_types FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "admin_manage_appointment_types"
ON public.appointment_types FOR INSERT
WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "admin_update_appointment_types"
ON public.appointment_types FOR UPDATE
USING (public.get_current_user_role() = 'admin')
WITH CHECK (public.get_current_user_role() = 'admin');

SELECT 'RLS recursion fix applied successfully' AS status;
