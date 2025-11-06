-- =====================================================
-- Complete RLS Bypass for Testing
-- =====================================================

-- Disable RLS on all tables temporarily for debugging
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.available_slots DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log DISABLE ROW LEVEL SECURITY;

-- Test basic queries
SELECT 'Testing all tables...' AS test_status;

-- Test appointment_types
SELECT 'appointment_types' AS table_name, COUNT(*) AS count FROM public.appointment_types;

-- Test users
SELECT 'users' AS table_name, COUNT(*) AS count FROM public.users;

-- Test available_slots  
SELECT 'available_slots' AS table_name, COUNT(*) AS count FROM public.available_slots;

-- Test appointments
SELECT 'appointments' AS table_name, COUNT(*) AS count FROM public.appointments;

-- Test notifications
SELECT 'notifications' AS table_name, COUNT(*) AS count FROM public.notifications;

-- Test audit_log
SELECT 'audit_log' AS table_name, COUNT(*) AS count FROM public.audit_log;

SELECT 'All tables accessible without RLS!' AS final_status;