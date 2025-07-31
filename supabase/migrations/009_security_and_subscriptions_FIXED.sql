-- =====================================================
-- CRITICAL SECURITY & SUBSCRIPTION MIGRATION (FIXED)
-- This version checks for table existence before applying RLS
-- =====================================================

-- =====================================================
-- 1. ENABLE RLS ON EXISTING TABLES (CRITICAL)
-- =====================================================
DO $$ 
BEGIN
    -- Enable RLS only on tables that exist
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'listings') THEN
        ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'cleaners') THEN
        ALTER TABLE public.cleaners ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'assignments') THEN
        ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'schedule_items') THEN
        ALTER TABLE public.schedule_items ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'manual_schedule_rules') THEN
        ALTER TABLE public.manual_schedule_rules ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'cleaner_auth_codes') THEN
        ALTER TABLE public.cleaner_auth_codes ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'cleaner_sessions') THEN
        ALTER TABLE public.cleaner_sessions ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'cleaner_feedback') THEN
        ALTER TABLE public.cleaner_feedback ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_settings') THEN
        ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

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
-- 5. CREATE POLICIES (Drop existing first to avoid conflicts)
-- =====================================================

-- PROFILES POLICIES
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "profiles_select_own" ON public.profiles 
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_update_own" ON public.profiles 
  FOR UPDATE USING (id = auth.uid());

-- LISTINGS POLICIES
DROP POLICY IF EXISTS "listings_all_own" ON public.listings;

CREATE POLICY "listings_all_own" ON public.listings 
  FOR ALL USING (user_id = auth.uid());

-- CLEANERS POLICIES
DROP POLICY IF EXISTS "cleaners_all_own" ON public.cleaners;

CREATE POLICY "cleaners_all_own" ON public.cleaners 
  FOR ALL USING (user_id = auth.uid());

-- ASSIGNMENTS POLICIES
DROP POLICY IF EXISTS "assignments_all_own" ON public.assignments;

CREATE POLICY "assignments_all_own" ON public.assignments 
  FOR ALL USING (
    listing_id IN (
      SELECT id FROM public.listings WHERE user_id = auth.uid()
    )
  );

-- SCHEDULE ITEMS POLICIES
DROP POLICY IF EXISTS "schedule_items_all_own" ON public.schedule_items;
DROP POLICY IF EXISTS "schedule_items_cleaner_view" ON public.schedule_items;

CREATE POLICY "schedule_items_all_own" ON public.schedule_items 
  FOR ALL USING (
    listing_id IN (
      SELECT id FROM public.listings WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "schedule_items_cleaner_view" ON public.schedule_items 
  FOR SELECT USING (
    cleaner_id IN (
      SELECT cleaner_id FROM public.cleaner_sessions
      WHERE id::text = current_setting('request.cookie.cleaner-session', true)
      AND expires_at > NOW()
    )
  );

-- MANUAL SCHEDULE RULES POLICIES (if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'manual_schedule_rules') THEN
        DROP POLICY IF EXISTS "manual_rules_all_own" ON public.manual_schedule_rules;
        
        CREATE POLICY "manual_rules_all_own" ON public.manual_schedule_rules 
          FOR ALL USING (
            listing_id IN (
              SELECT id FROM public.listings WHERE user_id = auth.uid()
            )
          );
    END IF;
END $$;

-- USER SETTINGS POLICIES (if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_settings') THEN
        DROP POLICY IF EXISTS "settings_all_own" ON public.user_settings;
        
        CREATE POLICY "settings_all_own" ON public.user_settings 
          FOR ALL USING (user_id = auth.uid());
    END IF;
END $$;

-- CLEANER AUTH CODES POLICIES (if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'cleaner_auth_codes') THEN
        DROP POLICY IF EXISTS "auth_codes_insert_only" ON public.cleaner_auth_codes;
        
        CREATE POLICY "auth_codes_insert_only" ON public.cleaner_auth_codes 
          FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- CLEANER SESSIONS POLICIES (if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'cleaner_sessions') THEN
        DROP POLICY IF EXISTS "cleaner_sessions_own_read" ON public.cleaner_sessions;
        
        CREATE POLICY "cleaner_sessions_own_read" ON public.cleaner_sessions 
          FOR SELECT USING (
            id::text = current_setting('request.cookie.cleaner-session', true)
            OR id::text = current_setting('request.header.x-cleaner-session', true)
          );
    END IF;
END $$;

-- CLEANER FEEDBACK POLICIES (if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'cleaner_feedback') THEN
        DROP POLICY IF EXISTS "feedback_owners_read" ON public.cleaner_feedback;
        DROP POLICY IF EXISTS "feedback_cleaner_insert" ON public.cleaner_feedback;
        DROP POLICY IF EXISTS "feedback_cleaner_update" ON public.cleaner_feedback;
        
        CREATE POLICY "feedback_owners_read" ON public.cleaner_feedback 
          FOR SELECT USING (
            schedule_item_id IN (
              SELECT si.id FROM public.schedule_items si 
              JOIN public.listings l ON l.id = si.listing_id 
              WHERE l.user_id = auth.uid()
            )
          );

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
    END IF;
END $$;

-- =====================================================
-- 6. NOTIFICATION SCHEDULE POLICIES
-- =====================================================
ALTER TABLE public.notification_schedule ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_schedule_all_own" ON public.notification_schedule;

CREATE POLICY "notification_schedule_all_own" ON public.notification_schedule 
  FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- 7. SUBSCRIPTION LIMITS POLICIES
-- =====================================================
ALTER TABLE public.subscription_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscription_limits_read_all" ON public.subscription_limits;

CREATE POLICY "subscription_limits_read_all" ON public.subscription_limits 
  FOR SELECT USING (true);

-- =====================================================
-- 8. FIX FUNCTION SEARCH PATHS (if they exist)
-- =====================================================
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_proc WHERE proname = 'handle_updated_at' AND pronamespace = 'public'::regnamespace) THEN
        ALTER FUNCTION public.handle_updated_at() SET search_path = public;
    END IF;
    
    IF EXISTS (SELECT FROM pg_proc WHERE proname = 'track_schedule_modification' AND pronamespace = 'public'::regnamespace) THEN
        ALTER FUNCTION public.track_schedule_modification() SET search_path = public;
    END IF;
END $$;

-- =====================================================
-- 9. SET ALL EXISTING USERS TO TRIAL
-- =====================================================
UPDATE public.profiles
SET 
  subscription_tier = COALESCE(subscription_tier, 'starter'),
  subscription_status = COALESCE(subscription_status, 'trial'),
  trial_ends_at = COALESCE(trial_ends_at, NOW() + INTERVAL '30 days')
WHERE subscription_tier IS NULL OR subscription_status IS NULL;

-- =====================================================
-- FINAL CHECK - Run this to see status
-- =====================================================
SELECT 
    'Security Status Check' as check_type,
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity) as tables_without_rls,
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity) as tables_with_rls,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_policies,
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity) = 0 
        THEN '✅ ALL TABLES SECURED'
        ELSE '❌ ' || (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity)::text || ' TABLES STILL UNPROTECTED'
    END as status;