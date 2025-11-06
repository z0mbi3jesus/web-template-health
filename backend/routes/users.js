const express = require('express');
const { protect, authorize, isAdmin } = require('../middleware/auth');
const { query } = require('../config/database');

const router = express.Router();

// @desc    Get all users (admin only)
// @route   GET /api/users
// @access  Private/Admin
router.get('/', protect, isAdmin, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.role, 
             u.is_active, u.created_at, u.last_login
      FROM users u
      ORDER BY u.created_at DESC
    `);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      users: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
router.get('/profile', protect, async (req, res, next) => {
  try {
    // This will be the same as /auth/me but keeping separate for clarity
    res.redirect('/api/auth/me');
  } catch (error) {
    next(error);
  }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
router.put('/profile', protect, async (req, res, next) => {
  try {
    // Implementation will be added later
    res.status(200).json({
      success: true,
      message: 'Profile update endpoint - to be implemented'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;