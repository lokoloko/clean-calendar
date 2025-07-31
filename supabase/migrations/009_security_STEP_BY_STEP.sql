-- =====================================================
-- STEP 1: ENABLE RLS ON ALL TABLES (RUN THIS FIRST)
-- =====================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleaners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleaner_feedback ENABLE ROW LEVEL SECURITY;

-- Check if these tables exist before enabling RLS
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'manual_schedule_rules') THEN
        ALTER TABLE public.manual_schedule_rules ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'cleaner_auth_codes') THEN
        ALTER TABLE public.cleaner_auth_codes ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'cleaner_sessions') THEN
        ALTER TABLE public.cleaner_sessions ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_settings') THEN
        ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- =====================================================
-- STEP 2: ADD SUBSCRIPTION COLUMNS
-- =====================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) DEFAULT 'starter';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'trial';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days');
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS payment_method_last4 VARCHAR(4);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS payment_method_brand VARCHAR(20);

-- =====================================================
-- STEP 3: CREATE SUBSCRIPTION LIMITS TABLE
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
ON CONFLICT (tier) DO NOTHING;

-- Enable RLS on subscription_limits
ALTER TABLE public.subscription_limits ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 4: CREATE NOTIFICATION TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.notification_schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cleaner_id UUID REFERENCES public.cleaners(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notification_schedule ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 5: CREATE BASIC POLICIES
-- =====================================================

-- Profiles policies
CREATE POLICY "profiles_select_own" ON public.profiles 
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_update_own" ON public.profiles 
  FOR UPDATE USING (id = auth.uid());

-- Listings policies
CREATE POLICY "listings_all_own" ON public.listings 
  FOR ALL USING (user_id = auth.uid());

-- Cleaners policies
CREATE POLICY "cleaners_all_own" ON public.cleaners 
  FOR ALL USING (user_id = auth.uid());

-- Assignments policies
CREATE POLICY "assignments_all_own" ON public.assignments 
  FOR ALL USING (
    listing_id IN (
      SELECT id FROM public.listings WHERE user_id = auth.uid()
    )
  );

-- Schedule items policies
CREATE POLICY "schedule_items_all_own" ON public.schedule_items 
  FOR ALL USING (
    listing_id IN (
      SELECT id FROM public.listings WHERE user_id = auth.uid()
    )
  );

-- Subscription limits policy (everyone can read)
CREATE POLICY "subscription_limits_read_all" ON public.subscription_limits 
  FOR SELECT USING (true);

-- Notification schedule policy
CREATE POLICY "notification_schedule_all_own" ON public.notification_schedule 
  FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- STEP 6: SET EXISTING USERS TO TRIAL
-- =====================================================
UPDATE public.profiles
SET 
  subscription_tier = COALESCE(subscription_tier, 'starter'),
  subscription_status = COALESCE(subscription_status, 'trial'),
  trial_ends_at = COALESCE(trial_ends_at, NOW() + INTERVAL '30 days');

-- =====================================================
-- VERIFICATION QUERY - RUN THIS LAST
-- =====================================================
SELECT 
    tablename,
    CASE WHEN rowsecurity THEN '✅ SECURED' ELSE '❌ VULNERABLE' END as status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY rowsecurity DESC, tablename;