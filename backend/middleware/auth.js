const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const { query } = require('../config/database');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false, autoRefreshToken: false } });

// Protect routes - require valid JWT token (Supabase or local)
const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Check for token in cookies
    else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    // Make sure token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this route'
      });
    }

    try {
      // Try to verify as Supabase JWT first
      const { data: { user }, error: supabaseError } = await supabase.auth.getUser(token);
      
      if (supabaseError || !user) {
        // If not a valid Supabase token, try local JWT verification as fallback
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { data: profile, error: profileError } = await supabase.from('users').select('id, email, name, role, is_active').eq('id', decoded.id).single();
        if (profileError || !profile || !profile.is_active || !['client','staff','admin'].includes(profile.role)) {
          return res.status(401).json({ success: false, error: 'Active user profile required' });
        }
        req.user = profile;
      } else {
        // Get user profile from Supabase users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, email, name, role, is_active')
          .eq('id', user.id)
          .single();

        if (userError || !userData) {
          return res.status(401).json({ success: false, error: 'User profile unavailable' });
        }

        // Check if user is active
        if (!userData.is_active || !['client', 'staff', 'admin'].includes(userData.role)) {
          return res.status(401).json({
            success: false,
            error: 'User account is deactivated'
          });
        }

        // Attach user to request
        req.user = {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          role: userData.role
        };
      }

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Token is not valid',
        details: error.message
      });
    }
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Authorization failed',
      details: error.message
    });
  }
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `User role '${req.user.role}' is not authorized to access this route`
      });
    }
    next();
  };
};

// Check if user is admin (staff with admin privileges)
const isAdmin = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({
        success: false,
        error: 'Access denied - Admin privileges required'
      });
    }

    // For staff users, check if they have admin privileges
    if (req.user.role === 'staff') {
      const result = await query(
        'SELECT is_admin FROM staff_profiles WHERE user_id = $1',
        [req.user.id]
      );

      if (result.rows.length === 0 || !result.rows[0].is_admin) {
        return res.status(403).json({
          success: false,
          error: 'Access denied - Admin privileges required'
        });
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.token) {
      token = req.cookies.token;
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const result = await query(
          'SELECT id, email, first_name, last_name, role, is_active FROM users WHERE id = $1',
          [decoded.id]
        );

        if (result.rows.length > 0 && result.rows[0].is_active) {
          req.user = result.rows[0];
        }
      } catch (error) {
        // Token invalid, but continue without user
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

function requireAuth(roles = []) {
  return (req, res, next) => protect(req, res, () => roles.length ? authorize(...roles)(req, res, next) : next());
}

module.exports = {
  requireAuth,
  protect,
  authorize,
  isAdmin,
  optionalAuth
};