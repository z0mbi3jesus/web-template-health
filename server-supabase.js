// Healthcare Appointment System - Supabase Backend
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

// Import Supabase configuration
const { supabase, supabaseAdmin, TABLES, USER_ROLES, APPOINTMENT_STATUS } = require('./config/supabase');

const app = express();
const PORT = process.env.PORT || 3001;
const WHEREBY_API_KEY = process.env.WHEREBY_API_KEY;
const WHEREBY_ORG_ID = process.env.WHEREBY_ORG_ID;
const WHEREBY_API_BASE = process.env.WHEREBY_API_BASE || 'https://api.whereby.com';

// =====================================================
// MIDDLEWARE SETUP
// =====================================================

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false, // Allow inline scripts for now
    crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
    origin: (origin, callback) => {
        const configuredOrigin = process.env.FRONTEND_URL;
        const allowedOrigins = [
            configuredOrigin,
            'http://localhost:8081',
            'http://localhost:3000'
        ].filter(Boolean);

        // Allow non-browser requests and known local/dev/prod frontend hosts.
        if (
            !origin ||
            allowedOrigins.includes(origin) ||
            /^https:\/\/.+\.vercel\.app$/i.test(origin)
        ) {
            return callback(null, true);
        }

        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10 // limit each IP to 10 auth requests per windowMs
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// =====================================================
// AUTHENTICATION MIDDLEWARE
// =====================================================

const authenticateUser = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
            return res.status(401).json({ message: 'Invalid token' });
        }

        // Get user profile from our users table
        const { data: userProfile, error: profileError } = await supabaseAdmin
            .from(TABLES.USERS)
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError || !userProfile) {
            return res.status(401).json({ message: 'User profile not found' });
        }

        req.user = userProfile;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(401).json({ message: 'Authentication failed' });
    }
};

const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }
        
        next();
    };
};

const canAccessAppointment = (user, appointment) => {
    if (!user || !appointment) return false;
    if (user.role === USER_ROLES.ADMIN) return true;
    if (user.role === USER_ROLES.STAFF) return appointment.staff_id === user.id;
    return appointment.client_id === user.id;
};

async function generateWherebyAccessToken(roomId, user) {
    if (!WHEREBY_API_KEY || !WHEREBY_ORG_ID) {
        throw new Error('Whereby is not configured');
    }

    const response = await fetch(
        `${WHEREBY_API_BASE}/v1/rest/organizations/${WHEREBY_ORG_ID}/rooms/${roomId}/accessTokens`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${WHEREBY_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userName: user.name || user.email || 'Participant',
                userId: user.id,
                expiresIn: 15 * 60
            })
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Whereby token request failed: ${errorText || response.statusText}`);
    }

    const payload = await response.json();
    return payload.accessToken;
}

// =====================================================
// VALIDATION RULES
// =====================================================

const validateRegistration = [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
    body('name').trim().isLength({ min: 2 }),
    body('phone').optional().isMobilePhone()
];

const validateAppointment = [
    body('appointment_type_id').isUUID(),
    body('start_time').isISO8601(),
    body('client_notes').optional().trim().isLength({ max: 500 })
];

// =====================================================
// AUTHENTICATION ROUTES
// =====================================================

// Register new user
app.post('/api/auth/register', authLimiter, validateRegistration, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password, name, phone } = req.body;

        // Create user in Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        });

        if (authError) {
            console.error('Supabase auth error:', authError);
            return res.status(400).json({ message: authError.message });
        }

        // Create user profile in our users table
        const { data: userProfile, error: profileError } = await supabaseAdmin
            .from(TABLES.USERS)
            .insert({
                id: authData.user.id,
                email,
                name,
                phone,
                role: USER_ROLES.CLIENT
            })
            .select()
            .single();

        if (profileError) {
            console.error('Profile creation error:', profileError);
            // Clean up auth user if profile creation fails
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            return res.status(500).json({ message: 'Failed to create user profile' });
        }

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: userProfile.id,
                email: userProfile.email,
                name: userProfile.name,
                role: userProfile.role
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Registration failed' });
    }
});

// Login user
app.post('/api/auth/login', authLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Authenticate with Supabase
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (authError) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Get user profile
        const { data: userProfile, error: profileError } = await supabaseAdmin
            .from(TABLES.USERS)
            .select('*')
            .eq('id', authData.user.id)
            .single();

        if (profileError) {
            return res.status(500).json({ message: 'Failed to get user profile' });
        }

        // Update last login
        await supabaseAdmin
            .from(TABLES.USERS)
            .update({ last_login: new Date().toISOString() })
            .eq('id', userProfile.id);

        res.json({
            message: 'Login successful',
            token: authData.session.access_token,
            user: {
                id: userProfile.id,
                email: userProfile.email,
                name: userProfile.name,
                role: userProfile.role
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Login failed' });
    }
});

// Logout user
app.post('/api/auth/logout', authenticateUser, async (req, res) => {
    try {
        const { error } = await supabase.auth.signOut();
        
        if (error) {
            return res.status(500).json({ message: 'Logout failed' });
        }

        res.json({ message: 'Logout successful' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ message: 'Logout failed' });
    }
});

// Get current user profile
app.get('/api/auth/me', authenticateUser, (req, res) => {
    res.json({
        user: {
            id: req.user.id,
            email: req.user.email,
            name: req.user.name,
            role: req.user.role,
            phone: req.user.phone,
            avatar_url: req.user.avatar_url
        }
    });
});

// =====================================================
// APPOINTMENT TYPES ROUTES
// =====================================================

// Get all active appointment types
app.get('/api/appointment-types', async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from(TABLES.APPOINTMENT_TYPES)
            .select('*')
            .eq('is_active', true)
            .order('name');

        if (error) {
            console.error('Error fetching appointment types:', error);
            return res.status(500).json({ message: 'Failed to fetch appointment types' });
        }

        res.json(data || []);
    } catch (error) {
        console.error('Error fetching appointment types:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create appointment type (staff/admin only)
app.post('/api/appointment-types', authenticateUser, requireRole([USER_ROLES.STAFF, USER_ROLES.ADMIN]), async (req, res) => {
    try {
        const { name, description, duration_minutes, price, color, requires_approval } = req.body;

        const { data, error } = await supabaseAdmin
            .from(TABLES.APPOINTMENT_TYPES)
            .insert({
                name,
                description,
                duration_minutes,
                price,
                color,
                requires_approval
            })
            .select()
            .single();

        if (error) {
            return res.status(500).json({ message: 'Failed to create appointment type' });
        }

        res.status(201).json(data);
    } catch (error) {
        console.error('Error creating appointment type:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// =====================================================
// AVAILABLE SLOTS ROUTES
// =====================================================

// Get staff directory (staff/admin only)
app.get('/api/staff', authenticateUser, requireRole([USER_ROLES.STAFF, USER_ROLES.ADMIN]), async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from(TABLES.USERS)
            .select('id, name, email, role')
            .in('role', [USER_ROLES.STAFF, USER_ROLES.ADMIN])
            .order('name');

        if (error) {
            return res.status(500).json({ message: 'Failed to fetch staff list' });
        }

        res.json(data || []);
    } catch (error) {
        console.error('Error fetching staff list:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get available slots
app.get('/api/available-slots', async (req, res) => {
    try {
        const { start_date, end_date, appointment_type_id, staff_id } = req.query;

        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (appointment_type_id && !uuidPattern.test(String(appointment_type_id))) {
            return res.json([]);
        }
        if (staff_id && !uuidPattern.test(String(staff_id))) {
            return res.json([]);
        }

        let query = supabaseAdmin
            .from(TABLES.AVAILABLE_SLOTS)
            .select(`
                *,
                users:staff_id(name, email),
                appointment_types:appointment_type_id(name)
            `)
            .eq('is_booked', false)
            .eq('is_blocked', false);

        if (start_date) {
            query = query.gte('start_time', start_date);
        }
        if (end_date) {
            query = query.lte('start_time', end_date);
        }
        if (appointment_type_id) {
            query = query.eq('appointment_type_id', appointment_type_id);
        }
        if (staff_id) {
            query = query.eq('staff_id', staff_id);
        }

        const { data, error } = await query.order('start_time');

        if (error) {
            console.error('Error fetching available slots:', error);
            return res.status(500).json({ message: 'Failed to fetch available slots' });
        }

        res.json(data || []);
    } catch (error) {
        console.error('Error fetching available slots:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create available slot (staff/admin only)
app.post('/api/available-slots', authenticateUser, requireRole([USER_ROLES.STAFF, USER_ROLES.ADMIN]), async (req, res) => {
    try {
        const { appointment_type_id, start_time, end_time, max_bookings = 1, staff_id } = req.body;

        if (!appointment_type_id || !start_time || !end_time) {
            return res.status(400).json({ message: 'appointment_type_id, start_time and end_time are required' });
        }

        const targetStaffId = req.user.role === USER_ROLES.ADMIN && staff_id ? staff_id : req.user.id;

        const { data, error } = await supabaseAdmin
            .from(TABLES.AVAILABLE_SLOTS)
            .insert({
                staff_id: targetStaffId,
                appointment_type_id,
                start_time,
                end_time,
                max_bookings
            })
            .select()
            .single();

        if (error) {
            return res.status(500).json({ message: 'Failed to create available slot' });
        }

        res.status(201).json(data);
    } catch (error) {
        console.error('Error creating available slot:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete available slot (staff owner or admin)
app.delete('/api/available-slots/:id', authenticateUser, requireRole([USER_ROLES.STAFF, USER_ROLES.ADMIN]), async (req, res) => {
    try {
        const { id } = req.params;

        const { data: slot, error: slotError } = await supabaseAdmin
            .from(TABLES.AVAILABLE_SLOTS)
            .select('id, staff_id, is_booked')
            .eq('id', id)
            .single();

        if (slotError || !slot) {
            return res.status(404).json({ message: 'Slot not found' });
        }

        if (req.user.role !== USER_ROLES.ADMIN && slot.staff_id !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized to delete this slot' });
        }

        if (slot.is_booked) {
            return res.status(409).json({ message: 'Cannot delete a booked slot' });
        }

        const { error: deleteError } = await supabaseAdmin
            .from(TABLES.AVAILABLE_SLOTS)
            .delete()
            .eq('id', id);

        if (deleteError) {
            return res.status(500).json({ message: 'Failed to delete slot' });
        }

        res.json({ message: 'Slot deleted successfully' });
    } catch (error) {
        console.error('Error deleting available slot:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// =====================================================
// APPOINTMENTS ROUTES
// =====================================================

// Get user's appointments
app.get('/api/appointments', authenticateUser, async (req, res) => {
    try {
        const normalizeStatus = (rawStatus) => {
            if (!rawStatus) return null;
            const value = String(rawStatus).toLowerCase();
            if (value === 'approved') return APPOINTMENT_STATUS.CONFIRMED;
            if (value === 'declined') return APPOINTMENT_STATUS.CANCELLED;
            return value;
        };

        let query = supabaseAdmin
            .from(TABLES.APPOINTMENTS)
            .select(`
                *,
                appointment_types:appointment_type_id(*),
                clients:client_id(name, email, phone),
                staff:staff_id(name, email)
            `);

        const requestedStatus = normalizeStatus(req.query.status);
        if (requestedStatus) {
            query = query.eq('status', requestedStatus);
        }

        // Filter based on user role
        if (req.user.role === USER_ROLES.CLIENT) {
            query = query.eq('client_id', req.user.id);
        } else if (req.user.role === USER_ROLES.STAFF) {
            query = query.eq('staff_id', req.user.id);
        }
        // Admins see all appointments

        const { data, error } = await query.order('start_time');

        if (error) {
            return res.status(500).json({ message: 'Failed to fetch appointments' });
        }

        res.json(data);
    } catch (error) {
        console.error('Error fetching appointments:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get single appointment details
app.get('/api/appointments/:id', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;

        const { data: appointment, error } = await supabaseAdmin
            .from(TABLES.APPOINTMENTS)
            .select(`
                id,
                client_id,
                staff_id,
                status,
                start_time,
                end_time,
                appointment_types:appointment_type_id(name, duration_minutes),
                staff:staff_id(name, email),
                clients:client_id(name, email)
            `)
            .eq('id', id)
            .single();

        if (error || !appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        if (!canAccessAppointment(req.user, appointment)) {
            return res.status(403).json({ message: 'Unauthorized to access this appointment' });
        }

        res.json({
            id: appointment.id,
            status: appointment.status,
            scheduled_time: appointment.start_time,
            start_time: appointment.start_time,
            end_time: appointment.end_time,
            type: appointment.appointment_types || null,
            staff: appointment.staff || null,
            client: appointment.clients || null,
            staff_id: appointment.staff_id,
            client_id: appointment.client_id
        });
    } catch (error) {
        console.error('Error fetching appointment details:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create appointment
app.post('/api/appointments', authenticateUser, validateAppointment, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { slot_id, appointment_type_id, start_time, client_notes } = req.body;

        // Get appointment type details
        const { data: appointmentType, error: typeError } = await supabase
            .from(TABLES.APPOINTMENT_TYPES)
            .select('*')
            .eq('id', appointment_type_id)
            .single();

        if (typeError || !appointmentType) {
            return res.status(400).json({ message: 'Invalid appointment type' });
        }

        // Calculate end time
        const startTime = new Date(start_time);
        const endTime = new Date(startTime.getTime() + appointmentType.duration_minutes * 60000);

        // Check if slot is available and book it
        if (slot_id) {
            const { data: slotData, error: slotError } = await supabaseAdmin
                .rpc('book_slot', { slot_id });

            if (slotError || !slotData) {
                return res.status(409).json({ message: 'Slot no longer available' });
            }
        }

        // Create appointment
        const appointmentData = {
            client_id: req.user.id,
            slot_id,
            appointment_type_id,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            client_notes,
            price: appointmentType.price,
            status: appointmentType.requires_approval ? APPOINTMENT_STATUS.PENDING : APPOINTMENT_STATUS.CONFIRMED
        };

        const { data: appointment, error: appointmentError } = await supabaseAdmin
            .from(TABLES.APPOINTMENTS)
            .insert(appointmentData)
            .select(`
                *,
                appointment_types:appointment_type_id(*),
                clients:client_id(name, email, phone)
            `)
            .single();

        if (appointmentError) {
            // Cancel the slot booking if appointment creation fails
            if (slot_id) {
                await supabaseAdmin.rpc('cancel_booking', { slot_id });
            }
            return res.status(500).json({ message: 'Failed to create appointment' });
        }

        res.status(201).json(appointment);
    } catch (error) {
        console.error('Error creating appointment:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update appointment status (staff/admin only)
const updateAppointmentStatusHandler = async (req, res) => {
    try {
        const { id } = req.params;
        const normalizeStatus = (rawStatus) => {
            if (!rawStatus) return null;
            const value = String(rawStatus).toLowerCase();
            if (value === 'approved') return APPOINTMENT_STATUS.CONFIRMED;
            if (value === 'declined') return APPOINTMENT_STATUS.CANCELLED;
            return value;
        };

        const requestedStatus = normalizeStatus(req.body.status);

        const { data: existingAppointment, error: existingError } = await supabaseAdmin
            .from(TABLES.APPOINTMENTS)
            .select('id, client_id, staff_id, slot_id, status')
            .eq('id', id)
            .single();

        if (existingError || !existingAppointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        const isAdmin = req.user.role === USER_ROLES.ADMIN;
        const isStaffOwner = req.user.role === USER_ROLES.STAFF && existingAppointment.staff_id === req.user.id;
        const isClientOwner = req.user.role === USER_ROLES.CLIENT && existingAppointment.client_id === req.user.id;

        if (!isAdmin && !isStaffOwner && !isClientOwner) {
            return res.status(403).json({ message: 'Unauthorized to update this appointment' });
        }

        if (isClientOwner && requestedStatus !== APPOINTMENT_STATUS.CANCELLED) {
            return res.status(403).json({ message: 'Clients can only cancel their appointments' });
        }

        if (!Object.values(APPOINTMENT_STATUS).includes(requestedStatus)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const updateData = { status: requestedStatus };
        if (requestedStatus === APPOINTMENT_STATUS.CONFIRMED) updateData.confirmed_at = new Date().toISOString();
        if (requestedStatus === APPOINTMENT_STATUS.CANCELLED) updateData.cancelled_at = new Date().toISOString();
        if (requestedStatus === APPOINTMENT_STATUS.COMPLETED) updateData.completed_at = new Date().toISOString();

        const { data, error } = await supabaseAdmin
            .from(TABLES.APPOINTMENTS)
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ message: 'Failed to update appointment status' });
        }

        if (requestedStatus === APPOINTMENT_STATUS.CANCELLED && existingAppointment.slot_id) {
            await supabaseAdmin.rpc('cancel_booking', { slot_id: existingAppointment.slot_id });
        }

        res.json(data);
    } catch (error) {
        console.error('Error updating appointment status:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update appointment status (compatible with both legacy and new frontend calls)
app.patch('/api/appointments/:id/status', authenticateUser, updateAppointmentStatusHandler);
app.put('/api/appointments/:id', authenticateUser, updateAppointmentStatusHandler);

// =====================================================
// VIDEO VISITS ROUTES
// =====================================================

app.post('/api/video-visits', authenticateUser, requireRole([USER_ROLES.STAFF, USER_ROLES.ADMIN]), async (req, res) => {
    try {
        const { appointmentId } = req.body;

        if (!appointmentId) {
            return res.status(400).json({ message: 'appointmentId is required' });
        }

        const { data: appointment, error: appointmentError } = await supabaseAdmin
            .from(TABLES.APPOINTMENTS)
            .select('id, staff_id, client_id, status')
            .eq('id', appointmentId)
            .single();

        if (appointmentError || !appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        if (req.user.role !== USER_ROLES.ADMIN && appointment.staff_id !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized to create video visit for this appointment' });
        }

        const { data: existing } = await supabaseAdmin
            .from('video_visits')
            .select('*')
            .eq('appointment_id', appointmentId)
            .in('status', ['pending', 'active'])
            .order('created_at', { ascending: false })
            .limit(1);

        if (existing && existing.length > 0) {
            return res.json({ videoVisit: existing[0], message: 'Existing video visit found' });
        }

        const roomId = `apt-${appointmentId.substring(0, 8)}-${Date.now()}`;

        const { data: videoVisit, error: insertError } = await supabaseAdmin
            .from('video_visits')
            .insert({
                appointment_id: appointmentId,
                created_by: req.user.id,
                room_id: roomId,
                status: 'pending'
            })
            .select('*')
            .single();

        if (insertError || !videoVisit) {
            return res.status(500).json({ message: 'Failed to create video visit' });
        }

        res.status(201).json({ videoVisit });
    } catch (error) {
        console.error('Error creating video visit:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/video-visits/:appointmentId', authenticateUser, async (req, res) => {
    try {
        const { appointmentId } = req.params;

        const { data: appointment, error: appointmentError } = await supabaseAdmin
            .from(TABLES.APPOINTMENTS)
            .select('id, staff_id, client_id')
            .eq('id', appointmentId)
            .single();

        if (appointmentError || !appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        if (!canAccessAppointment(req.user, appointment)) {
            return res.status(403).json({ message: 'Unauthorized to access this video visit' });
        }

        const { data: videoVisits, error: videoError } = await supabaseAdmin
            .from('video_visits')
            .select('*')
            .eq('appointment_id', appointmentId)
            .order('created_at', { ascending: false })
            .limit(1);

        if (videoError) {
            return res.status(500).json({ message: 'Failed to fetch video visit' });
        }

        if (!videoVisits || videoVisits.length === 0) {
            return res.status(404).json({ message: 'No video visit found for this appointment' });
        }

        res.json({ videoVisit: videoVisits[0] });
    } catch (error) {
        console.error('Error fetching video visit:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/video-visits/:videoVisitId/token', authenticateUser, async (req, res) => {
    try {
        const { videoVisitId } = req.params;

        const { data: videoVisit, error: videoError } = await supabaseAdmin
            .from('video_visits')
            .select('id, appointment_id, room_id, created_by, status')
            .eq('id', videoVisitId)
            .single();

        if (videoError || !videoVisit) {
            return res.status(404).json({ message: 'Video visit not found' });
        }

        const { data: appointment, error: appointmentError } = await supabaseAdmin
            .from(TABLES.APPOINTMENTS)
            .select('id, staff_id, client_id')
            .eq('id', videoVisit.appointment_id)
            .single();

        if (appointmentError || !appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        if (!canAccessAppointment(req.user, appointment)) {
            return res.status(403).json({ message: 'Unauthorized to access this video token' });
        }

        const token = await generateWherebyAccessToken(videoVisit.room_id, req.user);
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

        await supabaseAdmin
            .from('video_visits')
            .update({
                access_token: token,
                token_expires_at: expiresAt,
                status: 'active',
                started_at: new Date().toISOString()
            })
            .eq('id', videoVisitId);

        res.json({
            token,
            roomId: videoVisit.room_id,
            expiresAt,
            expiresIn: 15 * 60
        });
    } catch (error) {
        console.error('Error creating video token:', error);
        res.status(500).json({ message: error.message || 'Failed to generate video token' });
    }
});

app.post('/api/video-visits/:videoVisitId/end', authenticateUser, requireRole([USER_ROLES.STAFF, USER_ROLES.ADMIN]), async (req, res) => {
    try {
        const { videoVisitId } = req.params;

        const { data: videoVisit, error: videoError } = await supabaseAdmin
            .from('video_visits')
            .select('id, created_by, appointment_id')
            .eq('id', videoVisitId)
            .single();

        if (videoError || !videoVisit) {
            return res.status(404).json({ message: 'Video visit not found' });
        }

        const { data: appointment } = await supabaseAdmin
            .from(TABLES.APPOINTMENTS)
            .select('staff_id')
            .eq('id', videoVisit.appointment_id)
            .single();

        const canEnd = req.user.role === USER_ROLES.ADMIN || videoVisit.created_by === req.user.id || appointment?.staff_id === req.user.id;
        if (!canEnd) {
            return res.status(403).json({ message: 'Unauthorized to end this video visit' });
        }

        const { data: updated, error: updateError } = await supabaseAdmin
            .from('video_visits')
            .update({ status: 'completed', ended_at: new Date().toISOString() })
            .eq('id', videoVisitId)
            .select('*')
            .single();

        if (updateError || !updated) {
            return res.status(500).json({ message: 'Failed to end video visit' });
        }

        res.json({ videoVisit: updated, message: 'Video visit ended' });
    } catch (error) {
        console.error('Error ending video visit:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// =====================================================
// USER MANAGEMENT ROUTES (Admin only)
// =====================================================

// Get all users (admin only)
app.get('/api/users', authenticateUser, requireRole([USER_ROLES.ADMIN]), async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from(TABLES.USERS)
            .select('id, email, name, phone, role, created_at, last_login, is_active')
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ message: 'Failed to fetch users' });
        }

        res.json(data);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update user role (admin only)
app.patch('/api/users/:id/role', authenticateUser, requireRole([USER_ROLES.ADMIN]), async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!Object.values(USER_ROLES).includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        const { data, error } = await supabaseAdmin
            .from(TABLES.USERS)
            .update({ role })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ message: 'Failed to update user role' });
        }

        res.json(data);
    } catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// =====================================================
// HEALTH CHECK & ERROR HANDLING
// =====================================================

app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '2.0.0-supabase'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error:', err);
    res.status(500).json({ message: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'Endpoint not found' });
});

// =====================================================
// SERVER STARTUP
// =====================================================

app.listen(PORT, () => {
    console.log(`Healthcare Appointment System (Supabase) running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:8081'}`);
});

module.exports = app;