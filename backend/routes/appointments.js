const express = require('express');
const { protect, authorize, isAdmin } = require('../middleware/auth');
const { query } = require('../config/database');

const router = express.Router();

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

// @desc    Create new appointment request
// @route   POST /api/appointments
// @access  Private
router.post('/', protect, async (req, res, next) => {
  try {
    // Implementation will be added later with full calendar functionality
    res.status(200).json({
      success: true,
      message: 'Create appointment endpoint - to be implemented'
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
    // Implementation will be added later
    res.status(200).json({
      success: true,
      message: 'Update appointment endpoint - to be implemented'
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