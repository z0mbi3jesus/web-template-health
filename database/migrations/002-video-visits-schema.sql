-- HIPAA-Compliant Video Visits Schema
-- Tracks secure video session metadata

-- Video visits table
CREATE TABLE IF NOT EXISTS video_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),
    room_id VARCHAR(255) UNIQUE NOT NULL,  -- Whereby room identifier
    access_token VARCHAR(1000),            -- Short-lived Whereby token (store encrypted)
    token_expires_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'pending',  -- pending, active, completed
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    participant_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit log table (HIPAA Required)
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(255) NOT NULL,         -- e.g., 'video_join', 'video_invite', 'appointment_view'
    resource_type VARCHAR(100),           -- e.g., 'video_visit', 'appointment', 'user'
    resource_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    status VARCHAR(50),                   -- success, failure, denied
    status_code INT,
    error_message TEXT,
    details JSONB,                        -- Additional context
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_video_visits_appointment ON video_visits(appointment_id);
CREATE INDEX idx_video_visits_created_by ON video_visits(created_by);
CREATE INDEX idx_video_visits_status ON video_visits(status);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- Row Level Security (RLS) Policies
ALTER TABLE video_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Video visits: Clients can only see their own appointment's video visits
CREATE POLICY video_visits_select_client ON video_visits
    FOR SELECT USING (
        auth.uid() IN (
            SELECT patient_id FROM appointments WHERE id = video_visits.appointment_id
        )
        OR auth.uid() IN (
            SELECT staff_id FROM appointments WHERE id = video_visits.appointment_id
        )
        OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    );

-- Video visits: Only appointment creator or admin can create sessions
CREATE POLICY video_visits_insert ON video_visits
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT staff_id FROM appointments WHERE id = NEW.appointment_id
        )
        OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    );

-- Audit log: Users can read their own audit entries
CREATE POLICY audit_log_select ON audit_log
    FOR SELECT USING (
        auth.uid() = user_id
        OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'staff')
    );

-- Audit log: System can insert
CREATE POLICY audit_log_insert ON audit_log
    FOR INSERT WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT ON video_visits TO authenticated;
GRANT SELECT, INSERT, UPDATE ON appointments TO authenticated;
GRANT SELECT, INSERT ON audit_log TO authenticated;
