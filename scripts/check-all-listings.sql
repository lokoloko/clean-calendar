-- Check where all listings are

-- 1. Show ALL users with listings (not just those with 17)
SELECT 
    l.user_id,
    COUNT(*) as listing_count,
    p.email as profile_email,
    u.email as auth_email
FROM public.listings l
LEFT JOIN public.profiles p ON l.user_id = p.id
LEFT JOIN auth.users u ON l.user_id = u.id
GROUP BY l.user_id, p.email, u.email
ORDER BY listing_count DESC;

-- 2. Check your specific user's data
SELECT 
    'Your user data:' as description,
    COUNT(*) as count
FROM public.listings
WHERE user_id = '0383c863-fc45-4376-8aa7-f3f4aad57950';

-- 3. Check dev user data
SELECT 
    'Dev user data:' as description,
    COUNT(*) as count
FROM public.listings
WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- 4. Show recent listings to see which users they belong to
SELECT 
    id,
    name,
    user_id,
    created_at
FROM public.listings
ORDER BY created_at DESC
LIMIT 10;