-- Optimize RLS policies for better performance
-- This migration fixes the auth function call performance issue identified by Supabase lints

-- The issue: auth.uid() is being re-evaluated for each row
-- The solution: Use (SELECT auth.uid()) to cache the result

-- Drop and recreate all RLS policies with optimized auth function calls

-- 1. PROFILES table
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "profiles_select_own" ON public.profiles 
  FOR SELECT USING (id = (SELECT auth.uid()));

CREATE POLICY "profiles_update_own" ON public.profiles 
  FOR UPDATE USING (id = (SELECT auth.uid()));

-- 2. LISTINGS table
DROP POLICY IF EXISTS "listings_all_own" ON public.listings;

CREATE POLICY "listings_all_own" ON public.listings 
  FOR ALL USING (user_id = (SELECT auth.uid()));

-- 3. CLEANERS table
DROP POLICY IF EXISTS "cleaners_all_own" ON public.cleaners;

CREATE POLICY "cleaners_all_own" ON public.cleaners 
  FOR ALL USING (user_id = (SELECT auth.uid()));

-- 4. ASSIGNMENTS table
DROP POLICY IF EXISTS "assignments_all_own" ON public.assignments;

CREATE POLICY "assignments_all_own" ON public.assignments 
  FOR ALL USING (
    listing_id IN (
      SELECT id FROM public.listings 
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- 5. SCHEDULE_ITEMS table - Fix multiple permissive policies issue
-- First drop all existing policies
DROP POLICY IF EXISTS "schedule_items_all_own" ON public.schedule_items;
DROP POLICY IF EXISTS "schedule_items_cleaner_view" ON public.schedule_items;

-- Create a single combined policy for better performance
CREATE POLICY "schedule_items_access" ON public.schedule_items 
  FOR SELECT USING (
    -- Owner access
    listing_id IN (
      SELECT id FROM public.listings 
      WHERE user_id = (SELECT auth.uid())
    )
    OR
    -- Cleaner access
    cleaner_id IN (
      SELECT cleaner_id FROM public.cleaner_sessions 
      WHERE token = (SELECT current_setting('app.cleaner_token', true))
        AND expires_at > NOW()
    )
  );

-- Owner-only policies for modification
CREATE POLICY "schedule_items_insert_owner" ON public.schedule_items 
  FOR INSERT WITH CHECK (
    listing_id IN (
      SELECT id FROM public.listings 
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "schedule_items_update_owner" ON public.schedule_items 
  FOR UPDATE USING (
    listing_id IN (
      SELECT id FROM public.listings 
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "schedule_items_delete_owner" ON public.schedule_items 
  FOR DELETE USING (
    listing_id IN (
      SELECT id FROM public.listings 
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- 6. MANUAL_SCHEDULE_RULES table
DROP POLICY IF EXISTS "manual_rules_all_own" ON public.manual_schedule_rules;

CREATE POLICY "manual_rules_all_own" ON public.manual_schedule_rules 
  FOR ALL USING (
    listing_id IN (
      SELECT id FROM public.listings 
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- 7. CLEANER_SESSIONS table
DROP POLICY IF EXISTS "cleaner_sessions_own_read" ON public.cleaner_sessions;

CREATE POLICY "cleaner_sessions_own_read" ON public.cleaner_sessions 
  FOR SELECT USING (
    cleaner_id IN (
      SELECT id FROM public.cleaners 
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- 8. CLEANER_FEEDBACK table
DROP POLICY IF EXISTS "feedback_owners_read" ON public.cleaner_feedback;
DROP POLICY IF EXISTS "feedback_cleaner_insert" ON public.cleaner_feedback;
DROP POLICY IF EXISTS "feedback_cleaner_update" ON public.cleaner_feedback;

CREATE POLICY "feedback_owners_read" ON public.cleaner_feedback 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.schedule_items si
      JOIN public.listings l ON si.listing_id = l.id
      WHERE si.id = cleaner_feedback.schedule_item_id
        AND l.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "feedback_cleaner_insert" ON public.cleaner_feedback 
  FOR INSERT WITH CHECK (
    cleaner_id IN (
      SELECT cleaner_id FROM public.cleaner_sessions 
      WHERE token = (SELECT current_setting('app.cleaner_token', true))
        AND expires_at > NOW()
    )
  );

CREATE POLICY "feedback_cleaner_update" ON public.cleaner_feedback 
  FOR UPDATE USING (
    cleaner_id IN (
      SELECT cleaner_id FROM public.cleaner_sessions 
      WHERE token = (SELECT current_setting('app.cleaner_token', true))
        AND expires_at > NOW()
    )
    AND completed_at > NOW() - INTERVAL '1 hour'
  );

-- 9. USER_SETTINGS table
DROP POLICY IF EXISTS "settings_all_own" ON public.user_settings;

CREATE POLICY "settings_all_own" ON public.user_settings 
  FOR ALL USING (user_id = (SELECT auth.uid()));

-- 10. NOTIFICATION_SCHEDULE table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notification_schedule') THEN
    EXECUTE 'DROP POLICY IF EXISTS "notification_schedule_all_own" ON public.notification_schedule';
    EXECUTE 'CREATE POLICY "notification_schedule_all_own" ON public.notification_schedule 
      FOR ALL USING (user_id = (SELECT auth.uid()))';
  END IF;
END $$;