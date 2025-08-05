-- Manual migration script to add RLS policies for cleaner_sessions
-- Run this directly in Supabase SQL editor

-- First, check if policies already exist
DO $$
BEGIN
    -- Check and create "Managers can create cleaner sessions" policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'cleaner_sessions' 
        AND policyname = 'Managers can create cleaner sessions'
    ) THEN
        CREATE POLICY "Managers can create cleaner sessions"
          ON public.cleaner_sessions
          FOR INSERT
          WITH CHECK (
            cleaner_id IN (
              SELECT id FROM public.cleaners 
              WHERE user_id = auth.uid()
            )
          );
        RAISE NOTICE 'Created policy: Managers can create cleaner sessions';
    ELSE
        RAISE NOTICE 'Policy already exists: Managers can create cleaner sessions';
    END IF;

    -- Check and create "Managers can view cleaner sessions" policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'cleaner_sessions' 
        AND policyname = 'Managers can view cleaner sessions'
    ) THEN
        CREATE POLICY "Managers can view cleaner sessions"
          ON public.cleaner_sessions
          FOR SELECT
          USING (
            cleaner_id IN (
              SELECT id FROM public.cleaners 
              WHERE user_id = auth.uid()
            )
          );
        RAISE NOTICE 'Created policy: Managers can view cleaner sessions';
    ELSE
        RAISE NOTICE 'Policy already exists: Managers can view cleaner sessions';
    END IF;

    -- Check and create "Managers can update cleaner sessions" policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'cleaner_sessions' 
        AND policyname = 'Managers can update cleaner sessions'
    ) THEN
        CREATE POLICY "Managers can update cleaner sessions"
          ON public.cleaner_sessions
          FOR UPDATE
          USING (
            cleaner_id IN (
              SELECT id FROM public.cleaners 
              WHERE user_id = auth.uid()
            )
          )
          WITH CHECK (
            cleaner_id IN (
              SELECT id FROM public.cleaners 
              WHERE user_id = auth.uid()
            )
          );
        RAISE NOTICE 'Created policy: Managers can update cleaner sessions';
    ELSE
        RAISE NOTICE 'Policy already exists: Managers can update cleaner sessions';
    END IF;

    -- Check and create "Managers can delete cleaner sessions" policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'cleaner_sessions' 
        AND policyname = 'Managers can delete cleaner sessions'
    ) THEN
        CREATE POLICY "Managers can delete cleaner sessions"
          ON public.cleaner_sessions
          FOR DELETE
          USING (
            cleaner_id IN (
              SELECT id FROM public.cleaners 
              WHERE user_id = auth.uid()
            )
          );
        RAISE NOTICE 'Created policy: Managers can delete cleaner sessions';
    ELSE
        RAISE NOTICE 'Policy already exists: Managers can delete cleaner sessions';
    END IF;
END;
$$;

-- Verify the policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'cleaner_sessions'
ORDER BY policyname;