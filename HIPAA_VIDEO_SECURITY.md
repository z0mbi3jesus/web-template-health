# 🔐 HIPAA-Compliant Video Visit Security Guide

## Overview

This document outlines the HIPAA-compliant video visit implementation using **Whereby**, including security controls, audit logging, access restrictions, and setup instructions.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Patient/Provider                      │
│              (video-visit.html + video-visit.js)            │
└────────────────┬────────────────────────────────────────────┘
                 │ Secure HTTPS
┌────────────────▼────────────────────────────────────────────┐
│                    Backend API Server                        │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │ Auth Check  │  │ Access Check │  │ Audit Logging   │   │
│  └─────────────┘  └──────────────┘  └─────────────────┘   │
│         ↓              ↓                     ↓              │
│   /api/video-visits/* endpoints & Whereby API calls        │
└────────────────┬────────────────────────────────────────────┘
                 │
         ┌───────┴────────────────┐
         │                        │
    ┌────▼──────┐       ┌────────▼──────┐
    │ Supabase  │       │ Whereby.com   │
    │ Database  │       │ Video Rooms   │
    │           │       │               │
    │ • audit_  │       │ • Encrypted   │
    │   log     │       │   Video       │
    │ • video_  │       │ • Access      │
    │   visits  │       │   Tokens      │
    │ • RLS     │       │ • Recording   │
    │   Policies│       │   (optional)  │
    └───────────┘       └───────────────┘
```

## Security Controls

### 1. Authentication & Authorization

**Rules:**
- ✅ Only authenticated users can access video visits
- ✅ Patients can only join video for their own appointments
- ✅ Staff can only create/manage videos for their appointments
- ✅ Admins have full access
- ✅ Tokens expire after 15 minutes (short-lived)

**Implementation:**
```javascript
// Backend checks (video-visits.js):
- requireAuth() middleware validates JWT
- Access control verifies appointement ownership
- Role-based checks for staff/admin actions
```

### 2. Data Encryption

**In Transit:**
- ✅ HTTPS/TLS for all API calls
- ✅ Whereby video stream is encrypted
- ✅ No PHI in URLs or query parameters

**At Rest:**
- ✅ Access tokens stored encrypted in database
- ✅ Database encrypted via Supabase
- ✅ Whereby maintains encryption for recordings (if enabled)

### 3. Audit Logging (HIPAA Required)

**What's Logged:**
- Every video visit creation (`action: 'video_create'`)
- Every join attempt (`action: 'video_join'`)
- Token request (`action: 'video_token_request'`)
- Visit ended (`action: 'video_end'`)
- Failed access attempts (`action: denied, status: failure`)

**Table:** `audit_log`
```sql
SELECT * FROM audit_log 
WHERE resource_type = 'video_visit' 
ORDER BY created_at DESC;
```

**Example Queries:**
```sql
-- Who accessed which video visits
SELECT user_id, resource_id, action, created_at 
FROM audit_log 
WHERE resource_type = 'video_visit';

-- Failed access attempts
SELECT * FROM audit_log 
WHERE status = 'denied' 
ORDER BY created_at DESC;

-- Video activity by date
SELECT DATE(created_at), COUNT(*) 
FROM audit_log 
WHERE resource_type = 'video_visit' 
GROUP BY DATE(created_at);
```

### 4. Access Control

**Patient Access:**
- Can only see video for their own scheduled appointment
- Can only join approved appointments
- Token-based access (no session persist post-window close)

**Staff Access:**
- Can create video sessions for their appointments
- Can invite patients to join
- Can end video sessions
- Full history audit trail

**Admin Access:**
- Can create, manage, and monitor all video sessions
- Can view complete audit logs
- Can revoke access if needed

### 5. Row Level Security (RLS)

**Supabase RLS Policies:**

```sql
-- Patients see only their appointments' videos
CREATE POLICY video_visits_select_client ON video_visits
    FOR SELECT USING (
        auth.uid() IN (SELECT patient_id FROM appointments WHERE id = video_visits.appointment_id)
    );

-- Only appointment creator can manage
CREATE POLICY video_visits_insert ON video_visits
    FOR INSERT WITH CHECK (
        auth.uid() IN (SELECT staff_id FROM appointments WHERE id = NEW.appointment_id)
    );
```

## Setup Instructions

### 1. Get Whereby Account

1. Go to https://whereby.com/
2. Sign up for a account
3. Enable HIPAA BAA (Business Associate Agreement)
4. Obtain API credentials:
   - Organization ID
   - API Key

### 2. Configure Environment Variables

Add to your backend `.env`:
```bash
WHEREBY_API_KEY=your_whereby_api_key_here
WHEREBY_API_BASE=https://api.whereby.com
WHEREBY_ORG_ID=your_org_id_here
```

### 3. Implement Whereby Token Generation

In `backend/routes/video-visits.js`, replace the stub function:

```javascript
async function generateWherebyToken(roomId, userId, userName) {
    const response = await fetch(`${WHEREBY_API_BASE}/v1/rest/organizations/${process.env.WHEREBY_ORG_ID}/rooms/${roomId}/accessTokens`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${WHEREBY_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            userName: userName,
            userId: userId,
            expiresIn: 15 * 60  // 15 minutes
        })
    });

    if (!response.ok) {
        throw new Error('Failed to generate Whereby token');
    }

    const { accessToken, expiresAt } = await response.json();
    return accessToken;
}
```

### 4. Load Whereby SDK on Frontend

In `frontend/video-visit.html`, add Whereby SDK:

```html
<script src="https://whereby.com/sdk/client.js"></script>
<script src="js/video-visit.js"></script>
```

Then implement in `js/video-visit.js`:

```javascript
async function loadWherebyVideo(tokenResponse) {
    const wherbyRoom = new Whereby.EmbeddedRoom({
        roomUrl: `https://whereby.com/room/${state.roomId}`,
        accessToken: state.token,
        container: document.getElementById('videoContent'),
        expiresAt: new Date(tokenResponse.expiresAt),
        videoQuality: 'medium'  // Balance quality/bandwidth
    });

    wherbyRoom.on('disconnected', () => {
        state.status = 'ended';
        updateUIForStatus();
    });

    return wherbyRoom;
}
```

## HIPAA Compliance Checklist

### Privacy & Security

- [ ] Access control enforced (auth + role checks)
- [ ] Audit logging enabled for all video events
- [ ] Token expiration set to 15 minutes max
- [ ] HTTPS/TLS enforced for all communication
- [ ] RLS policies enabled in Supabase
- [ ] No PHI in URLs or visible logs
- [ ] Whereby BAA signed

### Business Associate Agreement (BAA)

- [ ] Whereby BAA in place (check with Whereby support)
- [ ] Backend is "covered entity" or "business associate"
- [ ] Data use agreements documented
- [ ] Breach notification procedures defined

### Data Management

- [ ] Minimal data collection (only what's needed)
- [ ] Data retention policy documented
- [ ] Patient data deletion procedures
- [ ] Secure deletion (not just soft delete)

### Monitoring & Incident Response

- [ ] Audit logs reviewed regularly
- [ ] Failed access attempts monitored
- [ ] Breach response plan documented
- [ ] Staff trained on HIPAA requirements

## Common Issues & Fixes

### "Token Expired" Error

**Cause:** Token valid for 15 minutes; patient took too long to join

**Fix:**
```javascript
// Auto-refresh token every 10 minutes
setInterval(async () => {
    if (state.status === 'waiting') {
        const newToken = await SupabaseAPI.makeRequest(`/api/video-visits/${state.videoVisitId}/token`, {
            method: 'POST'
        });
        state.token = newToken.token;
    }
}, 10 * 60 * 1000);
```

### "Access Denied" on Video Visit

**Possible Causes:**
- Patient is not assigned to appointment
- Appointment not approved
- Token hasn't been generated yet

**Debug:**
```sql
-- Check audit log for denial reason
SELECT error_message FROM audit_log 
WHERE resource_id = 'video-visit-id' 
AND status = 'denied';
```

### Recording/Compliance Issues

**Whereby Recording:**
- Ensure BAA covers recording
- Notify patients about recording
- Provide opt-out mechanism
- Store recordings securely (encrypted)

## Best Practices

1. **Minimal Data Retention:** Delete video records after 90 days unless legally required
2. **Patient Consent:** Always get consent before recording
3. **Access Logs:** Review audit logs monthly
4. **Training:** Staff should understand HIPAA video requirements
5. **Testing:** Test access denied scenarios regularly
6. **Disaster Recovery:** Have backup video platform configured
7. **Encryption:** Use Whereby recordings encryption by default

## Audit Log Queries

**Monthly Access Report:**
```sql
SELECT 
    DATE_TRUNC('month', created_at) as month,
    action,
    COUNT(*) as count
FROM audit_log
WHERE resource_type = 'video_visit'
GROUP BY DATE_TRUNC('month', created_at), action
ORDER BY month DESC;
```

**Failed Access Attempts:**
```sql
SELECT 
    user_id, 
    action, 
    error_message, 
    created_at
FROM audit_log
WHERE status = 'denied'
ORDER BY created_at DESC
LIMIT 100;
```

**User Video History:**
```sql
SELECT 
    action,
    resource_id,
    created_at
FROM audit_log
WHERE user_id = 'user-id'
AND resource_type = 'video_visit'
ORDER BY created_at DESC;
```

## Support & Questions

- **Whereby Docs:** https://docs.whereby.com/
- **HIPAA Requirements:** Check HHS.gov/hipaa
- **Supabase RLS:** https://supabase.com/docs/guides/auth/row-level-security

---

**Last Updated:** 2026-03-31
**Status:** Ready for production with Whereby BAA signed
