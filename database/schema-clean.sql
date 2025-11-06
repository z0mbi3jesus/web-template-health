-- =====================================================
-- Healthcare Appointment System - Clean Install Schema
-- =====================================================
-- This script completely wipes and recreates the database schema

-- =====================================================
-- CLEANUP: Drop everything first
-- =====================================================

-- Drop all triggers first (they depend on functions)
DROP TRIGGER IF EXISTS audit_users_trigger ON public.users;
DROP TRIGGER IF EXISTS audit_appointments_trigger ON public.appointments;
DROP TRIGGER IF EXISTS audit_available_slots_trigger ON public.available_slots;
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS update_appointment_types_updated_at ON public.appointment_types;
DROP TRIGGER IF EXISTS update_available_slots_updated_at ON public.available_slots;
DROP TRIGGER IF EXISTS update_appointments_updated_at ON public.appointments;

-- Drop all functions
DROP FUNCTION IF EXISTS audit_trigger() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS is_slot_available(UUID) CASCADE;
DROP FUNCTION IF EXISTS book_slot(UUID) CASCADE;
DROP FUNCTION IF EXISTS cancel_booking(UUID) CASCADE;

-- Drop all tables (in reverse dependency order)
DROP TABLE IF EXISTS public.audit_log CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.appointments CASCADE;
DROP TABLE IF EXISTS public.available_slots CASCADE;
DROP TABLE IF EXISTS public.appointment_types CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop any leftover policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Staff and admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Everyone can view active appointment types" ON public.appointment_types;
DROP POLICY IF EXISTS "Staff and admins can manage appointment types" ON public.appointment_types;
DROP POLICY IF EXISTS "Everyone can view available slots" ON public.available_slots;
DROP POLICY IF EXISTS "Staff can manage their own slots" ON public.available_slots;
DROP POLICY IF EXISTS "Clients can view their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Clients can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Staff can view their assigned appointments" ON public.appointments;
DROP POLICY IF EXISTS "Staff and admins can update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_log;

-- =====================================================
-- EXTENSIONS
-- =====================================================

-- Enable Row Level Security (RLS) and necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- TABLE CREATION (in dependency order)
-- =====================================================

-- Users table (extends Supabase auth.users) - FIRST
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

-- Appointment types table - SECOND (no dependencies)
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

-- Available slots table - THIRD (depends on users and appointment_types)
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
    
    -- Constraints
    CONSTRAINT valid_time_range CHECK (end_time > start_time),
    CONSTRAINT valid_bookings CHECK (current_bookings <= max_bookings)
);

-- Appointments table - FOURTH (depends on users, appointment_types, and available_slots)
CREATE TABLE public.appointments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    staff_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    slot_id UUID REFERENCES public.available_slots(id) ON DELETE CASCADE,
    appointment_type_id UUID REFERENCES public.appointment_types(id) ON DELETE CASCADE NOT NULL,
    
    -- Appointment details
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
    
    -- Client information
    client_notes TEXT,
    staff_notes TEXT,
    cancellation_reason TEXT,
    
    -- Pricing
    price DECIMAL(10,2),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
    payment_method TEXT,
    payment_id TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confirmed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_appointment_time CHECK (end_time > start_time)
);

-- Notifications table - FIFTH (depends on users and appointments)
CREATE TABLE public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
    
    type TEXT NOT NULL CHECK (type IN ('email', 'sms', 'push')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
    
    -- Scheduling
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB,
    error_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit log table - LAST (depends on users)
CREATE TABLE public.audit_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- VERIFY TABLES EXIST
-- =====================================================

-- Check that all tables were created successfully
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        RAISE EXCEPTION 'users table was not created';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'appointment_types') THEN
        RAISE EXCEPTION 'appointment_types table was not created';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'available_slots') THEN
        RAISE EXCEPTION 'available_slots table was not created';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'appointments') THEN
        RAISE EXCEPTION 'appointments table was not created';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
        RAISE EXCEPTION 'notifications table was not created';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_log') THEN
        RAISE EXCEPTION 'audit_log table was not created';
    END IF;
    
    RAISE NOTICE 'All tables created successfully!';
END $$;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Users table indexes
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_active ON public.users(is_active);

-- Available slots indexes
CREATE INDEX idx_available_slots_staff_id ON public.available_slots(staff_id);
CREATE INDEX idx_available_slots_appointment_type ON public.available_slots(appointment_type_id);
CREATE INDEX idx_available_slots_time_range ON public.available_slots(start_time, end_time);
CREATE INDEX idx_available_slots_booked ON public.available_slots(is_booked);

-- Appointments indexes
CREATE INDEX idx_appointments_client_id ON public.appointments(client_id);
CREATE INDEX idx_appointments_staff_id ON public.appointments(staff_id);
CREATE INDEX idx_appointments_status ON public.appointments(status);
CREATE INDEX idx_appointments_time_range ON public.appointments(start_time, end_time);
CREATE INDEX idx_appointments_created_at ON public.appointments(created_at);

-- Notifications indexes
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_status ON public.notifications(status);
CREATE INDEX idx_notifications_scheduled ON public.notifications(scheduled_for);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.available_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Staff and admins can view all users" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('staff', 'admin')
        )
    );

-- Appointment types policies
CREATE POLICY "Everyone can view active appointment types" ON public.appointment_types
    FOR SELECT USING (is_active = true);

CREATE POLICY "Staff and admins can manage appointment types" ON public.appointment_types
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('staff', 'admin')
        )
    );

-- Available slots policies
CREATE POLICY "Everyone can view available slots" ON public.available_slots
    FOR SELECT USING (is_booked = false AND is_blocked = false);

CREATE POLICY "Staff can manage their own slots" ON public.available_slots
    FOR ALL USING (
        staff_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Appointments policies
CREATE POLICY "Clients can view their own appointments" ON public.appointments
    FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "Clients can create appointments" ON public.appointments
    FOR INSERT WITH CHECK (client_id = auth.uid());

CREATE POLICY "Staff can view their assigned appointments" ON public.appointments
    FOR SELECT USING (
        staff_id = auth.uid() OR 
        client_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

CREATE POLICY "Staff and admins can update appointments" ON public.appointments
    FOR UPDATE USING (
        staff_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('staff', 'admin')
        )
    );

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());

-- Audit log policies (read-only for admins)
CREATE POLICY "Admins can view audit logs" ON public.audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATING TIMESTAMPS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointment_types_updated_at 
    BEFORE UPDATE ON public.appointment_types 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_available_slots_updated_at 
    BEFORE UPDATE ON public.available_slots 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at 
    BEFORE UPDATE ON public.appointments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TRIGGERS FOR AUDIT LOGGING
-- =====================================================

-- Function to log changes
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO public.audit_log (user_id, table_name, operation, old_data)
        VALUES (auth.uid(), TG_TABLE_NAME, TG_OP, row_to_json(OLD));
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.audit_log (user_id, table_name, operation, old_data, new_data)
        VALUES (auth.uid(), TG_TABLE_NAME, TG_OP, row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO public.audit_log (user_id, table_name, operation, new_data)
        VALUES (auth.uid(), TG_TABLE_NAME, TG_OP, row_to_json(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Apply audit triggers to important tables
CREATE TRIGGER audit_users_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_appointments_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.appointments
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_available_slots_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.available_slots
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- =====================================================
-- FUNCTIONS FOR BUSINESS LOGIC
-- =====================================================

-- Function to check slot availability
CREATE OR REPLACE FUNCTION is_slot_available(slot_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    slot_record RECORD;
BEGIN
    SELECT * INTO slot_record 
    FROM public.available_slots 
    WHERE id = slot_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    RETURN NOT slot_record.is_booked 
           AND NOT slot_record.is_blocked 
           AND slot_record.current_bookings < slot_record.max_bookings;
END;
$$ LANGUAGE plpgsql;

-- Function to book a slot
CREATE OR REPLACE FUNCTION book_slot(slot_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.available_slots 
    SET current_bookings = current_bookings + 1,
        is_booked = CASE 
            WHEN current_bookings + 1 >= max_bookings THEN TRUE 
            ELSE is_booked 
        END
    WHERE id = slot_id 
    AND current_bookings < max_bookings 
    AND NOT is_blocked;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to cancel a booking
CREATE OR REPLACE FUNCTION cancel_booking(slot_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.available_slots 
    SET current_bookings = GREATEST(0, current_bookings - 1),
        is_booked = CASE 
            WHEN current_bookings - 1 < max_bookings THEN FALSE 
            ELSE is_booked 
        END
    WHERE id = slot_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SEED DATA
-- =====================================================

-- Insert default appointment types
INSERT INTO public.appointment_types (name, description, duration_minutes, price, color, requires_approval) VALUES
('General Consultation', 'General health consultation and checkup', 30, 80.00, '#3B82F6', false),
('Mental Health Session', 'Individual therapy and mental health consultation', 60, 120.00, '#10B981', false),
('Physical Therapy', 'Physical rehabilitation and therapy session', 45, 100.00, '#F59E0B', false),
('Nutrition Consultation', 'Dietary planning and nutrition guidance', 45, 90.00, '#8B5CF6', false),
('Emergency Consultation', 'Urgent medical consultation', 20, 150.00, '#EF4444', true);

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

-- Confirmation that schema is complete
SELECT 'Healthcare Appointment System schema created successfully!' AS status;