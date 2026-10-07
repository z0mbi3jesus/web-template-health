-- =====================================================
-- Healthcare Appointment System - Fresh Supabase Setup
-- =====================================================
-- Run this in your Supabase SQL Editor

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'staff', 'admin')),
    avatar_url TEXT,
    date_of_birth DATE,
    address JSONB,
    emergency_contact JSONB,
    medical_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE
);

-- =====================================================
-- APPOINTMENT TYPES TABLE
-- =====================================================
CREATE TABLE public.appointment_types (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    price DECIMAL(10,2),
    color TEXT DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT TRUE,
    requires_approval BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- AVAILABLE SLOTS TABLE
-- =====================================================
CREATE TABLE public.available_slots (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    staff_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    appointment_type_id UUID REFERENCES public.appointment_types(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    is_booked BOOLEAN DEFAULT FALSE,
    is_blocked BOOLEAN DEFAULT FALSE,
    block_reason TEXT,
    max_bookings INTEGER DEFAULT 1,
    current_bookings INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_time_range CHECK (end_time > start_time),
    CONSTRAINT valid_bookings CHECK (current_bookings <= max_bookings)
);

-- =====================================================
-- APPOINTMENTS TABLE
-- =====================================================
CREATE TABLE public.appointments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    staff_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    slot_id UUID REFERENCES public.available_slots(id) ON DELETE CASCADE,
    appointment_type_id UUID REFERENCES public.appointment_types(id) ON DELETE CASCADE NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
    client_notes TEXT,
    staff_notes TEXT,
    cancellation_reason TEXT,
    price DECIMAL(10,2),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
    payment_method TEXT,
    payment_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confirmed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT valid_appointment_time CHECK (end_time > start_time)
);

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('appointment_reminder', 'appointment_confirmed', 'appointment_cancelled', 'appointment_rescheduled', 'system')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- AUDIT LOG TABLE
-- =====================================================
CREATE TABLE public.audit_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id UUID,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATING TIMESTAMPS
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_appointment_types_updated_at BEFORE UPDATE ON public.appointment_types FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_available_slots_updated_at BEFORE UPDATE ON public.available_slots FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- DISABLE RLS FOR DEMO (IMPORTANT!)
-- =====================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.available_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- GRANT PERMISSIONS TO SERVICE ROLE AND ANON
-- =====================================================
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.appointment_types TO service_role;
GRANT ALL ON public.available_slots TO service_role;
GRANT ALL ON public.appointments TO service_role;
GRANT ALL ON public.notifications TO service_role;
GRANT ALL ON public.audit_log TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_types TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.available_slots TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_log TO anon;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- =====================================================
-- SEED DATA - Sample Appointment Types
-- =====================================================
INSERT INTO public.appointment_types (name, description, duration_minutes, price, color, requires_approval) VALUES
('General Consultation', 'General health consultation', 30, 80.00, '#3B82F6', false),
('Mental Health Session', 'Therapy session', 60, 120.00, '#10B981', false),
('Physical Therapy', 'Physical rehabilitation', 45, 100.00, '#F59E0B', false),
('Nutrition Consultation', 'Dietary planning and nutrition guidance', 45, 90.00, '#8B5CF6', false),
('Emergency Consultation', 'Urgent medical consultation', 20, 150.00, '#EF4444', true);

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
SELECT 'Database setup complete! 5 appointment types created.' AS status;