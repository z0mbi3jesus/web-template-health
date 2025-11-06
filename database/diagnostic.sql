-- =====================================================
-- Diagnostic Query - Check RLS Status
-- =====================================================

-- Check if RLS is enabled on our tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'appointment_types', 'available_slots', 'appointments', 'notifications', 'audit_log');

-- Check what policies exist
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public';

-- Check table permissions
SELECT 
    table_schema,
    table_name,
    privilege_type,
    grantee
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
AND table_name = 'appointment_types';

-- Try to select from appointment_types directly
SELECT 'Testing direct select...' as test;
SELECT COUNT(*) as row_count FROM public.appointment_types;