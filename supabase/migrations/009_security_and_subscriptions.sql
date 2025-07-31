-- =====================================================
-- CRITICAL SECURITY & SUBSCRIPTION MIGRATION
-- This migration MUST be applied to production immediately
-- =====================================================

-- =====================================================
-- 1. ENABLE RLS ON ALL PUBLIC TABLES (CRITICAL)
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
-- 2. ADD SUBSCRIPTION FIELDS TO PROFILES
-- =====================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS
  subscription_tier VARCHAR(20) DEFAULT 'starter' CHECK (subscription_tier IN ('free', 'starter', 'pro')),
  subscription_status VARCHAR(20) DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'cancelled', 'past_due')),
  trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  subscription_started_at TIMESTAMP WITH TIME ZONE,
  subscription_ends_at TIMESTAMP WITH TIME ZONE,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  payment_method_last4 VARCHAR(4),
  payment_method_brand VARCHAR(20);

-- =====================================================
-- 3. CREATE SUBSCRIPTION LIMITS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.subscription_limits (
  tier VARCHAR(20) PRIMARY KEY,
  max_listings INTEGER NOT NULL,
  max_cleaners INTEGER NOT NULL DEFAULT 999,
  sms_enabled BOOLEAN DEFAULT false,
  whatsapp_enabled BOOLEAN DEFAULT false,
  email_enabled BOOLEAN DEFAULT true,
  cleaner_dashboard BOOLEAN DEFAULT false,
  auto_assignment BOOLEAN DEFAULT false,
  daily_alerts BOOLEAN DEFAULT false,
  weekly_export BOOLEAN DEFAULT false,
  analytics_enabled BOOLEAN DEFAULT false,
  feedback_reminders BOOLEAN DEFAULT false
);

-- Insert tier limits
INSERT INTO public.subscription_limits VALUES
  ('free', 1, 2, false, false, true, false, false, false, false, false, false),
  ('starter', 3, 5, true, false, true, false, false, false, true, false, true),
  ('pro', 999, 999, true, true, true, true, true, true, true, true, true)
ON CONFLICT (tier) DO UPDATE SET
  max_listings = EXCLUDED.max_listings,
  max_cleaners = EXCLUDED.max_cleaners,
  sms_enabled = EXCLUDED.sms_enabled,
  whatsapp_enabled = EXCLUDED.whatsapp_enabled,
  email_enabled = EXCLUDED.email_enabled,
  cleaner_dashboard = EXCLUDED.cleaner_dashboard,
  auto_assignment = EXCLUDED.auto_assignment,
  daily_alerts = EXCLUDED.daily_alerts,
  weekly_export = EXCLUDED.weekly_export,
  analytics_enabled = EXCLUDED.analytics_enabled,
  feedback_reminders = EXCLUDED.feedback_reminders;

-- =====================================================
-- 4. CREATE NOTIFICATION TRACKING TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.notification_schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cleaner_id UUID REFERENCES public.cleaners(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('daily', 'weekly', 'feedback_reminder')),
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_notification_schedule_status ON public.notification_schedule(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notification_schedule_user ON public.notification_schedule(user_id);

-- =====================================================
-- 5. PROFILES POLICIES
-- =====================================================
CREATE POLICY "profiles_select_own" ON public.profiles 
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_update_own" ON public.profiles 
  FOR UPDATE USING (id = auth.uid());

-- =====================================================
-- 6. LISTINGS POLICIES
-- =====================================================
CREATE POLICY "listings_all_own" ON public.listings 
  FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- 7. CLEANERS POLICIES
-- =====================================================
CREATE POLICY "cleaners_all_own" ON public.cleaners 
  FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- 8. ASSIGNMENTS POLICIES
-- =====================================================
CREATE POLICY "assignments_all_own" ON public.assignments 
  FOR ALL USING (
    listing_id IN (
      SELECT id FROM public.listings WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 9. SCHEDULE ITEMS POLICIES
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
-- 10. MANUAL SCHEDULE RULES POLICIES
-- =====================================================
CREATE POLICY "manual_rules_all_own" ON public.manual_schedule_rules 
  FOR ALL USING (
    listing_id IN (
      SELECT id FROM public.listings WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 11. USER SETTINGS POLICIES
-- =====================================================
CREATE POLICY "settings_all_own" ON public.user_settings 
  FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- 12. SHARE TOKENS POLICIES
-- =====================================================
-- Anyone with a valid (non-expired) token can read
CREATE POLICY "share_tokens_valid_read" ON public.share_tokens 
  FOR SELECT USING (expires_at > NOW());

-- Owners can manage their share tokens
CREATE POLICY "share_tokens_manage_own" ON public.share_tokens 
  FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- 13. CLEANER AUTH CODES POLICIES
-- =====================================================
-- Anyone can insert auth codes (for SMS verification)
CREATE POLICY "auth_codes_insert_only" ON public.cleaner_auth_codes 
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- 14. CLEANER SESSIONS POLICIES
-- =====================================================
-- Cleaners can read their own sessions
CREATE POLICY "cleaner_sessions_own_read" ON public.cleaner_sessions 
  FOR SELECT USING (
    id::text = current_setting('request.cookie.cleaner-session', true)
    OR id::text = current_setting('request.header.x-cleaner-session', true)
  );

-- =====================================================
-- 15. CLEANER FEEDBACK POLICIES
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
-- 16. NOTIFICATION SCHEDULE POLICIES
-- =====================================================
-- Enable RLS
ALTER TABLE public.notification_schedule ENABLE ROW LEVEL SECURITY;

-- Owners can manage their notification schedules
CREATE POLICY "notification_schedule_all_own" ON public.notification_schedule 
  FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- 17. SUBSCRIPTION LIMITS POLICIES
-- =====================================================
-- Enable RLS
ALTER TABLE public.subscription_limits ENABLE ROW LEVEL SECURITY;

-- Everyone can read subscription limits (public information)
CREATE POLICY "subscription_limits_read_all" ON public.subscription_limits 
  FOR SELECT USING (true);

-- =====================================================
-- 18. FIX FUNCTION SEARCH PATHS
-- =====================================================
ALTER FUNCTION public.handle_updated_at() SET search_path = public;
ALTER FUNCTION public.track_schedule_modification() SET search_path = public;

-- =====================================================
-- 19. FIX SECURITY DEFINER VIEWS
-- =====================================================
-- Drop existing views with SECURITY DEFINER
DROP VIEW IF EXISTS public.cancelled_bookings CASCADE;
DROP VIEW IF EXISTS public.extended_bookings CASCADE;

-- Recreate views without SECURITY DEFINER
CREATE VIEW public.cancelled_bookings AS
SELECT * FROM public.schedule_items 
WHERE status = 'cancelled';

CREATE VIEW public.extended_bookings AS
SELECT * FROM public.schedule_items 
WHERE is_extended = true;

-- =====================================================
-- 20. SET ALL EXISTING USERS TO TRIAL
-- =====================================================
-- Give all existing users a 30-day trial starting now
UPDATE public.profiles
SET 
  subscription_tier = 'starter',
  subscription_status = 'trial',
  trial_ends_at = NOW() + INTERVAL '30 days'
WHERE subscription_tier IS NULL;

-- =====================================================
-- VERIFICATION QUERIES - RUN THESE AFTER MIGRATION
-- =====================================================
-- 1. Check RLS is enabled on all tables:
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename;

-- 2. Check policies were created:
-- SELECT tablename, policyname 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename, policyname;

-- 3. Check subscription fields were added:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles' 
-- AND column_name LIKE 'subscription%' 
-- ORDER BY column_name;