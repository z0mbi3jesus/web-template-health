-- =====================================================
-- Healthcare Appointment System - Minimal Schema
-- =====================================================
-- This script creates tables one at a time to isolate issues

-- =====================================================
-- STEP 1: COMPLETE CLEANUP
-- =====================================================

-- Drop everything with CASCADE to ensure clean slate
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- =====================================================
-- STEP 2: EXTENSIONS
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- STEP 3: CREATE TABLES ONE BY ONE
-- =====================================================

-- Table 1: Users (most basic)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'staff', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Verify users table exists
SELECT 'Users table created' AS step_1_status;

-- Table 2: Appointment types (no dependencies)
CREATE TABLE public.appointment_types (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    price DECIMAL(10,2),
    color TEXT DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Verify appointment_types table exists
SELECT 'Appointment types table created' AS step_2_status;

-- Table 3: Available slots (depends on users and appointment_types)
CREATE TABLE public.available_slots (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    staff_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    appointment_type_id UUID REFERENCES public.appointment_types(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    is_booked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Verify available_slots table exists
SELECT 'Available slots table created' AS step_3_status;

-- Table 4: Appointments (depends on all above)
CREATE TABLE public.appointments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    staff_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    slot_id UUID REFERENCES public.available_slots(id) ON DELETE CASCADE,
    appointment_type_id UUID REFERENCES public.appointment_types(id) ON DELETE CASCADE NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Verify appointments table exists
SELECT 'Appointments table created' AS step_4_status;

-- =====================================================
-- STEP 4: BASIC INDEXES
-- =====================================================

CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_available_slots_staff_id ON public.available_slots(staff_id);
CREATE INDEX idx_appointments_client_id ON public.appointments(client_id);

-- =====================================================
-- STEP 5: BASIC RLS
-- =====================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.available_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Basic policies
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Everyone can view active appointment types" ON public.appointment_types
    FOR SELECT USING (is_active = true);

-- =====================================================
-- STEP 6: SEED DATA
-- =====================================================

INSERT INTO public.appointment_types (name, description, duration_minutes, price, color) VALUES
('General Consultation', 'General health consultation', 30, 80.00, '#3B82F6'),
('Mental Health Session', 'Therapy session', 60, 120.00, '#10B981'),
('Physical Therapy', 'Physical rehabilitation', 45, 100.00, '#F59E0B');

-- =====================================================
-- SUCCESS
-- =====================================================

SELECT 'Healthcare Appointment System - MINIMAL SCHEMA COMPLETE!' AS final_status;