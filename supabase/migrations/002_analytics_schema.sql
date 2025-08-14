-- Analytics Platform Schema
-- This extends the calendar database with analytics-specific tables

-- Create analytics schema for separation
CREATE SCHEMA IF NOT EXISTS analytics;

-- Analytics properties table (can be linked to calendar listings)
CREATE TABLE IF NOT EXISTS analytics.properties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL, -- Optional link to calendar listing
    name TEXT NOT NULL,
    standard_name TEXT,
    airbnb_url TEXT,
    data_completeness INTEGER DEFAULT 0 CHECK (data_completeness >= 0 AND data_completeness <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- Property metrics table
CREATE TABLE IF NOT EXISTS analytics.property_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES analytics.properties(id) ON DELETE CASCADE NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    revenue DECIMAL(12,2) DEFAULT 0,
    occupancy_rate DECIMAL(5,2) DEFAULT 0 CHECK (occupancy_rate >= 0 AND occupancy_rate <= 100),
    avg_nightly_rate DECIMAL(10,2) DEFAULT 0,
    total_nights INTEGER DEFAULT 0,
    total_bookings INTEGER DEFAULT 0,
    avg_stay_length DECIMAL(4,1) DEFAULT 0,
    source VARCHAR(20) CHECK (source IN ('pdf', 'csv', 'scraped', 'calculated')),
    confidence INTEGER DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(property_id, period_start, period_end, source)
);

-- Data sources table (stores raw uploaded data)
CREATE TABLE IF NOT EXISTS analytics.data_sources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES analytics.properties(id) ON DELETE CASCADE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('pdf', 'csv', 'scraped')),
    data JSONB NOT NULL,
    file_name TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    period_start DATE,
    period_end DATE
);

-- Property insights table (AI-generated insights)
CREATE TABLE IF NOT EXISTS analytics.insights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES analytics.properties(id) ON DELETE CASCADE NOT NULL,
    type VARCHAR(50) CHECK (type IN ('actionable', 'analysis', 'prediction', 'coaching')),
    priority VARCHAR(20) CHECK (priority IN ('critical', 'important', 'opportunity')),
    category VARCHAR(50),
    title TEXT NOT NULL,
    description TEXT,
    impact TEXT,
    effort VARCHAR(20) CHECK (effort IN ('low', 'medium', 'high')),
    automatable BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'implemented', 'dismissed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- Property comparisons table (for comparing multiple properties)
CREATE TABLE IF NOT EXISTS analytics.property_comparisons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT,
    property_ids UUID[] NOT NULL,
    comparison_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_analytics_properties_user_id ON analytics.properties(user_id);
CREATE INDEX idx_analytics_properties_listing_id ON analytics.properties(listing_id);
CREATE INDEX idx_analytics_metrics_property_id ON analytics.property_metrics(property_id);
CREATE INDEX idx_analytics_metrics_period ON analytics.property_metrics(period_start, period_end);
CREATE INDEX idx_analytics_data_sources_property_id ON analytics.data_sources(property_id);
CREATE INDEX idx_analytics_data_sources_type ON analytics.data_sources(type);
CREATE INDEX idx_analytics_insights_property_id ON analytics.insights(property_id);
CREATE INDEX idx_analytics_insights_status ON analytics.insights(status);

-- Create updated_at triggers
CREATE TRIGGER handle_analytics_properties_updated_at 
    BEFORE UPDATE ON analytics.properties
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_analytics_metrics_updated_at 
    BEFORE UPDATE ON analytics.property_metrics
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Row Level Security (RLS) Policies
ALTER TABLE analytics.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.property_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.property_comparisons ENABLE ROW LEVEL SECURITY;

-- Policies for properties table
CREATE POLICY "Users can view their own properties" 
    ON analytics.properties FOR SELECT 
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can create their own properties" 
    ON analytics.properties FOR INSERT 
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own properties" 
    ON analytics.properties FOR UPDATE 
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own properties" 
    ON analytics.properties FOR DELETE 
    USING (user_id = (SELECT auth.uid()));

-- Policies for property_metrics table
CREATE POLICY "Users can view metrics for their properties" 
    ON analytics.property_metrics FOR SELECT 
    USING (property_id IN (
        SELECT id FROM analytics.properties WHERE user_id = (SELECT auth.uid())
    ));

CREATE POLICY "Users can create metrics for their properties" 
    ON analytics.property_metrics FOR INSERT 
    WITH CHECK (property_id IN (
        SELECT id FROM analytics.properties WHERE user_id = (SELECT auth.uid())
    ));

CREATE POLICY "Users can update metrics for their properties" 
    ON analytics.property_metrics FOR UPDATE 
    USING (property_id IN (
        SELECT id FROM analytics.properties WHERE user_id = (SELECT auth.uid())
    ));

CREATE POLICY "Users can delete metrics for their properties" 
    ON analytics.property_metrics FOR DELETE 
    USING (property_id IN (
        SELECT id FROM analytics.properties WHERE user_id = (SELECT auth.uid())
    ));

-- Similar policies for other tables
CREATE POLICY "Users can manage their data sources" 
    ON analytics.data_sources FOR ALL 
    USING (property_id IN (
        SELECT id FROM analytics.properties WHERE user_id = (SELECT auth.uid())
    ));

CREATE POLICY "Users can manage their insights" 
    ON analytics.insights FOR ALL 
    USING (property_id IN (
        SELECT id FROM analytics.properties WHERE user_id = (SELECT auth.uid())
    ));

CREATE POLICY "Users can manage their comparisons" 
    ON analytics.property_comparisons FOR ALL 
    USING (user_id = (SELECT auth.uid()));

-- Create a view for easy property metrics access
CREATE OR REPLACE VIEW analytics.property_overview AS
SELECT 
    p.id,
    p.name,
    p.standard_name,
    p.airbnb_url,
    p.data_completeness,
    p.user_id,
    p.listing_id,
    pm.revenue,
    pm.occupancy_rate,
    pm.avg_nightly_rate,
    pm.total_nights,
    pm.total_bookings,
    pm.period_start,
    pm.period_end,
    pm.source,
    pm.confidence
FROM analytics.properties p
LEFT JOIN LATERAL (
    SELECT * FROM analytics.property_metrics
    WHERE property_id = p.id
    ORDER BY period_end DESC, confidence DESC
    LIMIT 1
) pm ON true;

-- Grant permissions for the view
GRANT SELECT ON analytics.property_overview TO authenticated;