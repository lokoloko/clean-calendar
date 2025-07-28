-- Migration script to transfer data from DEV_USER_ID to actual user
-- Run this in Supabase SQL Editor

-- First, let's check what users exist
SELECT id, email, name, created_at 
FROM public.profiles 
WHERE email = 'richmontoya@gmail.com' OR id = '00000000-0000-0000-0000-000000000001';

-- Check what data exists for the dev user
SELECT 'Listings' as table_name, COUNT(*) as count FROM public.listings WHERE user_id = '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'Cleaners' as table_name, COUNT(*) as count FROM public.cleaners WHERE user_id = '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'Manual Schedules' as table_name, COUNT(*) as count FROM public.manual_schedules WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- Get the actual user ID for richmontoya@gmail.com
-- You'll need to replace 'YOUR_ACTUAL_USER_ID' with the ID from the first query
DO $$
DECLARE
    actual_user_id UUID;
    dev_user_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
    -- Get the actual user ID
    SELECT id INTO actual_user_id 
    FROM public.profiles 
    WHERE email = 'richmontoya@gmail.com'
    LIMIT 1;
    
    IF actual_user_id IS NOT NULL THEN
        -- Update listings
        UPDATE public.listings 
        SET user_id = actual_user_id 
        WHERE user_id = dev_user_id;
        
        -- Update cleaners
        UPDATE public.cleaners 
        SET user_id = actual_user_id 
        WHERE user_id = dev_user_id;
        
        -- Update manual_schedules
        UPDATE public.manual_schedules 
        SET user_id = actual_user_id 
        WHERE user_id = dev_user_id;
        
        -- Update settings if exists
        UPDATE public.settings 
        SET user_id = actual_user_id 
        WHERE user_id = dev_user_id;
        
        RAISE NOTICE 'Migration completed. Data transferred from % to %', dev_user_id, actual_user_id;
    ELSE
        RAISE NOTICE 'User with email richmontoya@gmail.com not found!';
    END IF;
END $$;

-- Verify the migration
SELECT 'After Migration - Listings' as status, user_id, COUNT(*) as count 
FROM public.listings 
WHERE user_id IN (
    SELECT id FROM public.profiles WHERE email = 'richmontoya@gmail.com'
) 
GROUP BY user_id;