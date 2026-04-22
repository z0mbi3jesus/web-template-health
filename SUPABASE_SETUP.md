# Healthcare Appointment System - Supabase Setup Guide

This guide will walk you through setting up Supabase as the backend for your healthcare appointment management system.

## Prerequisites

- A Supabase account (free tier available)
- Node.js 16+ installed
- Basic understanding of SQL

## Step 1: Create Supabase Project

1. **Go to [Supabase](https://supabase.com)** and sign in/sign up
2. **Click "New Project"**
3. **Fill in project details:**
   - Project name: `healthcare-appointments`
   - Database password: Choose a strong password (save this!)
   - Region: Choose closest to your users
   - Pricing plan: Start with Free tier

4. **Wait for project creation** (2-3 minutes)

## Step 2: Configure Database Schema

1. **Go to the SQL Editor** in your Supabase dashboard
2. **Copy the entire contents** of `database/schema.sql`
3. **Paste and execute** the SQL script
4. **Verify tables were created** by checking the Table Editor

The schema creates:
- Users table (extends Supabase auth)
- Appointment types
- Available slots
- Appointments
- Notifications
- Audit logging
- Row Level Security (RLS) policies
- Database functions for booking logic

## Step 3: Get API Keys

1. **Go to Settings > API** in your Supabase dashboard
2. **Copy the following values:**
   - Project URL: `https://your-project-id.supabase.co`
   - `anon` key (public key)
   - `service_role` key (private key - keep secret!)

## Step 4: Configure Environment Variables

1. **Copy `.env.example` to `.env`:**
   ```bash
   cp .env.example .env
   ```

2. **Update `.env` with your Supabase credentials:**
   ```env
   # Supabase Configuration
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

   # JWT Configuration  
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRES_IN=7d

   # Application Configuration
   NODE_ENV=development
   PORT=3001
   FRONTEND_URL=http://localhost:8081
   ```

## Step 5: Install Dependencies

```bash
npm install
```

This installs:
- `@supabase/supabase-js` - Supabase client
- `express` - Web server
- `cors` - Cross-origin requests
- `helmet` - Security headers
- `dotenv` - Environment variables
- Additional security and validation packages

## Step 6: Start the Application

1. **Start the Supabase-powered backend:**
   ```bash
   npm run dev
   # or
   node server-supabase.js
   ```

2. **Start the frontend (separate terminal):**
   ```bash
   npm run frontend
   # or 
   python -m http.server 8081
   ```

3. **Verify everything works:**
   - Backend: http://localhost:3001/health
   - Frontend: http://localhost:8081

## Step 7: Configure Authentication

### Frontend Integration

The frontend forms (`index.html`) are already configured to work with Supabase auth. The signup/signin modals will:

1. **Registration:** Creates user in Supabase Auth + custom profile
2. **Login:** Authenticates via Supabase and returns JWT token
3. **Role-based routing:** Redirects based on user role

### User Roles

- **Client:** Default role for new registrations
- **Staff:** Can manage appointments and time slots
- **Admin:** Full system access

To promote users to staff/admin:
1. Go to Supabase dashboard > Table Editor > users
2. Find the user and edit their `role` field

## Step 8: Database Features

### Row Level Security (RLS)
- Users can only see their own data
- Staff can manage their appointments
- Admins have full access
- Public can view available appointment types

### Business Logic Functions
- `is_slot_available()` - Check if time slot can be booked
- `book_slot()` - Safely book a time slot
- `cancel_booking()` - Cancel and free up slot

### Audit Logging
- All changes to important tables are logged
- Includes user ID, operation type, and data changes
- Viewable by admins for compliance

## Step 9: Migration from Local PostgreSQL

If you have existing data, you can migrate:

1. **Export data from local PostgreSQL:**
   ```bash
   pg_dump your_local_db > backup.sql
   ```

2. **Import to Supabase:**
   - Use the SQL Editor to run data imports
   - Or use the CSV import feature in Table Editor

## Step 10: Production Deployment

### Backend Deployment Options:
- **Vercel:** Deploy `server-supabase.js` as serverless functions
- **Railway:** Easy Node.js deployment
- **Heroku:** Traditional hosting
- **AWS/Google Cloud:** Enterprise solutions

### Environment Variables for Production:
```env
NODE_ENV=production
SUPABASE_URL=your_production_supabase_url
SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_key
FRONTEND_URL=https://your-domain.com
```

## Step 11: Scaling and Monitoring

### Supabase Features:
- **Real-time:** Enable for live appointment updates
- **Edge Functions:** For complex business logic
- **Storage:** For file uploads (documents, images)
- **Analytics:** Built-in usage metrics

### Monitoring:
- **Supabase Dashboard:** Query performance, auth metrics
- **Logs:** Real-time application logs
- **Alerts:** Set up notifications for errors

## Troubleshooting

### Common Issues:

1. **RLS Policy Errors:**
   - Check if user is authenticated
   - Verify user role in database
   - Review policy conditions

2. **Authentication Failures:**
   - Verify API keys are correct
   - Check CORS settings
   - Ensure JWT secret is set

3. **Database Connection Issues:**
   - Verify Supabase URL format
   - Check network connectivity
   - Review error logs

### Debug Commands:
```bash
# Check health endpoint
curl http://localhost:3001/health

# Test authentication
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## Next Steps

After Supabase setup:
1. Test user registration and login
2. Create appointment types via admin panel
3. Add time slots for staff
4. Test appointment booking flow
5. Set up email/SMS notifications
6. Add real-time features
7. Deploy to production

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Database Functions](https://supabase.com/docs/guides/database/functions)

---

**Congratulations!** Your healthcare appointment system is now powered by Supabase with enterprise-grade security, scalability, and real-time capabilities!