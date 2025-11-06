# Health Calendar - Comprehensive Healthcare Appointment System

## � SECURITY NOTICE

**⚠️ IMPORTANT: This is a healthcare application handling sensitive patient data.**

Before working with this codebase:
1. 📖 **Read** `SECURITY.md` for complete security guidelines
2. 🔑 **Never commit** `.env` files or any sensitive data
3. 🏥 **Follow HIPAA** compliance requirements
4. 🔍 **Review commits** before pushing to ensure no secrets are exposed

**Quick Security Check:**
```bash
# Before every commit, run:
git status                    # Verify no .env files are staged
grep -r "sk_\|pk_\|eyJ" .    # Check for hardcoded API keys
```

## �🚀 Project Overview

This is a complete healthcare appointment management system with a professional website, interactive calendar system, and administrative time slot management capabilities. The system supports role-based access for clients, staff, and administrators.

**🆕 Now powered by Supabase for enterprise-grade security and scalability!**

## 🏗️ Architecture

### Frontend Components
- **Main Website** (`index.html`) - Professional healthcare website with contact forms
- **Admin Panel** (`admin-panel.html`) - Time slot management interface for staff/admins
- **Styling** (`styles.css`) - Comprehensive responsive design
- **Interactions** (`script.js`) - Client-side functionality

### Backend Components
- **Node.js + Express** - RESTful API server
- **PostgreSQL** - Robust database with 9 tables
- **JWT Authentication** - Secure token-based auth
- **Role-based Access** - Client, staff, and admin permissions

## 📊 Database Schema

### Users Table
- `id` (UUID, Primary Key)
- `email` (Unique)
- `password_hash` (bcrypt)
- `first_name`, `last_name`
- `phone`
- `role` (client, staff, admin)
- `is_active`

### Appointment Types
- `id`, `name`, `description`
- `duration_minutes`
- `color` (for calendar display)

### Available Slots
- Staff availability configuration
- Recurring weekly schedules
- Time ranges and appointment types

### Appointments
- Client bookings
- Approval workflows
- Status tracking

### Profiles
- **Client Profiles**: Insurance, preferences
- **Staff Profiles**: Department, specialization, employee ID

## 🔐 Authentication & Security

### Login Credentials (Development)
```
Admin:     admin@healthclinic.com / password123
Staff:     dr.smith@healthclinic.com / password123
Therapist: therapist@healthclinic.com / password123
Client:    client1@example.com / password123
```

### Security Features
- JWT tokens with expiration
- bcrypt password hashing (12 rounds)
- Rate limiting (100 requests/15 minutes)
- CORS protection
- Helmet.js security headers
- Input validation with express-validator

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd web-template-health
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   ```

3. **Database Setup**
   ```bash
   # Create database
   createdb health_calendar
   
   # Run migrations
   node database/migrate.js
   
   # Seed with sample data
   node database/seed.js
   ```

4. **Environment Configuration**
   Create `backend/.env`:
   ```env
   NODE_ENV=development
   PORT=3001
   DATABASE_URL=postgresql://username:password@localhost:5432/health_calendar
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=24h
   BCRYPT_SALT_ROUNDS=12
   ```

5. **Start Services**
   ```bash
   # Backend (Terminal 1)
   cd backend
   npm start
   
   # Frontend (Terminal 2)
   cd ..
   npm install express
   node frontend-server.js
   ```

## 📱 Usage Guide

### Admin Panel Features

#### 🔐 Login
- Access: http://localhost:3000
- Use admin or staff credentials
- Auto-populates with admin credentials

#### 📋 Appointment Type Management
- View all appointment types
- See duration and descriptions
- Color-coded for calendar display

#### 👥 Staff Management
- View all staff members
- See departments and specializations
- Filter time slots by staff

#### ⏰ Time Slot Management

**Individual Slots:**
- Add single time slots
- Select staff, appointment type, day, time
- Choose recurring or one-time

**Weekly Schedules:**
- Bulk create weekly schedules
- Select multiple days (Mon-Sun)
- Automatically creates recurring slots

**Existing Slots:**
- View all configured time slots
- Filter by staff member
- Delete unwanted slots

### API Endpoints

#### Authentication
```
POST /api/auth/register - User registration
POST /api/auth/login    - User login
```

#### Time Slot Management
```
GET    /api/timeslots                     - List all time slots
POST   /api/timeslots                     - Create time slot
PUT    /api/timeslots/:id                 - Update time slot
DELETE /api/timeslots/:id                 - Delete time slot
POST   /api/timeslots/weekly-schedule     - Create weekly schedule
GET    /api/timeslots/staff               - List staff members
GET    /api/timeslots/appointment-types   - List appointment types
GET    /api/timeslots/staff/:id/slots     - Get staff's time slots
```

#### User Management
```
GET /api/users/profile - Get user profile
```

#### Calendar
```
GET /api/calendar - Get calendar data
```

## 🧪 Testing

### Automated Tests
```bash
cd backend
node test/api-test.js
```

### Manual Testing Checklist
- [ ] Admin login works
- [ ] Staff list loads
- [ ] Appointment types display
- [ ] Create individual time slot
- [ ] Create weekly schedule
- [ ] Delete time slot
- [ ] Filter slots by staff
- [ ] Logout functionality

## 🚀 Production Deployment

### Environment Setup
1. Set up production PostgreSQL database
2. Update environment variables
3. Use strong JWT secret
4. Enable SSL/HTTPS
5. Configure proper CORS origins

### Security Considerations
- Change default passwords
- Use environment-specific JWT secrets
- Enable database SSL
- Set up proper firewall rules
- Regular security updates

### Performance Optimization
- Database indexing
- Connection pooling
- Caching strategies
- CDN for static assets

## 📈 Feature Roadmap

### Phase 1 (Current)
- ✅ User authentication
- ✅ Time slot management
- ✅ Admin panel
- ✅ Role-based access

### Phase 2 (Next)
- [ ] Client appointment booking
- [ ] Appointment approval workflow
- [ ] Email notifications
- [ ] Calendar integration

### Phase 3 (Future)
- [ ] Payment processing
- [ ] SMS reminders
- [ ] Reporting dashboard
- [ ] Mobile app

## 🐛 Troubleshooting

### Common Issues

**Database Connection Failed**
```bash
# Check PostgreSQL service
pg_ctl status
# Verify credentials in .env
# Ensure database exists
```

**Server Won't Start**
```bash
# Check port availability
netstat -ano | findstr :3001
# Verify dependencies
npm install
```

**Login Issues**
```bash
# Verify user exists in database
psql health_calendar -c "SELECT * FROM users;"
# Check password hash
# Verify JWT secret
```

**CORS Errors**
- Update CORS origin in server.js
- Check frontend URL matches CORS settings
- Verify API base URL in admin panel

## 📝 API Documentation

### Time Slot Object Structure
```json
{
  "id": "uuid",
  "staff_id": "uuid",
  "appointment_type_id": "uuid", 
  "start_time": "HH:MM",
  "end_time": "HH:MM",
  "day_of_week": 1,
  "is_recurring": true,
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

### Authentication Headers
```javascript
{
  "Authorization": "Bearer <jwt-token>",
  "Content-Type": "application/json"
}
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Follow coding standards
4. Add tests for new features
5. Update documentation
6. Submit pull request

## 📄 License

This project is licensed under the ISC License - see the package.json file for details.

## 📞 Support

For issues or questions:
- Check troubleshooting section
- Review API documentation
- Contact development team

---

**Built with ❤️ for healthcare professionals to manage their appointment schedules efficiently.**