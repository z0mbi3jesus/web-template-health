const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import database connection
const { pool } = require('./config/database');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { notFound } = require('./middleware/notFound');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const appointmentRoutes = require('./routes/appointments');
const calendarRoutes = require('./routes/calendar');
const timeslotRoutes = require('./routes/timeslots');
const videoVisitsRoutes = require('./routes/video-visits');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy (important for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com", "cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "fonts.gstatic.com", "cdnjs.cloudflare.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
const isDevelopment = process.env.NODE_ENV !== 'production';
const allowedOrigins = new Set([
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001'
].filter(Boolean));

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no Origin header (Render health checks, curl, server-to-server).
    if (!origin) {
      return callback(null, true);
    }

    let hostname;
    try {
      hostname = new URL(origin).hostname;
    } catch {
      return callback(new Error('Invalid origin'));
    }

    if (isDevelopment && (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1')) {
      return callback(null, true);
    }

    if (allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    // Allow this app's Vercel domains (production and preview URLs).
    if (hostname === 'web-template-health.vercel.app' || hostname === 'web-template-health-w27t.vercel.app') {
      return callback(null, true);
    }

    if (hostname.endsWith('.vercel.app') && hostname.startsWith('web-template-health-')) {
      return callback(null, true);
    }

    console.log(`CORS blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true, // Allow cookies to be sent
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('combined'));
}

// Apply rate limiting to all requests
app.use(limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// API status endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Health Calendar API is running',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      appointments: '/api/appointments',
      calendar: '/api/calendar',
      timeslots: '/api/timeslots'
    }
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/timeslots', timeslotRoutes);
app.use('/api/video-visits', videoVisitsRoutes);

// Serve static files from frontend in production
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  app.use(express.static(path.join(__dirname, '../frontend')));
  
  app.get('/{*any}', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
  });
}

// Error handling middleware (must be last)
app.use(notFound);
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  console.log(`
Health Calendar API Server is running!
Environment: ${process.env.NODE_ENV}
Port: ${PORT}
Database: PostgreSQL (${process.env.DB_NAME})
CORS enabled for: ${process.env.FRONTEND_URL}
⏰ Started at: ${new Date().toISOString()}

Available endpoints:
  GET  /health              - Health check
  GET  /api                - API status
  POST /api/auth/register  - User registration
  POST /api/auth/login     - User login
  GET  /api/calendar       - Calendar data
  
Documentation: http://localhost:${PORT}/api
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error('❌ Unhandled Promise Rejection:', err.message);
  server.close(() => {
    process.exit(1);
  });
});

module.exports = app;