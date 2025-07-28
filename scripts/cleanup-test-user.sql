-- Clean up the test user from auth.users
-- This user should never have been created in the auth system

-- First, check if the user exists
SELECT id, email, created_at 
FROM auth.users 
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Delete the test user from auth.users
-- WARNING: This will permanently delete this user
DELETE FROM auth.users 
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Also clean up the profile if it exists
DELETE FROM public.profiles 
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Verify it's gone
SELECT COUNT(*) as remaining_test_users 
FROM auth.users 
WHERE id = '00000000-0000-0000-0000-000000000001';