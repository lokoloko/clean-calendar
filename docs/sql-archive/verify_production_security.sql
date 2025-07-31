-- =====================================================
-- PRODUCTION SECURITY VERIFICATION QUERIES
-- Run these in Supabase SQL Editor after applying migration
-- =====================================================

-- 1. CHECK RLS STATUS (ALL SHOULD BE TRUE)
SELECT 
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ SECURE' 
        ELSE '❌ VULNERABLE - NO RLS!' 
    END as security_status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY rowsecurity, tablename;

-- 2. CHECK POLICY COUNT (SHOULD HAVE AT LEAST 1 PER TABLE)
SELECT 
    pt.tablename,
    pt.rowsecurity as rls_enabled,
    COUNT(pp.policyname) as policy_count,
    CASE 
        WHEN NOT pt.rowsecurity THEN '❌ NO RLS'
        WHEN COUNT(pp.policyname) = 0 THEN '⚠️ RLS ENABLED BUT NO POLICIES'
        ELSE '✅ SECURED'
    END as status
FROM pg_tables pt
LEFT JOIN pg_policies pp ON pt.tablename = pp.tablename AND pp.schemaname = 'public'
WHERE pt.schemaname = 'public'
GROUP BY pt.tablename, pt.rowsecurity
ORDER BY 
    CASE 
        WHEN NOT pt.rowsecurity THEN 0
        WHEN COUNT(pp.policyname) = 0 THEN 1
        ELSE 2
    END,
    pt.tablename;

-- 3. CHECK SUBSCRIPTION FIELDS WERE ADDED
SELECT 
    column_name,
    data_type,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'profiles'
    AND column_name IN (
        'subscription_tier',
        'subscription_status',
        'trial_ends_at',
        'stripe_customer_id'
    )
ORDER BY column_name;

-- 4. CHECK SUBSCRIPTION LIMITS TABLE
SELECT * FROM public.subscription_limits ORDER BY tier;

-- 5. QUICK SECURITY SUMMARY
SELECT 
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity) as tables_without_rls,
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity) as tables_with_rls,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_policies,
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity) = 0 
        THEN '✅ ALL TABLES SECURED'
        ELSE '❌ SECURITY RISK - SOME TABLES UNPROTECTED'
    END as overall_status;