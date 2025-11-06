-- =====================================================
-- Healthcare Appointment System - Schema Update (Safe)
-- =====================================================
-- This script safely updates existing schema without conflicts

-- Enable Row Level Security (RLS) and necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- SAFE TABLE CREATION (only if not exists)
-- =====================================================

-- Create users table only if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
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
        RAISE NOTICE 'Created users table';
    ELSE
        RAISE NOTICE 'Users table already exists, skipping';
    END IF;
END $$;

-- Create appointment_types table only if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'appointment_types') THEN
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
        RAISE NOTICE 'Created appointment_types table';
    ELSE
        RAISE NOTICE 'Appointment_types table already exists, skipping';
    END IF;
END $$;

-- Create available_slots table only if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'available_slots') THEN
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
        RAISE NOTICE 'Created available_slots table';
    ELSE
        RAISE NOTICE 'Available_slots table already exists, skipping';
    END IF;
END $$;

-- Create appointments table only if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'appointments') THEN
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
        RAISE NOTICE 'Created appointments table';
    ELSE
        RAISE NOTICE 'Appointments table already exists, skipping';
    END IF;
END $$;

-- Create notifications table only if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
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
        RAISE NOTICE 'Created notifications table';
    ELSE
        RAISE NOTICE 'Notifications table already exists, skipping';
    END IF;
END $$;

-- Create audit_log table only if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_log') THEN
        CREATE TABLE public.audit_log (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
            table_name TEXT NOT NULL,
            operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
            old_data JSONB,
            new_data JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE 'Created audit_log table';
    ELSE
        RAISE NOTICE 'Audit_log table already exists, skipping';
    END IF;
END $$;

-- =====================================================
-- INDEXES (only create if they don't exist)
-- =====================================================

-- Create indexes safely
DO $$
BEGIN
    -- Users table indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_email') THEN
        CREATE INDEX idx_users_email ON public.users(email);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_role') THEN
        CREATE INDEX idx_users_role ON public.users(role);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_active') THEN
        CREATE INDEX idx_users_active ON public.users(is_active);
    END IF;

    -- Available slots indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_available_slots_staff_id') THEN
        CREATE INDEX idx_available_slots_staff_id ON public.available_slots(staff_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_available_slots_appointment_type') THEN
        CREATE INDEX idx_available_slots_appointment_type ON public.available_slots(appointment_type_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_available_slots_time_range') THEN
        CREATE INDEX idx_available_slots_time_range ON public.available_slots(start_time, end_time);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_available_slots_booked') THEN
        CREATE INDEX idx_available_slots_booked ON public.available_slots(is_booked);
    END IF;

    -- Appointments indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_appointments_client_id') THEN
        CREATE INDEX idx_appointments_client_id ON public.appointments(client_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_appointments_staff_id') THEN
        CREATE INDEX idx_appointments_staff_id ON public.appointments(staff_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_appointments_status') THEN
        CREATE INDEX idx_appointments_status ON public.appointments(status);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_appointments_time_range') THEN
        CREATE INDEX idx_appointments_time_range ON public.appointments(start_time, end_time);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_appointments_created_at') THEN
        CREATE INDEX idx_appointments_created_at ON public.appointments(created_at);
    END IF;

    -- Notifications indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_user_id') THEN
        CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_status') THEN
        CREATE INDEX idx_notifications_status ON public.notifications(status);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_scheduled') THEN
        CREATE INDEX idx_notifications_scheduled ON public.notifications(scheduled_for);
    END IF;
    
    RAISE NOTICE 'Indexes created or already exist';
END $$;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables (safe to run multiple times)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.available_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate them
-- This ensures we have the latest policy definitions

-- Users table policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Staff and admins can view all users" ON public.users;

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
DROP POLICY IF EXISTS "Everyone can view active appointment types" ON public.appointment_types;
DROP POLICY IF EXISTS "Staff and admins can manage appointment types" ON public.appointment_types;

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
DROP POLICY IF EXISTS "Everyone can view available slots" ON public.available_slots;
DROP POLICY IF EXISTS "Staff can manage their own slots" ON public.available_slots;

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
DROP POLICY IF EXISTS "Clients can view their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Clients can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Staff can view their assigned appointments" ON public.appointments;
DROP POLICY IF EXISTS "Staff and admins can update appointments" ON public.appointments;

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
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());

-- Audit log policies
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_log;
CREATE POLICY "Admins can view audit logs" ON public.audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers and recreate them
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS update_appointment_types_updated_at ON public.appointment_types;
DROP TRIGGER IF EXISTS update_available_slots_updated_at ON public.available_slots;
DROP TRIGGER IF EXISTS update_appointments_updated_at ON public.appointments;

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

-- Drop existing audit triggers and recreate them
DROP TRIGGER IF EXISTS audit_users_trigger ON public.users;
DROP TRIGGER IF EXISTS audit_appointments_trigger ON public.appointments;
DROP TRIGGER IF EXISTS audit_available_slots_trigger ON public.available_slots;

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
-- BUSINESS LOGIC FUNCTIONS
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
-- SEED DATA (only insert if tables are empty)
-- =====================================================

-- Insert default appointment types only if table is empty
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.appointment_types LIMIT 1) THEN
        INSERT INTO public.appointment_types (name, description, duration_minutes, price, color, requires_approval) VALUES
        ('General Consultation', 'General health consultation and checkup', 30, 80.00, '#3B82F6', false),
        ('Mental Health Session', 'Individual therapy and mental health consultation', 60, 120.00, '#10B981', false),
        ('Physical Therapy', 'Physical rehabilitation and therapy session', 45, 100.00, '#F59E0B', false),
        ('Nutrition Consultation', 'Dietary planning and nutrition guidance', 45, 90.00, '#8B5CF6', false),
        ('Emergency Consultation', 'Urgent medical consultation', 20, 150.00, '#EF4444', true);
        
        RAISE NOTICE 'Inserted default appointment types';
    ELSE
        RAISE NOTICE 'Appointment types already exist, skipping seed data';
    END IF;
END $$;

-- Final success message
DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Healthcare Appointment System schema updated successfully!';
    RAISE NOTICE 'All tables, indexes, policies, and functions are ready.';
    RAISE NOTICE '==============================================';
END $$;