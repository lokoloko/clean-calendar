-- Fix migration - move data to correct user ID
-- Your actual user ID: 0383c863-fc45-4376-8aa7-f3f4aad57950

-- First, let's see where the data currently is
SELECT 
    user_id,
    COUNT(*) as count,
    'listings' as type
FROM public.listings
GROUP BY user_id

UNION ALL

SELECT 
    user_id,
    COUNT(*) as count,
    'cleaners' as type
FROM public.cleaners
GROUP BY user_id;

-- Now move all data to your correct user ID
DO $$
DECLARE
    correct_user_id UUID := '0383c863-fc45-4376-8aa7-f3f4aad57950';
    wrong_user_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
    -- Create/update profile for correct user
    INSERT INTO public.profiles (id, email, created_at, updated_at)
    VALUES (correct_user_id, 'richmontoya@gmail.com', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET 
        email = 'richmontoya@gmail.com',
        updated_at = NOW();
    
    -- Move all listings to correct user
    UPDATE public.listings 
    SET user_id = correct_user_id
    WHERE user_id = wrong_user_id;
    
    -- Move all cleaners to correct user
    UPDATE public.cleaners 
    SET user_id = correct_user_id
    WHERE user_id = wrong_user_id;
    
    -- Move settings if they exist
    UPDATE public.settings 
    SET user_id = correct_user_id
    WHERE user_id = wrong_user_id;
    
    RAISE NOTICE 'Data moved to correct user ID: %', correct_user_id;
END $$;

-- Verify the fix
SELECT 
    user_id,
    COUNT(DISTINCT l.id) as listings,
    COUNT(DISTINCT c.id) as cleaners
FROM public.profiles p
LEFT JOIN public.listings l ON p.id = l.user_id
LEFT JOIN public.cleaners c ON p.id = c.user_id
WHERE user_id = '0383c863-fc45-4376-8aa7-f3f4aad57950'
GROUP BY user_id;