-- Verification script for Analytics Platform Database Schema
-- Run this after migration to verify everything was created correctly

-- Check if schema exists
SELECT EXISTS (
    SELECT 1 FROM information_schema.schemata 
    WHERE schema_name = 'analytics'
) AS analytics_schema_exists;

-- Check tables
SELECT 
    table_name,
    CASE 
        WHEN table_name IS NOT NULL THEN '✓ Created'
        ELSE '✗ Missing'
    END AS status
FROM (
    VALUES 
        ('properties'),
        ('property_metrics'),
        ('data_sources'),
        ('property_mappings'),
        ('insights'),
        ('property_comparisons')
) AS expected(table_name)
LEFT JOIN information_schema.tables actual 
    ON actual.table_schema = 'analytics' 
    AND actual.table_name = expected.table_name
ORDER BY expected.table_name;

-- Check views
SELECT 
    table_name AS view_name,
    CASE 
        WHEN table_name IS NOT NULL THEN '✓ Created'
        ELSE '✗ Missing'
    END AS status
FROM (
    VALUES ('property_overview')
) AS expected(table_name)
LEFT JOIN information_schema.views actual 
    ON actual.table_schema = 'analytics' 
    AND actual.table_name = expected.table_name;

-- Check indexes
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'analytics'
ORDER BY tablename, indexname;

-- Check RLS is enabled
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity = true THEN '✓ Enabled'
        ELSE '✗ Disabled'
    END AS rls_status
FROM pg_tables
WHERE schemaname = 'analytics'
ORDER BY tablename;

-- Check policies
SELECT 
    tablename,
    policyname,
    cmd AS operation,
    roles
FROM pg_policies
WHERE schemaname = 'analytics'
ORDER BY tablename, policyname;

-- Check constraints
SELECT 
    conrelid::regclass AS table_name,
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE connamespace = 'analytics'::regnamespace
ORDER BY conrelid::regclass::text, conname;

-- Check triggers
SELECT 
    trigger_schema,
    event_object_table AS table_name,
    trigger_name,
    event_manipulation AS trigger_event,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'analytics'
ORDER BY event_object_table, trigger_name;

-- Check column details for key tables
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'analytics'
    AND table_name IN ('properties', 'property_metrics')
ORDER BY table_name, ordinal_position;

-- Summary
SELECT 
    'Summary' AS check_type,
    COUNT(DISTINCT table_name) AS tables_count,
    COUNT(DISTINCT indexname) AS indexes_count,
    COUNT(DISTINCT policyname) AS policies_count
FROM (
    SELECT table_name FROM information_schema.tables WHERE table_schema = 'analytics'
) t
CROSS JOIN (
    SELECT indexname FROM pg_indexes WHERE schemaname = 'analytics'
) i
CROSS JOIN (
    SELECT policyname FROM pg_policies WHERE schemaname = 'analytics'
) p;