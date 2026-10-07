const express = require('express');
const { protect, authorize, isAdmin } = require('../middleware/auth');
const { supabase, query } = require('../config/database');

const router = express.Router();

// @desc    Get all appointment types
// @route   GET /api/appointments/types
// @access  Public
router.get('/types', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('appointment_types')
      .select('id, name, description, duration_minutes, color')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    res.status(200).json({
      success: true,
      count: data.length,
      appointmentTypes: data
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get user's appointments
// @route   GET /api/appointments
// @access  Private
router.get('/', protect, async (req, res, next) => {
  try {
    let appointmentQuery;
    let queryParams;

    if (req.user.role === 'client') {
      // Clients can only see their own appointments
      appointmentQuery = `
        SELECT a.*, at.name as appointment_type_name, at.duration_minutes,
               u.first_name as staff_first_name, u.last_name as staff_last_name
        FROM appointments a
        LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
        LEFT JOIN users u ON a.staff_id = u.id
        WHERE a.client_id = $1
        ORDER BY a.appointment_date DESC, a.start_time DESC
      `;
      queryParams = [req.user.id];
    } else {
      // Staff and admin can see all appointments
      appointmentQuery = `
        SELECT a.*, at.name as appointment_type_name, at.duration_minutes,
               uc.first_name as client_first_name, uc.last_name as client_last_name,
               us.first_name as staff_first_name, us.last_name as staff_last_name
        FROM appointments a
        LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
        LEFT JOIN users uc ON a.client_id = uc.id
        LEFT JOIN users us ON a.staff_id = us.id
        ORDER BY a.appointment_date DESC, a.start_time DESC
      `;
      queryParams = [];
    }

    const result = await query(appointmentQuery, queryParams);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      appointments: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get available appointment slots for a service
// @route   GET /api/appointments/available
// @access  Public
router.get('/available', async (req, res, next) => {
  try {
    const { service_id, start_date, end_date } = req.query;

    if (!service_id) {
      return res.status(400).json({
        success: false,
        error: 'service_id is required'
      });
    }

    // Get available slots for the service
    let slotsQuery = `
      SELECT av_slots.*, 
             u.first_name as staff_first_name,
             u.last_name as staff_last_name,
             at.name as appointment_type_name,
             at.duration_minutes,
             at.color
      FROM available_slots av_slots
      LEFT JOIN users u ON av_slots.staff_id = u.id
      LEFT JOIN appointment_types at ON av_slots.appointment_type_id = at.id
      WHERE av_slots.appointment_type_id = $1
      AND av_slots.is_active = true
      AND u.is_active = true
    `;
    
    const queryParams = [service_id];
    
    const slotsResult = await query(slotsQuery, queryParams);
    
    if (slotsResult.rows.length === 0) {
      return res.status(200).json({
        success: true,
        slots: [],
        message: 'No available slots for this service'
      });
    }

    // Generate future dates with available slots
    const today = new Date();
    const slots = [];
    const daysToShow = 30; // Show 30 days of availability

    for (let i = 0; i < daysToShow; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dayOfWeek = date.getDay();
      const dateStr = date.toISOString().split('T')[0];

      // Find slots for this day
      const daySlots = slotsResult.rows.filter(slot => {
        return (slot.is_recurring && slot.day_of_week === dayOfWeek) ||
               (slot.specific_date === dateStr);
      });

      if (daySlots.length > 0) {
        slots.push({
          date: dateStr,
          day_of_week: dayOfWeek,
          day_name: date.toLocaleDateString('en-US', { weekday: 'long' }),
          slots: daySlots
        });
      }
    }

    res.status(200).json({
      success: true,
      count: slots.length,
      availableSlots: slots
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Create new appointment request
// @route   POST /api/appointments
// @access  Private
router.post('/', protect, async (req, res, next) => {
  try {
    const { appointment_type_id, staff_id, appointment_date, start_time, end_time, notes } = req.body;
    
    // Validate required fields
    if (!appointment_type_id || !appointment_date || !start_time || !end_time) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: appointment_type_id, appointment_date, start_time, end_time'
      });
    }

    // Only clients can book appointments
    if (req.user.role !== 'client') {
      return res.status(403).json({
        success: false,
        error: 'Only clients can book appointments'
      });
    }

    // Check if appointment slot is available (no conflicts)
    const conflictQuery = `
      SELECT id FROM appointments
      WHERE appointment_date = $1
      AND start_time < $3
      AND end_time > $2
      AND status NOT IN ('cancelled', 'declined')
      LIMIT 1
    `;

    const conflictResult = await query(conflictQuery, [
      appointment_date,
      start_time,
      end_time
    ]);

    if (conflictResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'This time slot is no longer available'
      });
    }

    // Create the appointment
    const createQuery = `
      INSERT INTO appointments (
        client_id, 
        staff_id,
        appointment_type_id,
        appointment_date,
        start_time,
        end_time,
        client_notes,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, client_id, appointment_type_id, appointment_date, start_time, end_time, status, created_at
    `;

    const appointmentResult = await query(createQuery, [
      req.user.id,
      staff_id || null,
      appointment_type_id,
      appointment_date,
      start_time,
      end_time,
      notes || null,
      'pending'
    ]);

    const appointment = appointmentResult.rows[0];

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully. It is pending staff approval.',
      appointment: {
        id: appointment.id,
        appointmentDate: appointment.appointment_date,
        startTime: appointment.start_time,
        endTime: appointment.end_time,
        status: appointment.status,
        createdAt: appointment.created_at
      }
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Update appointment (approve/decline for admin, edit for client)
// @route   PUT /api/appointments/:id
// @access  Private
router.put('/:id', protect, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, staff_notes, reason_for_decline, notes } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'status is required'
      });
    }

    const validStatuses = ['pending', 'approved', 'declined', 'completed', 'cancelled', 'no_show'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const existingResult = await query(
      `SELECT a.*, uc.first_name as client_first_name, uc.last_name as client_last_name
       FROM appointments a
       LEFT JOIN users uc ON a.client_id = uc.id
       WHERE a.id = $1`,
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    const appointment = existingResult.rows[0];
    const isClientOwner = req.user.role === 'client' && appointment.client_id === req.user.id;
    const isStaff = req.user.role === 'staff' || req.user.role === 'admin';

    if (!isClientOwner && !isStaff) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this appointment'
      });
    }

    if (isClientOwner) {
      if (status !== 'cancelled') {
        return res.status(403).json({
          success: false,
          error: 'Clients can only cancel appointments'
        });
      }

      if (!['pending', 'approved'].includes(appointment.status)) {
        return res.status(409).json({
          success: false,
          error: 'Only pending or approved appointments can be cancelled'
        });
      }
    }

    if (isStaff) {
      const staffAllowedStatuses = ['approved', 'declined', 'completed', 'cancelled', 'no_show', 'pending'];
      if (!staffAllowedStatuses.includes(status)) {
        return res.status(403).json({
          success: false,
          error: 'Staff/admin status update is not permitted'
        });
      }
    }

    const updateResult = await query(
      `UPDATE appointments
       SET status = $1,
           staff_notes = COALESCE($2, staff_notes),
           reason_for_decline = CASE WHEN $1 = 'declined' THEN $3 ELSE reason_for_decline END,
           notes = COALESCE($4, notes),
           approved_at = CASE WHEN $1 = 'approved' THEN CURRENT_TIMESTAMP ELSE approved_at END,
           approved_by = CASE WHEN $1 = 'approved' THEN $5 ELSE approved_by END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING id, client_id, staff_id, appointment_type_id, appointment_date, start_time, end_time, status, client_notes, staff_notes, reason_for_decline, updated_at`,
      [
        status,
        staff_notes || null,
        reason_for_decline || null,
        notes || null,
        isStaff ? req.user.id : null,
        id
      ]
    );

    res.status(200).json({
      success: true,
      message: 'Appointment updated successfully',
      appointment: updateResult.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete/Cancel appointment
// @route   DELETE /api/appointments/:id
// @access  Private
router.delete('/:id', protect, async (req, res, next) => {
  try {
    // Implementation will be added later
    res.status(200).json({
      success: true,
      message: 'Delete appointment endpoint - to be implemented'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;