-- Admin User Creation Script for Supabase
-- Run this in your Supabase SQL Editor after setting up your project

-- =====================================================
-- Create Admin User (Manual Process)
-- =====================================================

-- Step 1: First register a user through Supabase Auth Dashboard or your website
-- This creates the user in auth.users table

-- Step 2: Update the user role to admin in your users table
-- Replace 'your-email@domain.com' with your actual email

UPDATE public.users 
SET role = 'admin' 
WHERE email = 'your-email@domain.com';

-- Step 3: Verify the admin user was created
SELECT id, email, name, role, created_at 
FROM public.users 
WHERE role = 'admin';

-- =====================================================
-- Alternative: Create Admin User via SQL (Advanced)
-- =====================================================

-- If you want to create an admin user programmatically:
-- (This requires using Supabase Admin API - more complex)

-- Example admin user data (update with your info):
/*
INSERT INTO public.users (
    id, 
    email, 
    name, 
    role, 
    is_active
) VALUES (
    uuid_generate_v4(),  -- This should match the auth.users.id
    'admin@yourdomain.com',
    'System Administrator',
    'admin',
    true
);
*/

-- =====================================================
-- Quick Admin Access for Development
-- =====================================================

-- For development/testing, you can temporarily grant admin access:
-- (Remember to secure this in production!)

-- Create a dev admin function
CREATE OR REPLACE FUNCTION create_dev_admin(admin_email TEXT, admin_name TEXT)
RETURNS TEXT AS $$
DECLARE
    new_user_id UUID;
BEGIN
    -- This is a simplified version - in practice, you'd integrate with Supabase Auth
    new_user_id := uuid_generate_v4();
    
    INSERT INTO public.users (id, email, name, role, is_active)
    VALUES (new_user_id, admin_email, admin_name, 'admin', true);
    
    RETURN 'Admin user created with ID: ' || new_user_id;
EXCEPTION
    WHEN unique_violation THEN
        RETURN 'User with this email already exists';
    WHEN OTHERS THEN
        RETURN 'Error creating admin user: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Usage (after running above function):
-- SELECT create_dev_admin('admin@yourdomain.com', 'Admin User');