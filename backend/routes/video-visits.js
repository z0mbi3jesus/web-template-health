/**
 * HIPAA-Compliant Video Visit Management
 * Whereby integration with access control and audit logging
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');
const { supabase: supabaseClient } = require('../config/database');

// Environment variables (user will provide Whereby API key)
const WHEREBY_API_KEY = process.env.WHEREBY_API_KEY;
const WHEREBY_API_BASE = process.env.WHEREBY_API_BASE || 'https://api.whereby.com';

/**
 * POST /api/video-visits
 * Create a new video visit for an appointment
 * Only staff/admin can initiate
 */
router.post('/', requireAuth(['staff', 'admin']), auditLog('create', 'video_visit'), async (req, res) => {
    try {
        const { appointmentId } = req.body;
        const userId = req.user.id;

        // Validate appointment exists and user is authorized
        const { data: appointment, error: appointmentErr } = await supabaseClient
            .from('appointments')
            .select('id, staff_id, client_id, status')
            .eq('id', appointmentId)
            .single();

        if (appointmentErr || !appointment) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        if (appointment.staff_id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized to create video for this appointment' });
        }

        // Check appointment is approved
        if (appointment.status !== 'confirmed') {
            return res.status(400).json({ error: 'Only approved appointments can have video visits' });
        }

        // Generate secure room ID (appointment-based)
        const roomId = `apt-${appointmentId.substring(0, 8)}-${Date.now()}`;

        // Create video visit record
        const { data: videoVisit, error: insertErr } = await supabaseClient
            .from('video_visits')
            .insert({
                appointment_id: appointmentId,
                created_by: userId,
                room_id: roomId,
                status: 'pending'
            })
            .select()
            .single();

        if (insertErr) {
            console.error('Video visit creation error:', insertErr);
            return res.status(500).json({ error: 'Failed to create video visit' });
        }

        res.json({
            success: true,
            videoVisit,
            message: 'Video visit created. Patient will be notified to join.'
        });

    } catch (error) {
        console.error('Video visit error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/video-visits/:appointmentId
 * Get video visit for an appointment
 * Accessible to appointment participants
 */
router.get('/:appointmentId', requireAuth(), auditLog('view', 'video_visit'), async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const userId = req.user.id;

        // Verify user is appointment participant
        const { data: appointment, error: appointmentErr } = await supabaseClient
            .from('appointments')
            .select('id, staff_id, client_id')
            .eq('id', appointmentId)
            .single();

        if (appointmentErr || !appointment) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        const isParticipant = appointment.staff_id === userId || appointment.client_id === userId;
        const isAdmin = req.user.role === 'admin';

        if (!isParticipant && !isAdmin) {
            return res.status(403).json({ error: 'Unauthorized to access this video visit' });
        }

        // Get video visit
        const { data: videoVisit, error: videoErr } = await supabaseClient
            .from('video_visits')
            .select('*')
            .eq('appointment_id', appointmentId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (videoErr || !videoVisit) {
            return res.status(404).json({ error: 'No active video session for this appointment' });
        }

        res.json({ videoVisit });

    } catch (error) {
        console.error('Video visit fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/video-visits/:videoVisitId/token
 * Generate a short-lived Whereby access token
 * HIPAA: Token expires in 15 minutes
 */
router.post('/:videoVisitId/token', requireAuth(), auditLog('request_token', 'video_visit'), async (req, res) => {
    try {
        if (!WHEREBY_API_KEY) {
            return res.status(500).json({ error: 'Whereby API not configured' });
        }

        const { videoVisitId } = req.params;
        const userId = req.user.id;

        // Get video visit
        const { data: videoVisit, error: videoErr } = await supabaseClient
            .from('video_visits')
            .select('* , appointments(staff_id, client_id)')
            .eq('id', videoVisitId)
            .single();

        if (videoErr || !videoVisit) {
            return res.status(404).json({ error: 'Video visit not found' });
        }

        // Verify access
        const isParticipant = 
            videoVisit.appointments.staff_id === userId || 
            videoVisit.appointments.client_id === userId;
        const isAdmin = req.user.role === 'admin';

        if (!isParticipant && !isAdmin) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Call Whereby API to generate token
        // TODO: Implement with actual Whereby API credentials
        const accessToken = await generateWherebyToken(videoVisit.room_id, userId, req.user.name);

        // Update video visit with token (encrypted in production)
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min
        
        await supabaseClient
            .from('video_visits')
            .update({
                token_expires_at: expiresAt.toISOString(),
                status: 'active',
                started_at: new Date().toISOString()
            })
            .eq('id', videoVisitId);

        res.json({
            token: accessToken,
            roomId: videoVisit.room_id,
            expiresAt,
            expiresIn: 15 * 60  // seconds
        });

    } catch (error) {
        console.error('Token generation error:', error);
        res.status(500).json({ error: 'Failed to generate video token' });
    }
});

/**
 * Generate Whereby access token
 * Calls Whereby API to create a short-lived token (15 min expiration)
 */
async function generateWherebyToken(roomId, userId, userName) {
    try {
        const response = await fetch(`${WHEREBY_API_BASE}/v1/rest/organizations/${process.env.WHEREBY_ORG_ID}/rooms/${roomId}/accessTokens`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${WHEREBY_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userName: userName || 'Anonymous',
                expiresIn: 15 * 60,  // 15 minutes in seconds
                userId: userId
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Whereby API error: ${error.message || response.statusText}`);
        }

        const { accessToken, expiresAt } = await response.json();
        return accessToken;
    } catch (error) {
        console.error('Whereby token generation failed:', error);
        throw new Error('Failed to generate video access token');
    }
}

/**
 * POST /api/video-visits/:videoVisitId/end
 * End video visit and mark as completed
 */
router.post('/:videoVisitId/end', requireAuth(['staff', 'admin']), auditLog('end', 'video_visit'), async (req, res) => {
    try {
        const { videoVisitId } = req.params;
        const userId = req.user.id;

        const { data: videoVisit, error: videoErr } = await supabaseClient
            .from('video_visits')
            .select('created_by')
            .eq('id', videoVisitId)
            .single();

        if (videoErr || !videoVisit) {
            return res.status(404).json({ error: 'Video visit not found' });
        }

        // Only creator or admin can end
        if (videoVisit.created_by !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { data: updated, error: updateErr } = await supabaseClient
            .from('video_visits')
            .update({
                status: 'completed',
                ended_at: new Date().toISOString()
            })
            .eq('id', videoVisitId)
            .select()
            .single();

        if (updateErr) {
            return res.status(500).json({ error: 'Failed to end video visit' });
        }

        res.json({ success: true, videoVisit: updated });

    } catch (error) {
        console.error('End video error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
