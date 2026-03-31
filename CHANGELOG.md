# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Patient hub dashboard (landing page for logged-in patients)
- Patient calendar with appointment booking
- Admin panel for managing appointments and time slots
- Video visit placeholder (coming soon)

### Fixed
- Auth state preservation when returning from dashboard to main site
- CORS configuration for Vercel deployment

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
