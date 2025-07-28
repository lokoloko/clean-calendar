-- Migration script for Supabase auth.users
-- This migrates data from DEV_USER_ID to your actual Supabase auth user

DO $$
DECLARE
    actual_user_id UUID;
    dev_user_id UUID := '00000000-0000-0000-0000-000000000001';
    user_email TEXT := 'richmontoya@gmail.com';
    listings_count INTEGER;
    cleaners_count INTEGER;
    schedules_count INTEGER;
BEGIN
    -- Get the user ID from auth.users table
    SELECT id INTO actual_user_id 
    FROM auth.users 
    WHERE email = user_email
    LIMIT 1;
    
    IF actual_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found in auth.users!', user_email;
    END IF;
    
    RAISE NOTICE 'Found user ID: % for email: %', actual_user_id, user_email;
    
    -- First, create or update the profile
    INSERT INTO public.profiles (id, email, name, avatar_url, created_at, updated_at)
    SELECT 
        id,
        email,
        raw_user_meta_data->>'full_name',
        raw_user_meta_data->>'avatar_url',
        NOW(),
        NOW()
    FROM auth.users
    WHERE id = actual_user_id
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        avatar_url = EXCLUDED.avatar_url,
        updated_at = NOW();
    
    -- Count records to be migrated
    SELECT COUNT(*) INTO listings_count FROM public.listings WHERE user_id = dev_user_id;
    SELECT COUNT(*) INTO cleaners_count FROM public.cleaners WHERE user_id = dev_user_id;
    SELECT COUNT(*) INTO schedules_count FROM public.manual_schedules WHERE user_id = dev_user_id;
    
    RAISE NOTICE 'About to migrate: % listings, % cleaners, % manual schedules', 
        listings_count, cleaners_count, schedules_count;
    
    -- Migrate the data
    UPDATE public.listings 
    SET user_id = actual_user_id, updated_at = NOW()
    WHERE user_id = dev_user_id;
    
    UPDATE public.cleaners 
    SET user_id = actual_user_id, updated_at = NOW()
    WHERE user_id = dev_user_id;
    
    UPDATE public.manual_schedules 
    SET user_id = actual_user_id, updated_at = NOW()
    WHERE user_id = dev_user_id;
    
    -- Update settings if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'settings') THEN
        UPDATE public.settings 
        SET user_id = actual_user_id, updated_at = NOW()
        WHERE user_id = dev_user_id;
    END IF;
    
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'User % now has % listings, % cleaners, and % manual schedules', 
        user_email, listings_count, cleaners_count, schedules_count;
END $$;

-- Verify the migration
SELECT 
    u.email,
    p.id as profile_id,
    COUNT(DISTINCT l.id) as listings_count,
    COUNT(DISTINCT c.id) as cleaners_count,
    COUNT(DISTINCT ms.id) as schedules_count
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.listings l ON u.id = l.user_id
LEFT JOIN public.cleaners c ON u.id = c.user_id
LEFT JOIN public.manual_schedules ms ON u.id = ms.user_id
WHERE u.email = 'richmontoya@gmail.com'
GROUP BY u.email, p.id;