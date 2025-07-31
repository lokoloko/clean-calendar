-- =====================================================
-- FINAL SECURITY VERIFICATION
-- =====================================================

-- 1. Check for any views with SECURITY DEFINER
SELECT 
    schemaname,
    viewname,
    CASE 
        WHEN definition LIKE '%SECURITY DEFINER%' THEN '❌ HAS SECURITY DEFINER'
        ELSE '✅ OK - No SECURITY DEFINER'
    END as status
FROM pg_views 
WHERE schemaname = 'public'
ORDER BY viewname;

-- 2. Verify RLS is enabled on all tables
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ RLS ENABLED'
        ELSE '❌ RLS DISABLED - VULNERABLE!'
    END as security_status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY rowsecurity DESC, tablename;

-- 3. Count security policies
SELECT 
    tablename,
    COUNT(*) as policy_count,
    CASE 
        WHEN COUNT(*) = 0 THEN '⚠️ NO POLICIES'
        ELSE '✅ ' || COUNT(*) || ' policies'
    END as status
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- 4. Final summary
SELECT 
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity) as tables_without_rls,
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity) as tables_with_rls,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_policies,
    (SELECT COUNT(*) FROM pg_views WHERE schemaname = 'public' AND definition LIKE '%SECURITY DEFINER%') as views_with_security_definer,
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity) = 0 
         AND (SELECT COUNT(*) FROM pg_views WHERE schemaname = 'public' AND definition LIKE '%SECURITY DEFINER%') = 0
        THEN '✅ ALL SECURE'
        ELSE '❌ SECURITY ISSUES REMAIN'
    END as overall_status;