-- Safe migration script to transfer data from DEV_USER_ID to your actual user
-- 
-- INSTRUCTIONS:
-- 1. First run check-user-data.sql to find your user ID
-- 2. Replace 'YOUR_ACTUAL_USER_ID_HERE' with your actual user ID from the profiles table
-- 3. Run this script in Supabase SQL Editor

-- IMPORTANT: Replace this with your actual user ID from the profiles table!
-- It should look like: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
DO $$
DECLARE
    actual_user_id UUID := 'YOUR_ACTUAL_USER_ID_HERE';  -- <-- REPLACE THIS!
    dev_user_id UUID := '00000000-0000-0000-0000-000000000001';
    listings_count INTEGER;
    cleaners_count INTEGER;
    schedules_count INTEGER;
BEGIN
    -- Safety check - make sure you replaced the user ID
    IF actual_user_id = 'YOUR_ACTUAL_USER_ID_HERE' THEN
        RAISE EXCEPTION 'Please replace YOUR_ACTUAL_USER_ID_HERE with your actual user ID from the profiles table!';
    END IF;
    
    -- Check if the user exists
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = actual_user_id) THEN
        RAISE EXCEPTION 'User with ID % not found in profiles table!', actual_user_id;
    END IF;
    
    -- Count records to be migrated
    SELECT COUNT(*) INTO listings_count FROM public.listings WHERE user_id = dev_user_id;
    SELECT COUNT(*) INTO cleaners_count FROM public.cleaners WHERE user_id = dev_user_id;
    SELECT COUNT(*) INTO schedules_count FROM public.manual_schedules WHERE user_id = dev_user_id;
    
    RAISE NOTICE 'About to migrate: % listings, % cleaners, % manual schedules', 
        listings_count, cleaners_count, schedules_count;
    
    -- Perform the migration
    UPDATE public.listings 
    SET user_id = actual_user_id, updated_at = NOW()
    WHERE user_id = dev_user_id;
    
    UPDATE public.cleaners 
    SET user_id = actual_user_id, updated_at = NOW()
    WHERE user_id = dev_user_id;
    
    UPDATE public.manual_schedules 
    SET user_id = actual_user_id, updated_at = NOW()
    WHERE user_id = dev_user_id;
    
    -- Update settings if they exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'settings') THEN
        UPDATE public.settings 
        SET user_id = actual_user_id, updated_at = NOW()
        WHERE user_id = dev_user_id;
    END IF;
    
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Migrated % listings, % cleaners, % manual schedules from dev user to user %', 
        listings_count, cleaners_count, schedules_count, actual_user_id;
END $$;

-- Verify the migration results
SELECT 
    CASE 
        WHEN user_id = '00000000-0000-0000-0000-000000000001' THEN 'DEV_USER_ID'
        ELSE 'Your User'
    END as user_type,
    COUNT(DISTINCT l.id) as listings,
    COUNT(DISTINCT c.id) as cleaners,
    COUNT(DISTINCT ms.id) as manual_schedules
FROM public.profiles p
LEFT JOIN public.listings l ON p.id = l.user_id
LEFT JOIN public.cleaners c ON p.id = c.user_id
LEFT JOIN public.manual_schedules ms ON p.id = ms.user_id
WHERE p.id IN ('00000000-0000-0000-0000-000000000001', 'YOUR_ACTUAL_USER_ID_HERE')
GROUP BY user_id;