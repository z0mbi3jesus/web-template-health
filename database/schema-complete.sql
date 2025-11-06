-- =====================================================
-- Healthcare Appointment System - Working Schema v2
-- =====================================================
-- Building on the successful minimal schema

-- =====================================================
-- ADD MISSING ESSENTIAL FIELDS
-- =====================================================

-- Add missing fields to existing tables
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS address JSONB;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS emergency_contact JSONB;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS medical_notes TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

ALTER TABLE public.appointment_types ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT FALSE;

ALTER TABLE public.available_slots ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;
ALTER TABLE public.available_slots ADD COLUMN IF NOT EXISTS block_reason TEXT;
ALTER TABLE public.available_slots ADD COLUMN IF NOT EXISTS max_bookings INTEGER DEFAULT 1;
ALTER TABLE public.available_slots ADD COLUMN IF NOT EXISTS current_bookings INTEGER DEFAULT 0;

-- Add constraints safely
DO $$
BEGIN
    -- Add constraints to available_slots if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'valid_time_range') THEN
        ALTER TABLE public.available_slots ADD CONSTRAINT valid_time_range CHECK (end_time > start_time);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'valid_bookings') THEN
        ALTER TABLE public.available_slots ADD CONSTRAINT valid_bookings CHECK (current_bookings <= max_bookings);
    END IF;
END $$;

ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS client_notes TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS staff_notes TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS price DECIMAL(10,2);
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS payment_id TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Add check constraints safely
DO $$
BEGIN
    -- Add constraints to appointments if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'valid_appointment_time') THEN
        ALTER TABLE public.appointments ADD CONSTRAINT valid_appointment_time CHECK (end_time > start_time);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'valid_payment_status') THEN
        ALTER TABLE public.appointments ADD CONSTRAINT valid_payment_status CHECK (payment_status IN ('pending', 'paid', 'refunded'));
    END IF;
END $$;

-- Update appointment status constraint
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_status_check CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show'));

-- =====================================================
-- CREATE ADDITIONAL TABLES
-- =====================================================

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
    
    type TEXT NOT NULL CHECK (type IN ('email', 'sms', 'push')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
    
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    
    metadata JSONB,
    error_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit log table
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- COMPLETE INDEXES
-- =====================================================

-- Additional indexes
CREATE INDEX IF NOT EXISTS idx_users_active ON public.users(is_active);
CREATE INDEX IF NOT EXISTS idx_available_slots_appointment_type ON public.available_slots(appointment_type_id);
CREATE INDEX IF NOT EXISTS idx_available_slots_time_range ON public.available_slots(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_available_slots_booked ON public.available_slots(is_booked);
CREATE INDEX IF NOT EXISTS idx_appointments_staff_id ON public.appointments(staff_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_time_range ON public.appointments(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_appointments_created_at ON public.appointments(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON public.notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON public.notifications(scheduled_for);

-- =====================================================
-- COMPLETE RLS POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Fix existing policies and add missing ones
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Staff and admins can view all users" ON public.users;

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

-- Audit log policies
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

-- Apply triggers
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

-- Audit function
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

-- Apply audit triggers
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
-- ADD MORE SEED DATA
-- =====================================================

-- Add more appointment types
INSERT INTO public.appointment_types (name, description, duration_minutes, price, color, requires_approval) VALUES
('Nutrition Consultation', 'Dietary planning and nutrition guidance', 45, 90.00, '#8B5CF6', false),
('Emergency Consultation', 'Urgent medical consultation', 20, 150.00, '#EF4444', true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

SELECT 'Healthcare Appointment System - COMPLETE SCHEMA READY!' AS final_status;