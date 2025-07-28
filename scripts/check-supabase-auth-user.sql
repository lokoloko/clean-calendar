-- Check Supabase auth.users table for your user
-- Run this in Supabase SQL Editor

-- 1. Find your user in the auth.users table
SELECT 
    id,
    email,
    raw_user_meta_data->>'full_name' as name,
    raw_user_meta_data->>'avatar_url' as avatar,
    created_at
FROM auth.users 
WHERE email = 'richmontoya@gmail.com';

-- 2. Check if a profile exists for this user
SELECT 
    p.id,
    p.email,
    p.name,
    u.email as auth_email
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email = 'richmontoya@gmail.com';

-- 3. Check data for DEV_USER_ID
SELECT 
    'DEV_USER_ID Data:' as description,
    '' as count
UNION ALL
SELECT 
    'Listings',
    COUNT(*)::text
FROM public.listings 
WHERE user_id = '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 
    'Cleaners',
    COUNT(*)::text
FROM public.cleaners 
WHERE user_id = '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 
    'Manual Schedules',
    COUNT(*)::text
FROM public.manual_schedules 
WHERE user_id = '00000000-0000-0000-0000-000000000001';