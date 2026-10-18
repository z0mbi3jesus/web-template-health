# Health Calendar App

A full-stack web app for managing healthcare-style appointments with user roles, scheduling, and admin controls.

## What it does

- Users can log in and manage appointments
- Admin/staff can create and manage time slots
- Role-based access (client, staff, admin)
- Backend API handles scheduling and data flow

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- Database: PostgreSQL
- Auth: JWT

## What I built

- Designed the overall structure of the app (frontend + backend)
- Built REST API endpoints for scheduling and user management
- Implemented authentication with JWT and role-based access
- Created database schema for users, appointments, and time slots
- Debugged issues around scheduling logic and API communication

## What I learned

- How to structure a full-stack application end-to-end
- How authentication and role-based systems actually work
- How to design and query a relational database
- How to debug backend and API issues
- How to use AI tools to speed up development while still understanding the system

## Notes

This project was built as a learning experience focused on functionality and system design rather than production-level polish.

## How to run

1. Clone the repo
2. Install dependencies in `/backend`
3. Set up a PostgreSQL database
4. Add a `.env` file with your config
5. Start the backend and frontend servers
## Supported local entry points and database upgrades

Run npm install at the repository root. npm start launches server-supabase.js; npm run frontend serves the public file allowlist on port 3000. backend/ is a separate legacy implementation, not the root API; its routes and authentication source are retained for review.

Before deploying the revised booking API, apply database/migrations/002-video-visits-schema.sql followed by 003-booking-and-access-hardening.sql to an existing database initialized from database/schema.sql. Migration 003 makes booking and cancellation transactional, restricts direct browser writes, protects role columns, and removes stored video bearer tokens. Review the migrations against your actual schema first. No live migration is performed by npm start.

npm test runs isolated local regression tests without loading credentials or contacting Supabase/Whereby. Root .env and backend/.env remain ignored. Database disable-RLS helpers are retired. Older alternate schema files are historical; schema.sql plus numbered migrations define the supported access model.

## Licensing

This project is proprietary. See [LICENSE](LICENSE). Use, redistribution, modification, or hosting requires a separate written license from HealthCare Plus. Authorized use of the hosted service is governed by the applicable service or subscription agreement; a subscription does not grant source-code rights.

Third-party dependencies retain their own licenses. Previously released copies remain subject to their original licenses. Package metadata uses `UNLICENSED` and `private: true` to prevent accidental npm publication.
