const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const { query: dbQuery, getClient } = require('../config/database');
const { protect, isAdmin } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all available time slots
// @route   GET /api/timeslots
// @access  Private (Admin/Staff)
router.get('/', protect, async (req, res, next) => {
  try {
    const { staff_id, date, day_of_week, appointment_type_id } = req.query;
    
    let queryText = `
      SELECT av_slots.*, 
             u.first_name as staff_first_name, 
             u.last_name as staff_last_name,
             at.name as appointment_type_name,
             at.duration_minutes
      FROM available_slots as av_slots
      LEFT JOIN users u ON av_slots.staff_id = u.id
      LEFT JOIN appointment_types at ON av_slots.appointment_type_id = at.id
      WHERE av_slots.is_active = true
    `;
    
    const queryParams = [];
    let paramCount = 0;

    // Add filters based on query parameters
    if (staff_id) {
      queryText += ` AND av_slots.staff_id = $${++paramCount}`;
      queryParams.push(staff_id);
    }

    if (appointment_type_id) {
      queryText += ` AND av_slots.appointment_type_id = $${++paramCount}`;
      queryParams.push(appointment_type_id);
    }

    if (day_of_week !== undefined) {
      queryText += ` AND av_slots.day_of_week = $${++paramCount}`;
      queryParams.push(parseInt(day_of_week));
    }

    if (date) {
      queryText += ` AND (av_slots.specific_date = $${++paramCount} OR av_slots.specific_date IS NULL)`;
      queryParams.push(date);
    }

    queryText += ' ORDER BY av_slots.day_of_week, av_slots.start_time';

    const result = await dbQuery(queryText, queryParams);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      timeSlots: result.rows
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Create new time slot
// @route   POST /api/timeslots
// @access  Private (Admin only)
router.post('/', protect, isAdmin, [
  body('staff_id')
    .isUUID()
    .withMessage('Valid staff ID is required'),
  body('appointment_type_id')
    .isUUID()
    .withMessage('Valid appointment type ID is required'),
  body('start_time')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Start time must be in HH:MM format'),
  body('end_time')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('End time must be in HH:MM format'),
  body('day_of_week')
    .optional()
    .isInt({ min: 0, max: 6 })
    .withMessage('Day of week must be 0-6 (Sunday=0)'),
  body('specific_date')
    .optional()
    .isISO8601()
    .withMessage('Specific date must be in YYYY-MM-DD format'),
  body('is_recurring')
    .isBoolean()
    .withMessage('Is recurring must be true or false')
], async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const {
      staff_id,
      appointment_type_id,
      start_time,
      end_time,
      day_of_week,
      specific_date,
      is_recurring
    } = req.body;

    // Validate that end_time is after start_time
    const startMinutes = timeToMinutes(start_time);
    const endMinutes = timeToMinutes(end_time);
    
    if (endMinutes <= startMinutes) {
      return res.status(400).json({
        success: false,
        error: 'End time must be after start time'
      });
    }

    // Validate that staff exists and has the right role
    const staffResult = await dbQuery(
      'SELECT id, role FROM users WHERE id = $1 AND (role = $2 OR role = $3) AND is_active = true',
      [staff_id, 'staff', 'admin']
    );

    if (staffResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found or invalid'
      });
    }

    // Validate appointment type exists
    const appointmentTypeResult = await dbQuery(
      'SELECT id FROM appointment_types WHERE id = $1 AND is_active = true',
      [appointment_type_id]
    );

    if (appointmentTypeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Appointment type not found or inactive'
      });
    }

    // Check for overlapping slots
    const overlapCheck = await checkForOverlaps(
      staff_id, 
      start_time, 
      end_time, 
      day_of_week, 
      specific_date,
      null // no existing slot ID to exclude
    );

    if (overlapCheck.hasOverlap) {
      return res.status(409).json({
        success: false,
        error: 'Time slot overlaps with existing availability',
        conflictingSlot: overlapCheck.conflictingSlot
      });
    }

    // Create the time slot
    const result = await dbQuery(
      `INSERT INTO available_slots 
       (staff_id, appointment_type_id, start_time, end_time, day_of_week, specific_date, is_recurring) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [staff_id, appointment_type_id, start_time, end_time, day_of_week, specific_date, is_recurring]
    );

    const timeSlot = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'Time slot created successfully',
      timeSlot
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Update time slot
// @route   PUT /api/timeslots/:id
// @access  Private (Admin only)
router.put('/:id', protect, isAdmin, [
  param('id').isUUID().withMessage('Valid slot ID is required'),
  body('start_time')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Start time must be in HH:MM format'),
  body('end_time')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('End time must be in HH:MM format'),
  body('day_of_week')
    .optional()
    .isInt({ min: 0, max: 6 })
    .withMessage('Day of week must be 0-6 (Sunday=0)'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('Is active must be true or false')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const updates = req.body;

    // Check if slot exists
    const existingSlot = await dbQuery(
      'SELECT * FROM available_slots WHERE id = $1',
      [id]
    );

    if (existingSlot.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Time slot not found'
      });
    }

    const currentSlot = existingSlot.rows[0];

    // Validate time updates if provided
    if (updates.start_time || updates.end_time) {
      const startTime = updates.start_time || currentSlot.start_time;
      const endTime = updates.end_time || currentSlot.end_time;
      
      const startMinutes = timeToMinutes(startTime);
      const endMinutes = timeToMinutes(endTime);
      
      if (endMinutes <= startMinutes) {
        return res.status(400).json({
          success: false,
          error: 'End time must be after start time'
        });
      }

      // Check for overlapping slots (excluding current slot)
      const overlapCheck = await checkForOverlaps(
        currentSlot.staff_id,
        startTime,
        endTime,
        updates.day_of_week || currentSlot.day_of_week,
        currentSlot.specific_date,
        id // exclude current slot from overlap check
      );

      if (overlapCheck.hasOverlap) {
        return res.status(409).json({
          success: false,
          error: 'Updated time slot would overlap with existing availability',
          conflictingSlot: overlapCheck.conflictingSlot
        });
      }
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    let paramCount = 0;

    Object.keys(updates).forEach(key => {
      if (['start_time', 'end_time', 'day_of_week', 'is_active', 'is_recurring'].includes(key)) {
        updateFields.push(`${key} = $${++paramCount}`);
        updateValues.push(updates[key]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    updateValues.push(id); // Add ID for WHERE clause
    const updateQuery = `
      UPDATE available_slots 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${++paramCount}
      RETURNING *
    `;

    const result = await dbQuery(updateQuery, updateValues);

    res.status(200).json({
      success: true,
      message: 'Time slot updated successfully',
      timeSlot: result.rows[0]
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Delete time slot
// @route   DELETE /api/timeslots/:id
// @access  Private (Admin only)
router.delete('/:id', protect, isAdmin, [
  param('id').isUUID().withMessage('Valid slot ID is required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;

    // Check if there are any pending or approved appointments for this slot
    const appointmentCheck = await dbQuery(
      `SELECT COUNT(*) as count FROM appointments 
       WHERE staff_id = (SELECT staff_id FROM available_slots WHERE id = $1)
       AND appointment_date >= CURRENT_DATE
       AND status IN ('pending', 'approved')`,
      [id]
    );

    if (parseInt(appointmentCheck.rows[0].count) > 0) {
      return res.status(409).json({
        success: false,
        error: 'Cannot delete time slot with existing future appointments. Please cancel appointments first.'
      });
    }

    // Soft delete the time slot
    const result = await dbQuery(
      'UPDATE available_slots SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Time slot not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Time slot deactivated successfully'
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get weekly schedule template for a staff member
// @route   GET /api/timeslots/schedule/:staff_id
// @access  Private (Admin/Staff)
router.get('/schedule/:staff_id', protect, [
  param('staff_id').isUUID().withMessage('Valid staff ID is required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { staff_id } = req.params;

    // Get all recurring slots for this staff member
    const result = await dbQuery(
      `SELECT av_slots.*, at.name as appointment_type_name, at.duration_minutes, at.color
       FROM available_slots as av_slots
       LEFT JOIN appointment_types at ON av_slots.appointment_type_id = at.id
       WHERE av_slots.staff_id = $1 
       AND av_slots.is_recurring = true 
       AND av_slots.is_active = true
       ORDER BY av_slots.day_of_week, av_slots.start_time`,
      [staff_id]
    );

    // Group by day of week
    const schedule = {
      0: [], // Sunday
      1: [], // Monday
      2: [], // Tuesday
      3: [], // Wednesday
      4: [], // Thursday
      5: [], // Friday
      6: []  // Saturday
    };

    result.rows.forEach(slot => {
      if (slot.day_of_week !== null) {
        schedule[slot.day_of_week].push(slot);
      }
    });

    res.status(200).json({
      success: true,
      staff_id,
      schedule
    });

  } catch (error) {
    next(error);
  }
});

// Helper functions
function timeToMinutes(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

async function checkForOverlaps(staff_id, start_time, end_time, day_of_week, specific_date, excludeSlotId) {
  let queryText = `
    SELECT * FROM available_slots 
    WHERE staff_id = $1 
    AND is_active = true
    AND (
      (start_time < $3 AND end_time > $2)
    )
  `;
  
  const queryParams = [staff_id, start_time, end_time];
  let paramCount = 3;

  if (day_of_week !== null && day_of_week !== undefined) {
    queryText += ` AND day_of_week = $${++paramCount}`;
    queryParams.push(day_of_week);
  }

  if (specific_date) {
    queryText += ` AND specific_date = $${++paramCount}`;
    queryParams.push(specific_date);
  }

  if (excludeSlotId) {
    queryText += ` AND id != $${++paramCount}`;
    queryParams.push(excludeSlotId);
  }

  const result = await dbQuery(queryText, queryParams);
  
  return {
    hasOverlap: result.rows.length > 0,
    conflictingSlot: result.rows[0] || null
  };
}

// GET /api/timeslots/appointment-types - Get all appointment types
router.get('/appointment-types', protect, async (req, res, next) => {
  try {
    const result = await dbQuery(
      'SELECT * FROM appointment_types WHERE is_active = true ORDER BY name'
    );

    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/timeslots/staff - Get all staff members
router.get('/staff', protect, async (req, res, next) => {
  try {
    const result = await dbQuery(`
      SELECT u.id, u.first_name, u.last_name, u.email,
             sp.department, sp.specialization, sp.is_admin
      FROM users u
      LEFT JOIN staff_profiles sp ON u.id = sp.user_id
      WHERE u.role IN ('staff', 'admin') AND u.is_active = true
      ORDER BY u.first_name, u.last_name
    `);

    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/timeslots/staff/:id/slots - Get time slots for specific staff member  
router.get('/staff/:id/slots', protect, [
  param('id').isUUID().withMessage('Invalid staff ID format')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;

    const result = await dbQuery(`
      SELECT av_slots.*, 
             u.first_name || ' ' || u.last_name as staff_name,
             at.name as appointment_type_name,
             at.duration_minutes,
             av_slots.is_recurring as recurring
      FROM available_slots av_slots
      LEFT JOIN users u ON av_slots.staff_id = u.id
      LEFT JOIN appointment_types at ON av_slots.appointment_type_id = at.id
      WHERE av_slots.staff_id = $1 AND av_slots.is_active = true
      ORDER BY av_slots.day_of_week, av_slots.start_time
    `, [id]);

    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// POST /api/timeslots/weekly-schedule - Create weekly recurring schedule
router.post('/weekly-schedule', protect, [
  body('staff_id').isUUID().withMessage('Invalid staff ID'),
  body('appointment_type_id').isUUID().withMessage('Invalid appointment type ID'),
  body('start_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid start time format (HH:MM)'),
  body('end_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid end time format (HH:MM)'),
  body('days').isArray({ min: 1, max: 7 }).withMessage('Days must be an array with 1-7 elements'),
  body('days.*').isInt({ min: 0, max: 6 }).withMessage('Day values must be integers 0-6 (Sunday=0)')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { staff_id, appointment_type_id, start_time, end_time, days } = req.body;

    // Verify staff member exists
    const staffCheck = await dbQuery(
      'SELECT id, role FROM users WHERE id = $1 AND (role = $2 OR role = $3) AND is_active = true',
      [staff_id, 'staff', 'admin']
    );

    if (staffCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    // Verify appointment type exists
    const appointmentTypeCheck = await dbQuery(
      'SELECT id FROM appointment_types WHERE id = $1 AND is_active = true',
      [appointment_type_id]
    );

    if (appointmentTypeCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Appointment type not found'
      });
    }

    // Validate time range
    if (start_time >= end_time) {
      return res.status(400).json({
        success: false,
        message: 'End time must be after start time'
      });
    }

    const client = await getClient();
    let createdCount = 0;
    let skippedCount = 0;
    const conflicts = [];

    try {
      await client.query('BEGIN');

      for (const dayOfWeek of days) {
        // Check for existing overlapping slots
        const overlapCheck = await checkForOverlaps(
          staff_id, 
          start_time, 
          end_time,
          dayOfWeek, 
          null, // specific_date
          null  // excludeSlotId
        );

        if (overlapCheck.hasOverlap) {
          skippedCount++;
          conflicts.push({
            dayOfWeek,
            conflict: overlapCheck.conflictingSlot
          });
          continue;
        }

        // Create the time slot
        await client.query(
          `INSERT INTO available_slots 
           (staff_id, appointment_type_id, day_of_week, start_time, end_time, is_recurring, is_active) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [staff_id, appointment_type_id, dayOfWeek, start_time, end_time, true, true]
        );

        createdCount++;
      }

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        message: `Weekly schedule created successfully`,
        created: createdCount,
        skipped: skippedCount,
        total: days.length,
        conflicts: conflicts.length > 0 ? conflicts : undefined
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    next(error);
  }
});

module.exports = router;