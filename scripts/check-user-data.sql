-- Run this in Supabase SQL Editor to check your user data

-- 1. Find all users
SELECT id, email, name, created_at 
FROM public.profiles 
ORDER BY created_at DESC;

-- 2. Check what data exists for DEV_USER_ID
SELECT 
    '00000000-0000-0000-0000-000000000001' as user_id,
    'DEV_USER_ID Data:' as description
UNION ALL
SELECT 
    '- Listings: ' || COUNT(*)::text,
    ''
FROM public.listings 
WHERE user_id = '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 
    '- Cleaners: ' || COUNT(*)::text,
    ''
FROM public.cleaners 
WHERE user_id = '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 
    '- Assignments: ' || COUNT(*)::text,
    ''
FROM public.assignments 
WHERE listing_id IN (SELECT id FROM public.listings WHERE user_id = '00000000-0000-0000-0000-000000000001')
UNION ALL
SELECT 
    '- Schedule Items: ' || COUNT(*)::text,
    ''
FROM public.schedule_items 
WHERE listing_id IN (SELECT id FROM public.listings WHERE user_id = '00000000-0000-0000-0000-000000000001');

-- 3. If you see your user in the profiles table, replace YOUR_USER_ID below with your actual ID
-- and run this to check if you have any data:
/*
SELECT 
    'Your Data:' as description,
    ''
UNION ALL
SELECT 
    '- Listings: ' || COUNT(*)::text,
    ''
FROM public.listings 
WHERE user_id = 'YOUR_USER_ID'
UNION ALL
SELECT 
    '- Cleaners: ' || COUNT(*)::text,
    ''
FROM public.cleaners 
WHERE user_id = 'YOUR_USER_ID';
*/