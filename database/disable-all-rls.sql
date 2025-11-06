-- =====================================================
-- Complete RLS Disable for All Tables
-- =====================================================

-- Disable RLS on ALL tables to allow service role access
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.available_slots DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log DISABLE ROW LEVEL SECURITY;

-- Test queries to verify access
SELECT 'Testing all tables...' AS status;

SELECT 'appointment_types' AS table_name, COUNT(*) AS row_count FROM public.appointment_types;
SELECT 'users' AS table_name, COUNT(*) AS row_count FROM public.users;
SELECT 'available_slots' AS table_name, COUNT(*) AS row_count FROM public.available_slots;
SELECT 'appointments' AS table_name, COUNT(*) AS row_count FROM public.appointments;
SELECT 'notifications' AS table_name, COUNT(*) AS row_count FROM public.notifications;
SELECT 'audit_log' AS table_name, COUNT(*) AS row_count FROM public.audit_log;

SELECT 'All RLS disabled - tables should be accessible!' AS final_status;