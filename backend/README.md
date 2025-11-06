# Health Calendar Backend Setup

## Prerequisites

1. **Node.js** (v16 or higher)
2. **PostgreSQL** (v12 or higher)
3. **npm** (comes with Node.js)

## Setup Instructions

### 1. Install PostgreSQL

**Windows:**
- Download from https://www.postgresql.org/download/windows/
- Run installer and note the password you set for the `postgres` user
- Default port is 5432

**Alternative - Docker:**
```bash
docker run --name postgres-health -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:13
```

### 2. Create Database

Connect to PostgreSQL and create the database:

```sql
CREATE DATABASE health_calendar;
```

Or using command line:
```bash
createdb -U postgres health_calendar
```

### 3. Install Dependencies

```bash
cd backend
npm install
```

### 4. Configure Environment

1. Copy `.env.example` to `.env`:
```bash
copy .env.example .env
```

2. Update `.env` with your PostgreSQL credentials:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=health_calendar
DB_USER=postgres
DB_PASSWORD=your_actual_password
```

### 5. Run Database Migration

```bash
npm run db:migrate
```

This will create all necessary tables and indexes.

### 6. Start the Server

**Development mode (with auto-restart):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

### 7. Test the API

The server will start on http://localhost:3001

Test endpoints:
- `GET http://localhost:3001/health` - Health check
- `GET http://localhost:3001/api` - API status
- `POST http://localhost:3001/api/auth/register` - User registration

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user
- `PUT /api/auth/updatepassword` - Update password

### Users
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile

### Appointments
- `GET /api/appointments` - Get user appointments
- `POST /api/appointments` - Create appointment request
- `PUT /api/appointments/:id` - Update appointment
- `DELETE /api/appointments/:id` - Cancel appointment

### Calendar
- `GET /api/calendar` - Get calendar data
- `GET /api/calendar/slots` - Get available slots
- `GET /api/calendar/types` - Get appointment types

## Database Schema

The system includes these main tables:
- `users` - All system users (clients, staff, admin)
- `client_profiles` - Additional client information
- `staff_profiles` - Additional staff information
- `appointments` - Scheduled appointments
- `appointment_types` - Types of services offered
- `available_slots` - When appointments can be scheduled
- `notifications` - System notifications

## Security Features

- **Password hashing** with bcrypt (12 rounds)
- **JWT authentication** with secure cookies
- **Rate limiting** (100 requests per 15 minutes)
- **Input validation** with express-validator
- **SQL injection protection** with parameterized queries
- **CORS protection** 
- **Helmet.js security headers**

## Development

**File structure:**
```
backend/
├── server.js              # Main server file
├── config/
│   └── database.js        # Database configuration
├── database/
│   ├── schema.sql         # Database schema
│   └── migrate.js         # Migration script
├── middleware/
│   ├── auth.js           # Authentication middleware
│   ├── errorHandler.js   # Error handling
│   └── notFound.js       # 404 handler
├── routes/
│   ├── auth.js           # Authentication routes
│   ├── users.js          # User management
│   ├── appointments.js   # Appointment management
│   └── calendar.js       # Calendar functionality
└── package.json
```

## Troubleshooting

**Database connection issues:**
- Check PostgreSQL is running: `pg_ctl status`
- Verify credentials in `.env` file
- Ensure database exists: `psql -U postgres -l`

**Port conflicts:**
- Change PORT in `.env` file if 3001 is in use

**Permission errors:**
- Ensure PostgreSQL user has CREATE privileges
- Check file permissions on project directory

## Next Steps

This is the authentication foundation. Next we'll add:
1. Time slot configuration
2. Appointment types/services  
3. Notification system
4. Calendar UI integration