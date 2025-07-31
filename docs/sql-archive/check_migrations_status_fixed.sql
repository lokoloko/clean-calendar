-- Check Migration Status and Database State
-- Run these queries in Supabase SQL Editor

-- 1. Check migration table schema first
SELECT 
    table_schema,
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name LIKE '%migration%'
ORDER BY table_schema, table_name, ordinal_position;

-- 2. Check RLS status on all tables (CRITICAL)
SELECT 
    schemaname,
    tablename,
    CASE WHEN rowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END as rls_status,
    CASE 
        WHEN rowsecurity THEN 'Secure'
        ELSE 'SECURITY RISK - RLS DISABLED!'
    END as security_assessment
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY 
    CASE WHEN rowsecurity THEN 1 ELSE 0 END,
    tablename;

-- 3. Count policies per table
SELECT 
    pt.tablename,
    COALESCE(policy_count, 0) as policy_count,
    CASE 
        WHEN pt.rowsecurity AND COALESCE(policy_count, 0) = 0 THEN '⚠️ RLS enabled but NO POLICIES'
        WHEN pt.rowsecurity AND COALESCE(policy_count, 0) > 0 THEN '✅ RLS with policies'
        ELSE '❌ No RLS'
    END as status
FROM pg_tables pt
LEFT JOIN (
    SELECT 
        tablename,
        COUNT(*) as policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    GROUP BY tablename
) pp ON pt.tablename = pp.tablename
WHERE pt.schemaname = 'public'
ORDER BY 
    CASE 
        WHEN pt.rowsecurity AND COALESCE(policy_count, 0) = 0 THEN 0
        WHEN NOT pt.rowsecurity THEN 1
        ELSE 2
    END,
    pt.tablename;

-- 4. Show all policies (limited view)
SELECT 
    tablename,
    policyname,
    permissive,
    cmd,
    substring(qual, 1, 100) as policy_condition_preview
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 5. Summary of tables without RLS (SECURITY RISKS)
SELECT 
    COUNT(*) as tables_without_rls,
    string_agg(tablename, ', ') as unprotected_tables
FROM pg_tables 
WHERE schemaname = 'public' 
AND NOT rowsecurity;

-- 6. Check if specific security policies exist
SELECT 
    'Security Policies Check' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_policies WHERE policyname LIKE '%own%' AND schemaname = 'public')
        THEN '✅ Found ownership-based policies'
        ELSE '❌ No ownership policies found'
    END as status;

-- 7. List all tables for reference
SELECT 
    tablename,
    CASE 
        WHEN tablename IN ('profiles', 'listings', 'cleaners', 'assignments', 'schedule_items', 
                          'manual_schedule_rules', 'share_tokens', 'cleaner_auth_codes', 
                          'cleaner_sessions', 'cleaner_feedback', 'user_settings')
        THEN '🎯 Core table'
        ELSE '📊 Other table'
    END as table_type
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY table_type DESC, tablename;