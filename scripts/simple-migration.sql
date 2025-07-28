-- Simple migration script
-- This transfers all data from the hardcoded DEV_USER_ID to your actual user

-- Step 1: Check your user ID
SELECT id, email FROM auth.users WHERE email = 'richmontoya@gmail.com';

-- Step 2: Check what data exists for DEV_USER_ID
SELECT 
    'Listings to migrate:' as item,
    COUNT(*) as count
FROM public.listings 
WHERE user_id = '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 
    'Cleaners to migrate:',
    COUNT(*)
FROM public.cleaners 
WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- Step 3: Run this block to do the migration
-- (First run steps 1 and 2 above to verify)
DO $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Get your user ID
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = 'richmontoya@gmail.com';
    
    -- Create/update your profile
    INSERT INTO public.profiles (id, email, created_at, updated_at)
    VALUES (target_user_id, 'richmontoya@gmail.com', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET updated_at = NOW();
    
    -- Migrate listings
    UPDATE public.listings 
    SET user_id = target_user_id
    WHERE user_id = '00000000-0000-0000-0000-000000000001';
    
    -- Migrate cleaners
    UPDATE public.cleaners 
    SET user_id = target_user_id
    WHERE user_id = '00000000-0000-0000-0000-000000000001';
    
    RAISE NOTICE 'Migration completed!';
END $$;

-- Step 4: Verify the migration worked
SELECT 
    u.email,
    COUNT(DISTINCT l.id) as listings,
    COUNT(DISTINCT c.id) as cleaners
FROM auth.users u
LEFT JOIN public.listings l ON u.id = l.user_id
LEFT JOIN public.cleaners c ON u.id = c.user_id
WHERE u.email = 'richmontoya@gmail.com'
GROUP BY u.email;