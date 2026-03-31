const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { supabase, query, getClient } = require('../config/database');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// Send token response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = generateToken(user.id);

  const options = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  // Remove password from output (if exists)
  const { password_hash, ...userWithoutPassword } = user;

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      user: userWithoutPassword
    });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('role')
    .optional()
    .isIn(['client', 'staff', 'admin'])
    .withMessage('Invalid role')
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

    const { email, password, firstName, lastName, phone, role = 'client' } = req.body;

    // Check if user already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    
    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Start transaction
    const client = await getClient();
    
    try {
      await client.query('BEGIN');

      // Create user
      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, phone, role) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING id, email, first_name, last_name, phone, role, created_at`,
        [email, passwordHash, firstName, lastName, phone, role]
      );

      const user = userResult.rows[0];

      // Create profile based on role
      if (role === 'client') {
        await client.query(
          'INSERT INTO client_profiles (user_id) VALUES ($1)',
          [user.id]
        );
      } else if (role === 'staff' || role === 'admin') {
        const isAdmin = role === 'admin';
        await client.query(
          'INSERT INTO staff_profiles (user_id, is_admin) VALUES ($1, $2)',
          [user.id, isAdmin]
        );
      }

      await client.query('COMMIT');
      
      sendTokenResponse(user, 201, res);

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

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Please provide a password')
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

    const { email, password } = req.body;

    // Authenticate using Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError || !authData.user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Resolve app profile from users table
    const { data: userProfile, error: userProfileError } = await supabase
      .from('users')
      .select('id, email, name, role, is_active, created_at')
      .eq('id', authData.user.id)
      .maybeSingle();

    const metadataRole = authData.user.app_metadata?.role || authData.user.user_metadata?.role;

    const user = {
      id: authData.user.id,
      email: authData.user.email,
      name: userProfile?.name || authData.user.user_metadata?.name || authData.user.email.split('@')[0],
      role: userProfile?.role || metadataRole || 'client',
      is_active: userProfile?.is_active ?? true,
      created_at: userProfile?.created_at || authData.user.created_at,
      last_login: new Date().toISOString()
    };

    if (userProfileError) {
      console.warn('Could not load user role from users table:', userProfileError.message);
    }

    console.log(`Login for ${user.email} - role: ${user.role}`);

    // Try to update last login in users table (optional, don't fail if it doesn't work due to RLS)
    try {
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id);
    } catch (e) {
      // Silently fail if RLS blocks this
      console.log('Could not update last login (RLS):', e.message);
    }

    sendTokenResponse(user, 200, res);

  } catch (error) {
    next(error);
  }
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res, next) => {
  try {
    // Get base user profile
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();
    
    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const { password_hash, ...userWithoutPassword } = data;

    res.status(200).json({
      success: true,
      user: userWithoutPassword
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Create user profile in Supabase
// @route   POST /api/auth/create-profile
// @access  Public (uses Supabase JWT)
router.post('/create-profile', async (req, res, next) => {
  try {
    const { userId, email, name, phone, role = 'client' } = req.body;
    
    // Validate input
    if (!userId || !email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId and email'
      });
    }

    // Initialize Supabase admin client
    const { createClient } = require('@supabase/supabase-js');
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Check if user profile already exists
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User profile already exists'
      });
    }

    // Create user profile
    const { data: newUser, error: createError } = await supabaseAdmin
      .from('users')
      .insert([{
        id: userId,
        email,
        name: name || email,
        phone: phone || null,
        role,
        is_active: true
      }])
      .select()
      .single();

    if (createError) {
      console.error('Supabase error creating profile:', createError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create user profile',
        details: createError.message
      });
    }

    res.status(201).json({
      success: true,
      message: 'User profile created successfully',
      user: newUser
    });

  } catch (error) {
    console.error('Profile creation error:', error);
    next(error);
  }
});

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', protect, (req, res) => {
  res
    .status(200)
    .cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true
    })
    .json({
      success: true,
      message: 'User logged out successfully'
    });
});

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
router.put('/updatepassword', protect, [
  body('currentPassword')
    .notEmpty()
    .withMessage('Please provide current password'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
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

    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const result = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );

    const user = result.rows[0];

    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newPasswordHash, req.user.id]
    );

    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;