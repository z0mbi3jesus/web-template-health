# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- HIPAA-compliant video visit system with Whereby integration
- Secure video visit page (`video-visit.html`) with access control
- Video visit backend API endpoints with Whereby token generation
- Audit logging middleware for HIPAA compliance tracking
- Video visit database schema with RLS policies
- HIPAA video security guide and setup documentation
- Short-lived access tokens (15 min expiration)
- Role-based access control for video sessions

### Security
- Whereby HIPAA BAA integration ready
- Encrypted video streams (Whereby)
- Token-based access (no persistent sessions)
- Comprehensive audit logging for all video events
- Row Level Security (RLS) enforced on video visits

## [0.1.0] - 2026-03-31

### Added
- Initial release
- Healthcare appointment system with Supabase backend
- Authentication system (sign up, sign in, sign out)
- Patient dashboard with calendar and appointment management
- Admin panel for staff to manage time slots
- Responsive design for mobile and desktop
- Role-based access control (client, staff, admin)
- Security documentation and guidelines

### Security
- JWT-based authentication
- bcrypt password hashing
- CORS protection
- Environment variable configuration
- HIPAA compliance guidelines documented
