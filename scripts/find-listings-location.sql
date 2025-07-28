-- Find where the 17 listings actually are

-- 1. Show all users that have exactly 17 listings
SELECT 
    l.user_id,
    COUNT(*) as listing_count,
    p.email as profile_email,
    p.id as profile_id
FROM public.listings l
LEFT JOIN public.profiles p ON l.user_id = p.id
GROUP BY l.user_id, p.email, p.id
HAVING COUNT(*) = 17;

-- 2. Show all profiles with email richmontoya@gmail.com
SELECT 
    id,
    email,
    created_at,
    updated_at
FROM public.profiles
WHERE email = 'richmontoya@gmail.com';

-- 3. Show the auth user
SELECT 
    id,
    email,
    created_at
FROM auth.users
WHERE email = 'richmontoya@gmail.com';

-- 4. If the listings are under a different user_id than your auth user,
-- this will move them to your correct auth user ID (0383c863-fc45-4376-8aa7-f3f4aad57950)
-- ONLY RUN THIS AFTER CHECKING THE RESULTS ABOVE!
/*
UPDATE public.listings 
SET user_id = '0383c863-fc45-4376-8aa7-f3f4aad57950'
WHERE user_id IN (
    SELECT user_id 
    FROM public.listings 
    GROUP BY user_id 
    HAVING COUNT(*) = 17
);

UPDATE public.cleaners 
SET user_id = '0383c863-fc45-4376-8aa7-f3f4aad57950'
WHERE user_id IN (
    SELECT user_id 
    FROM public.cleaners 
    GROUP BY user_id 
    HAVING COUNT(*) = 2
);
*/