-- Fix critical security issues identified by Supabase audit
-- This migration enables RLS on all tables and creates appropriate policies

-- =====================================================
-- 1. ENABLE RLS ON ALL PUBLIC TABLES
-- =====================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleaners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_schedule_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleaner_auth_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleaner_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleaner_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. PROFILES POLICIES
-- =====================================================
CREATE POLICY "profiles_select_own" ON public.profiles 
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_update_own" ON public.profiles 
  FOR UPDATE USING (id = auth.uid());

-- =====================================================
-- 3. LISTINGS POLICIES
-- =====================================================
CREATE POLICY "listings_all_own" ON public.listings 
  FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- 4. CLEANERS POLICIES
-- =====================================================
CREATE POLICY "cleaners_all_own" ON public.cleaners 
  FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- 5. ASSIGNMENTS POLICIES
-- =====================================================
CREATE POLICY "assignments_all_own" ON public.assignments 
  FOR ALL USING (
    listing_id IN (
      SELECT id FROM public.listings WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 6. SCHEDULE ITEMS POLICIES
-- =====================================================
-- Owners can manage their schedule items
CREATE POLICY "schedule_items_all_own" ON public.schedule_items 
  FOR ALL USING (
    listing_id IN (
      SELECT id FROM public.listings WHERE user_id = auth.uid()
    )
  );

-- Cleaners can view their assigned schedule items via session
CREATE POLICY "schedule_items_cleaner_view" ON public.schedule_items 
  FOR SELECT USING (
    cleaner_id IN (
      SELECT cleaner_id FROM public.cleaner_sessions
      WHERE id::text = current_setting('request.cookie.cleaner-session', true)
      AND expires_at > NOW()
    )
  );

-- =====================================================
-- 7. MANUAL SCHEDULE RULES POLICIES
-- =====================================================
CREATE POLICY "manual_rules_all_own" ON public.manual_schedule_rules 
  FOR ALL USING (
    listing_id IN (
      SELECT id FROM public.listings WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 8. USER SETTINGS POLICIES
-- =====================================================
CREATE POLICY "settings_all_own" ON public.user_settings 
  FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- 9. SHARE TOKENS POLICIES
-- =====================================================
-- Anyone with a valid (non-expired) token can read
CREATE POLICY "share_tokens_valid_read" ON public.share_tokens 
  FOR SELECT USING (expires_at > NOW());

-- Owners can manage their share tokens
CREATE POLICY "share_tokens_manage_own" ON public.share_tokens 
  FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- 10. CLEANER AUTH CODES POLICIES
-- =====================================================
-- Anyone can insert auth codes (for SMS verification)
CREATE POLICY "auth_codes_insert_only" ON public.cleaner_auth_codes 
  FOR INSERT WITH CHECK (true);

-- System can delete expired codes (no user policy needed)

-- =====================================================
-- 11. CLEANER SESSIONS POLICIES
-- =====================================================
-- Cleaners can read their own sessions
CREATE POLICY "cleaner_sessions_own_read" ON public.cleaner_sessions 
  FOR SELECT USING (
    id::text = current_setting('request.cookie.cleaner-session', true)
    OR id::text = current_setting('request.header.x-cleaner-session', true)
  );

-- =====================================================
-- 12. CLEANER FEEDBACK POLICIES
-- =====================================================
-- Property owners can read feedback for their properties
CREATE POLICY "feedback_owners_read" ON public.cleaner_feedback 
  FOR SELECT USING (
    schedule_item_id IN (
      SELECT si.id FROM public.schedule_items si 
      JOIN public.listings l ON l.id = si.listing_id 
      WHERE l.user_id = auth.uid()
    )
  );

-- Cleaners can insert feedback for their assigned cleanings
CREATE POLICY "feedback_cleaner_insert" ON public.cleaner_feedback 
  FOR INSERT WITH CHECK (
    schedule_item_id IN (
      SELECT si.id FROM public.schedule_items si
      WHERE si.cleaner_id IN (
        SELECT cleaner_id FROM public.cleaner_sessions
        WHERE id::text = current_setting('request.cookie.cleaner-session', true)
        AND expires_at > NOW()
      )
    )
  );

-- Cleaners can update their own feedback
CREATE POLICY "feedback_cleaner_update" ON public.cleaner_feedback 
  FOR UPDATE USING (
    schedule_item_id IN (
      SELECT si.id FROM public.schedule_items si
      WHERE si.cleaner_id IN (
        SELECT cleaner_id FROM public.cleaner_sessions
        WHERE id::text = current_setting('request.cookie.cleaner-session', true)
        AND expires_at > NOW()
      )
    )
  );

-- =====================================================
-- 13. FIX FUNCTION SEARCH PATHS
-- =====================================================
ALTER FUNCTION public.handle_updated_at() SET search_path = public;
ALTER FUNCTION public.track_schedule_modification() SET search_path = public;

-- =====================================================
-- 14. FIX SECURITY DEFINER VIEWS
-- =====================================================
-- Drop existing views with SECURITY DEFINER
DROP VIEW IF EXISTS public.cancelled_bookings CASCADE;
DROP VIEW IF EXISTS public.extended_bookings CASCADE;

-- Recreate views without SECURITY DEFINER
-- These views will now respect RLS policies
CREATE VIEW public.cancelled_bookings AS
SELECT * FROM public.schedule_items 
WHERE status = 'cancelled';

CREATE VIEW public.extended_bookings AS
SELECT * FROM public.schedule_items 
WHERE is_extended = true;

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================
-- Run this after migration to verify RLS is enabled:
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename;