-- Rollback script for Analytics Platform Database Schema
-- Version: 1.0.0
-- WARNING: This will DELETE all data in the analytics schema!

-- Disable RLS to allow deletion
ALTER TABLE IF EXISTS analytics.property_comparisons DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS analytics.insights DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS analytics.property_mappings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS analytics.data_sources DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS analytics.property_metrics DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS analytics.properties DISABLE ROW LEVEL SECURITY;

-- Drop policies
DROP POLICY IF EXISTS "Users can view own comparisons" ON analytics.property_comparisons;
DROP POLICY IF EXISTS "Users can insert own comparisons" ON analytics.property_comparisons;
DROP POLICY IF EXISTS "Users can update own comparisons" ON analytics.property_comparisons;
DROP POLICY IF EXISTS "Users can delete own comparisons" ON analytics.property_comparisons;

DROP POLICY IF EXISTS "Users can view insights for own properties" ON analytics.insights;
DROP POLICY IF EXISTS "Users can insert insights for own properties" ON analytics.insights;
DROP POLICY IF EXISTS "Users can update insights for own properties" ON analytics.insights;
DROP POLICY IF EXISTS "Users can delete insights for own properties" ON analytics.insights;

DROP POLICY IF EXISTS "Users can view mappings for own properties" ON analytics.property_mappings;
DROP POLICY IF EXISTS "Users can insert mappings for own properties" ON analytics.property_mappings;
DROP POLICY IF EXISTS "Users can update mappings for own properties" ON analytics.property_mappings;
DROP POLICY IF EXISTS "Users can delete mappings for own properties" ON analytics.property_mappings;

DROP POLICY IF EXISTS "Users can view data sources for own properties" ON analytics.data_sources;
DROP POLICY IF EXISTS "Users can insert data sources for own properties" ON analytics.data_sources;
DROP POLICY IF EXISTS "Users can update data sources for own properties" ON analytics.data_sources;
DROP POLICY IF EXISTS "Users can delete data sources for own properties" ON analytics.data_sources;

DROP POLICY IF EXISTS "Users can view metrics for own properties" ON analytics.property_metrics;
DROP POLICY IF EXISTS "Users can insert metrics for own properties" ON analytics.property_metrics;
DROP POLICY IF EXISTS "Users can update metrics for own properties" ON analytics.property_metrics;
DROP POLICY IF EXISTS "Users can delete metrics for own properties" ON analytics.property_metrics;

DROP POLICY IF EXISTS "Users can view own properties" ON analytics.properties;
DROP POLICY IF EXISTS "Users can insert own properties" ON analytics.properties;
DROP POLICY IF EXISTS "Users can update own properties" ON analytics.properties;
DROP POLICY IF EXISTS "Users can delete own properties" ON analytics.properties;

-- Drop triggers
DROP TRIGGER IF EXISTS update_properties_updated_at ON analytics.properties;
DROP TRIGGER IF EXISTS update_property_metrics_updated_at ON analytics.property_metrics;
DROP TRIGGER IF EXISTS update_property_mappings_updated_at ON analytics.property_mappings;

-- Drop function
DROP FUNCTION IF EXISTS analytics.update_updated_at_column();

-- Drop views
DROP VIEW IF EXISTS analytics.property_overview;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS analytics.property_comparisons;
DROP TABLE IF EXISTS analytics.insights;
DROP TABLE IF EXISTS analytics.property_mappings;
DROP TABLE IF EXISTS analytics.data_sources;
DROP TABLE IF EXISTS analytics.property_metrics;
DROP TABLE IF EXISTS analytics.properties;

-- Revoke permissions
REVOKE ALL ON ALL TABLES IN SCHEMA analytics FROM authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA analytics FROM authenticated;
REVOKE USAGE ON SCHEMA analytics FROM authenticated;

-- Drop schema (optional - uncomment if you want to completely remove the schema)
-- DROP SCHEMA IF EXISTS analytics CASCADE;