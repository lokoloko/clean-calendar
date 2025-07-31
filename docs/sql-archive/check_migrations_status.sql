-- Check Migration Status and Database State
-- Run these queries in Supabase SQL Editor

-- 1. Check if migration tracking table exists and show applied migrations
SELECT 
    name as migration_name,
    executed_at,
    hash
FROM supabase_migrations.schema_migrations
ORDER BY executed_at DESC;

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

-- 4. Show all policies
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 5. Check for the specific security migration
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM supabase_migrations.schema_migrations 
            WHERE name LIKE '%fix_critical_security_issues%'
        ) THEN '✅ Security migration HAS been applied'
        ELSE '❌ Security migration NOT applied - CRITICAL!'
    END as security_migration_status;

-- 6. Summary of tables without RLS (SECURITY RISKS)
SELECT 
    'Tables without RLS: ' || string_agg(tablename, ', ') as security_issues
FROM pg_tables 
WHERE schemaname = 'public' 
AND NOT rowsecurity;