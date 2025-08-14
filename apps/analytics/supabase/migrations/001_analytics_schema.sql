-- Analytics Platform Database Schema
-- Version: 1.0.0
-- Description: Initial schema for GoStudioM Analytics Platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create analytics schema
CREATE SCHEMA IF NOT EXISTS analytics;

-- Set search path
SET search_path TO analytics, public;

-- ============================================
-- 1. PROPERTIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS analytics.properties (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    listing_id TEXT, -- Reference to calendar app listing if linked
    name TEXT NOT NULL,
    standard_name TEXT,
    airbnb_url TEXT,
    airbnb_listing_id TEXT,
    address TEXT,
    property_type TEXT,
    data_completeness INTEGER DEFAULT 0 CHECK (data_completeness >= 0 AND data_completeness <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_synced_at TIMESTAMPTZ
);

-- Indexes for properties
CREATE INDEX idx_properties_user_id ON analytics.properties(user_id);
CREATE INDEX idx_properties_listing_id ON analytics.properties(listing_id);
CREATE INDEX idx_properties_name ON analytics.properties(name);
CREATE UNIQUE INDEX idx_properties_user_name ON analytics.properties(user_id, name);

-- ============================================
-- 2. PROPERTY_METRICS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS analytics.property_metrics (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    property_id TEXT NOT NULL REFERENCES analytics.properties(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Financial Metrics
    revenue DECIMAL(12,2) DEFAULT 0,
    gross_earnings DECIMAL(12,2) DEFAULT 0,
    service_fees DECIMAL(12,2) DEFAULT 0,
    net_earnings DECIMAL(12,2) DEFAULT 0,
    
    -- Occupancy Metrics
    occupancy_rate DECIMAL(5,2) DEFAULT 0 CHECK (occupancy_rate >= 0 AND occupancy_rate <= 100),
    total_nights INTEGER DEFAULT 0,
    total_bookings INTEGER DEFAULT 0,
    
    -- Pricing Metrics
    avg_nightly_rate DECIMAL(10,2) DEFAULT 0,
    min_nightly_rate DECIMAL(10,2),
    max_nightly_rate DECIMAL(10,2),
    
    -- Stay Metrics
    avg_stay_length DECIMAL(5,2) DEFAULT 0,
    
    -- Source and Quality
    source TEXT CHECK (source IN ('pdf', 'csv', 'scraped', 'calculated')),
    confidence INTEGER DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 100),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for property_metrics
CREATE INDEX idx_metrics_property_id ON analytics.property_metrics(property_id);
CREATE INDEX idx_metrics_period ON analytics.property_metrics(period_start, period_end);
CREATE UNIQUE INDEX idx_metrics_property_period_source 
    ON analytics.property_metrics(property_id, period_start, period_end, source);

-- ============================================
-- 3. DATA_SOURCES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS analytics.data_sources (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    property_id TEXT NOT NULL REFERENCES analytics.properties(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('pdf', 'csv', 'scraped')),
    
    -- Raw data storage (JSONB for flexibility)
    data JSONB NOT NULL,
    
    -- Metadata
    file_name TEXT,
    file_size INTEGER,
    mime_type TEXT,
    
    -- Time period covered by this data
    period_start DATE,
    period_end DATE,
    
    -- Upload/sync information
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    uploaded_by UUID REFERENCES auth.users(id),
    
    -- Processing status
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMPTZ,
    processing_errors JSONB
);

-- Indexes for data_sources
CREATE INDEX idx_data_sources_property_id ON analytics.data_sources(property_id);
CREATE INDEX idx_data_sources_type ON analytics.data_sources(type);
CREATE INDEX idx_data_sources_uploaded_at ON analytics.data_sources(uploaded_at DESC);
-- Note: Removing unique constraint to allow multiple versions of same type
-- CREATE UNIQUE INDEX idx_data_sources_property_type ON analytics.data_sources(property_id, type);

-- ============================================
-- 4. PROPERTY_MAPPINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS analytics.property_mappings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    property_id TEXT NOT NULL REFERENCES analytics.properties(id) ON DELETE CASCADE,
    source_name TEXT NOT NULL, -- Name as it appears in source
    source_type TEXT NOT NULL CHECK (source_type IN ('pdf', 'csv', 'airbnb')),
    mapped_name TEXT NOT NULL, -- Standardized name
    confidence DECIMAL(5,2) DEFAULT 100 CHECK (confidence >= 0 AND confidence <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for property_mappings
CREATE INDEX idx_mappings_property_id ON analytics.property_mappings(property_id);
CREATE UNIQUE INDEX idx_mappings_source ON analytics.property_mappings(source_name, source_type);

-- ============================================
-- 5. INSIGHTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS analytics.insights (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    property_id TEXT NOT NULL REFERENCES analytics.properties(id) ON DELETE CASCADE,
    
    -- Insight categorization
    type TEXT CHECK (type IN ('actionable', 'analysis', 'prediction', 'coaching')),
    priority TEXT CHECK (priority IN ('critical', 'important', 'opportunity')),
    category TEXT,
    
    -- Content
    title TEXT NOT NULL,
    description TEXT,
    impact TEXT, -- Expected impact if implemented
    effort TEXT CHECK (effort IN ('low', 'medium', 'high')),
    
    -- Automation
    automatable BOOLEAN DEFAULT FALSE,
    automation_config JSONB,
    
    -- Status tracking
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'implemented', 'dismissed')),
    implemented_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    dismissed_reason TEXT,
    
    -- Validity
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    confidence DECIMAL(5,2) DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 100)
);

-- Indexes for insights
CREATE INDEX idx_insights_property_id ON analytics.insights(property_id);
CREATE INDEX idx_insights_status ON analytics.insights(status);
CREATE INDEX idx_insights_priority ON analytics.insights(priority);
CREATE INDEX idx_insights_created_at ON analytics.insights(created_at DESC);

-- ============================================
-- 6. PROPERTY_COMPARISONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS analytics.property_comparisons (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    property_ids TEXT[] NOT NULL,
    comparison_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for property_comparisons
CREATE INDEX idx_comparisons_user_id ON analytics.property_comparisons(user_id);
CREATE INDEX idx_comparisons_created_at ON analytics.property_comparisons(created_at DESC);

-- ============================================
-- 7. PROPERTY_OVERVIEW VIEW
-- ============================================
CREATE OR REPLACE VIEW analytics.property_overview AS
SELECT 
    p.id,
    p.user_id,
    p.listing_id,
    p.name,
    p.standard_name,
    p.airbnb_url,
    p.airbnb_listing_id,
    p.data_completeness,
    p.created_at,
    p.updated_at,
    p.last_synced_at,
    
    -- Latest metrics
    m.revenue,
    m.occupancy_rate,
    m.avg_nightly_rate,
    m.total_nights,
    m.total_bookings,
    m.avg_stay_length,
    m.period_start,
    m.period_end,
    m.source,
    m.confidence
FROM 
    analytics.properties p
    LEFT JOIN LATERAL (
        SELECT * FROM analytics.property_metrics
        WHERE property_id = p.id
        ORDER BY period_end DESC, confidence DESC
        LIMIT 1
    ) m ON TRUE;

-- ============================================
-- 8. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE analytics.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.property_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.property_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.property_comparisons ENABLE ROW LEVEL SECURITY;

-- Properties policies
CREATE POLICY "Users can view own properties" ON analytics.properties
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own properties" ON analytics.properties
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own properties" ON analytics.properties
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own properties" ON analytics.properties
    FOR DELETE USING (auth.uid() = user_id);

-- Property metrics policies
CREATE POLICY "Users can view metrics for own properties" ON analytics.property_metrics
    FOR SELECT USING (
        property_id IN (
            SELECT id FROM analytics.properties WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert metrics for own properties" ON analytics.property_metrics
    FOR INSERT WITH CHECK (
        property_id IN (
            SELECT id FROM analytics.properties WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update metrics for own properties" ON analytics.property_metrics
    FOR UPDATE USING (
        property_id IN (
            SELECT id FROM analytics.properties WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete metrics for own properties" ON analytics.property_metrics
    FOR DELETE USING (
        property_id IN (
            SELECT id FROM analytics.properties WHERE user_id = auth.uid()
        )
    );

-- Data sources policies
CREATE POLICY "Users can view data sources for own properties" ON analytics.data_sources
    FOR SELECT USING (
        property_id IN (
            SELECT id FROM analytics.properties WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert data sources for own properties" ON analytics.data_sources
    FOR INSERT WITH CHECK (
        property_id IN (
            SELECT id FROM analytics.properties WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update data sources for own properties" ON analytics.data_sources
    FOR UPDATE USING (
        property_id IN (
            SELECT id FROM analytics.properties WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete data sources for own properties" ON analytics.data_sources
    FOR DELETE USING (
        property_id IN (
            SELECT id FROM analytics.properties WHERE user_id = auth.uid()
        )
    );

-- Property mappings policies
CREATE POLICY "Users can view mappings for own properties" ON analytics.property_mappings
    FOR SELECT USING (
        property_id IN (
            SELECT id FROM analytics.properties WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert mappings for own properties" ON analytics.property_mappings
    FOR INSERT WITH CHECK (
        property_id IN (
            SELECT id FROM analytics.properties WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update mappings for own properties" ON analytics.property_mappings
    FOR UPDATE USING (
        property_id IN (
            SELECT id FROM analytics.properties WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete mappings for own properties" ON analytics.property_mappings
    FOR DELETE USING (
        property_id IN (
            SELECT id FROM analytics.properties WHERE user_id = auth.uid()
        )
    );

-- Insights policies
CREATE POLICY "Users can view insights for own properties" ON analytics.insights
    FOR SELECT USING (
        property_id IN (
            SELECT id FROM analytics.properties WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert insights for own properties" ON analytics.insights
    FOR INSERT WITH CHECK (
        property_id IN (
            SELECT id FROM analytics.properties WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update insights for own properties" ON analytics.insights
    FOR UPDATE USING (
        property_id IN (
            SELECT id FROM analytics.properties WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete insights for own properties" ON analytics.insights
    FOR DELETE USING (
        property_id IN (
            SELECT id FROM analytics.properties WHERE user_id = auth.uid()
        )
    );

-- Property comparisons policies
CREATE POLICY "Users can view own comparisons" ON analytics.property_comparisons
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own comparisons" ON analytics.property_comparisons
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comparisons" ON analytics.property_comparisons
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comparisons" ON analytics.property_comparisons
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 9. GRANTS
-- ============================================
GRANT USAGE ON SCHEMA analytics TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA analytics TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA analytics TO authenticated;

-- ============================================
-- 10. TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION analytics.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON analytics.properties
    FOR EACH ROW EXECUTE FUNCTION analytics.update_updated_at_column();

CREATE TRIGGER update_property_metrics_updated_at BEFORE UPDATE ON analytics.property_metrics
    FOR EACH ROW EXECUTE FUNCTION analytics.update_updated_at_column();

CREATE TRIGGER update_property_mappings_updated_at BEFORE UPDATE ON analytics.property_mappings
    FOR EACH ROW EXECUTE FUNCTION analytics.update_updated_at_column();

-- ============================================
-- 11. COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON SCHEMA analytics IS 'GoStudioM Analytics Platform schema for property metrics and insights';
COMMENT ON TABLE analytics.properties IS 'Core table storing Airbnb property information';
COMMENT ON TABLE analytics.property_metrics IS 'Time-series metrics for property performance';
COMMENT ON TABLE analytics.data_sources IS 'Raw data from PDF, CSV, and web scraping sources';
COMMENT ON TABLE analytics.property_mappings IS 'Maps property names across different data sources';
COMMENT ON TABLE analytics.insights IS 'AI-generated insights and recommendations';
COMMENT ON TABLE analytics.property_comparisons IS 'Saved property comparison sessions';
COMMENT ON VIEW analytics.property_overview IS 'Aggregated view of properties with latest metrics';