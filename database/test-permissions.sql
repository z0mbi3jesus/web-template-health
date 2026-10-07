-- =====================================================
-- Temporary RLS Bypass for Testing
-- =====================================================

-- Temporarily disable RLS on appointment_types to test basic connection
-- We'll re-enable it once we confirm the connection works

ALTER TABLE public.appointment_types ENABLE ROW LEVEL SECURITY;

-- Test that we can query appointment_types
SELECT 'Testing appointment_types access...' AS test_message;
SELECT name, duration_minutes FROM public.appointment_types LIMIT 3;

-- Re-enable RLS
ALTER TABLE public.appointment_types ENABLE ROW LEVEL SECURITY;

-- Add a more permissive policy for testing
DROP POLICY IF EXISTS "Everyone can view active appointment types" ON public.appointment_types;
CREATE POLICY "Everyone can view active appointment types" ON public.appointment_types
    FOR SELECT USING (
        is_active = true OR
        auth.role() = 'service_role' OR
        auth.role() = 'anon'
    );

SELECT 'RLS temporarily relaxed for testing' AS status;