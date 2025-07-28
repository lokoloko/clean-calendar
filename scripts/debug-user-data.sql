-- Debug script to check user data issues

-- 1. Check ALL users and their data counts
SELECT 
    COALESCE(p.id, u.id) as user_id,
    COALESCE(p.email, u.email) as email,
    u.id as auth_user_id,
    p.id as profile_id,
    COUNT(DISTINCT l.id) as listings,
    COUNT(DISTINCT c.id) as cleaners
FROM auth.users u
FULL OUTER JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.listings l ON COALESCE(p.id, u.id) = l.user_id
LEFT JOIN public.cleaners c ON COALESCE(p.id, u.id) = c.user_id
WHERE u.email = 'richmontoya@gmail.com' OR p.email = 'richmontoya@gmail.com'
GROUP BY u.id, p.id, u.email, p.email;

-- 2. Check where the listings actually are
SELECT DISTINCT 
    user_id,
    COUNT(*) as count,
    'listings' as table_name
FROM public.listings
GROUP BY user_id
ORDER BY count DESC;

-- 3. Check where the cleaners actually are  
SELECT DISTINCT 
    user_id,
    COUNT(*) as count,
    'cleaners' as table_name
FROM public.cleaners
GROUP BY user_id
ORDER BY count DESC;

-- 4. Check if there's a mismatch between auth.users ID and profiles ID
SELECT 
    'Auth User' as source,
    id,
    email,
    created_at
FROM auth.users 
WHERE email = 'richmontoya@gmail.com'
UNION ALL
SELECT 
    'Profile' as source,
    id,
    email,
    created_at
FROM public.profiles 
WHERE email = 'richmontoya@gmail.com';

-- 5. Get the exact user ID that has the data
SELECT 
    l.user_id,
    COUNT(*) as listing_count,
    MAX(p.email) as profile_email,
    MAX(u.email) as auth_email
FROM public.listings l
LEFT JOIN public.profiles p ON l.user_id = p.id
LEFT JOIN auth.users u ON l.user_id = u.id
WHERE l.user_id IN (
    SELECT user_id FROM public.listings GROUP BY user_id HAVING COUNT(*) = 17
)
GROUP BY l.user_id;