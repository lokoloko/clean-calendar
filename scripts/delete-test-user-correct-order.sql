-- Delete test user - correct order to handle foreign key constraints

-- First verify what we're dealing with
SELECT 'auth.users' as table_name, COUNT(*) as count
FROM auth.users 
WHERE id = '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'public.profiles' as table_name, COUNT(*) as count
FROM public.profiles 
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Delete in correct order (child tables first, parent tables last)

-- 1. First delete from public.profiles (has foreign key to auth.users)
DELETE FROM public.profiles 
WHERE id = '00000000-0000-0000-0000-000000000001';

-- 2. Delete from auth related tables
DELETE FROM auth.identities 
WHERE user_id = '00000000-0000-0000-0000-000000000001';

DELETE FROM auth.sessions 
WHERE user_id = '00000000-0000-0000-0000-000000000001';

DELETE FROM auth.refresh_tokens 
WHERE user_id = '00000000-0000-0000-0000-000000000001';

DELETE FROM auth.mfa_factors 
WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- 3. Now we can safely delete from auth.users
DELETE FROM auth.users 
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Verify deletion
SELECT 
  'Remaining test users in auth.users: ' || COUNT(*) as auth_status
FROM auth.users 
WHERE id = '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 
  'Remaining test profiles: ' || COUNT(*) as profile_status
FROM public.profiles 
WHERE id = '00000000-0000-0000-0000-000000000001';