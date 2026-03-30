# Row Level Security (RLS) Setup Guide

## Overview
Row Level Security (RLS) is essential for protecting sensitive healthcare data. It ensures that users can only access data they're authorized to view based on their role.

## Current Status
- **Status**: Disabled for development
- **Security Risk**: Anyone with the anon key can read/modify all data
- **Action Required**: Enable RLS on all tables

## What RLS Protects

### Users Table
- **Users**: Can read/update only their own profile
- **Staff/Admin**: Can read all user profiles (for appointment assignment)
- **Unauthenticated**: NO access

### Appointments Table  
- **Clients**: Can read/create only their own appointments
- **Staff**: Can read appointments assigned to them
- **Admin**: Can read/modify all appointments
- **Unauthenticated**: NO access

### Available Slots Table
- **Authenticated Users**: Can read available slots
- **Unauthenticated**: NO access

### Appointment Types Table
- **Authenticated Users**: Can read types
- **Admin Only**: Can create/modify types

## How to Enable RLS

### Method 1: Supabase Dashboard (Recommended - 5 minutes)

1. **Open Supabase Dashboard**
   - Go to https://app.supabase.com
   - Select your project

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and Paste SQL**
   - Open `database/rls-policies.sql` from this project
   - Copy ALL the SQL code
   - Paste into the SQL editor

4. **Run the Query**
   - Click the "Run" button (or Ctrl+Enter)
   - Wait for it to complete
   - You should see "Success" messages

5. **Verify RLS is Enabled**
   - Go to "Authentication" > "Policies" in Supabase dashboard
   - Check each table shows policies are active
   - Look for green checkmarks next to table names

### Method 2: Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Link your project
supabase link

# Apply migrations
supabase db push

# Or run SQL directly
supabase db execute < database/rls-policies.sql
```

### Method 3: Using Node Script (Docker Container Required)

```bash
# Requires Docker to run PostgreSQL
node enable-rls.js
```

## Testing RLS

After enabling RLS, test with different user roles:

### Test 1: Client Access
```bash
# Sign in as client
email: patient@example.com
password: password123

# Should be able to:
✅ See their own profile
✅ See their own appointments
✅ Book appointments

# Should NOT be able to:
❌ See other users' profiles
❌ See other users' appointments
❌ Modify appointment types
```

### Test 2: Staff Access
```bash
# Sign in as staff
email: doctor@example.com
password: password123

# Should be able to:
✅ See all user profiles
✅ See appointments assigned to them
✅ See all appointments (if looking for patient info)

# Should NOT be able to:
❌ Book appointments as self
❌ Modify other staff's assignments
❌ Delete core data
```

### Test 3: Admin Access
```bash
# Sign in as admin
email: admin@healthclinic.com
password: password123

# Should be able to:
✅ See everything
✅ Modify all data
✅ Manage users and appointments
✅ Create time slots
```

### Test 4: Unauthenticated Access
```bash
# Without authentication (anon key)

# Should NOT be able to:
❌ Read any user data
❌ Read any appointments
❌ Modify any data
```

## Policies Explained

### Users Table Example
```sql
-- Policy 1: Users read own profile
CREATE POLICY "user_read_own_profile" 
ON public.users 
FOR SELECT 
USING (auth.uid() = id);
```
This says: "User can SELECT from users table only where the user's ID matches their auth.uid()"

### Appointments Table Example
```sql
-- Policy: Clients can create appointments
CREATE POLICY "client_create_appointments" 
ON public.appointments 
FOR INSERT 
WITH CHECK (
  auth.uid() = client_id
  AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'client'
);
```
This says: "User can INSERT into appointments only if:
- The auth.uid() matches the client_id field
- AND the user's role is 'client'"

## Common Issues & Solutions

### Issue: "Permission Denied" when trying to read data
**Cause**: RLS is enabled but user doesn't have the right role
**Solution**: Check user's role in users table; verify RLS policy matches the scenario

### Issue: Admin can't see appointments
**Cause**: Admin policy might be missing or incorrectly named
**Solution**: Check all policies in Supabase dashboard > Authentication > Policies

### Issue: Users can see other users' profiles
**Cause**: RLS is not enabled OR a policy is missing
**Solution**: Verify all policies from rls-policies.sql are created

### Issue: Backend API returns 403 Forbidden
**Cause**: User's JWT doesn't include the role claim
**Solution**: Update auth middleware to include role in JWT claims

## Performance Considerations

RLS adds a small performance overhead (~1-5ms per query) due to policy evaluation. This is negligible for most applications.

### Optimization Tips:
1. **Indexes**: Ensure indexed columns are used in RLS policies
   ```sql
   CREATE INDEX idx_users_id ON public.users(id);
   CREATE INDEX idx_appointments_client_id ON public.appointments(client_id);
   ```

2. **Policy Order**: Place most commonly matched policies first

3. **Caching**: Implement Redis caching for frequently accessed data

## Security Best Practices

1. **Never disable RLS in production** - Always keep it enabled
2. **Test thoroughly** - Test with each user role
3. **Audit logs** - Enable Postgres audit logging
4. **Monitor access** - Set up alerts for suspicious patterns
5. **Regular reviews** - Review RLS policies quarterly

## Disabling RLS (Emergency Only)

If RLS causes issues, you can temporarily disable it:

```sql
-- ONLY for emergency troubleshooting!
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments DISABLE ROW LEVEL SECURITY;
-- ... repeat for all tables

-- Re-enable when issues are resolved
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
```

## Next Steps

1. ✅ Copy `database/rls-policies.sql`
2. ✅ Open Supabase SQL Editor
3. ✅ Paste and run the SQL
4. ✅ Test with each user role
5. ✅ Monitor for errors in application logs

## Questions?

If RLS is causing unexpected behavior:
1. Check the Supabase dashboard logs
2. Review policy evaluation in PostgreSQL
3. Test with direct SQL queries
4. Check JWT claims in the token

---

**Remember**: RLS is critical for healthcare data security. It's worth the few minutes to set up properly!
