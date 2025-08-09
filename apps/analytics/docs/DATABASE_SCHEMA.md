# Analytics Platform Database Schema Documentation

## Overview
This document describes the complete database schema for the GoStudioM Analytics Platform. The schema is designed to store property data, metrics, and insights with support for multiple data sources (PDF, CSV, and web scraping).

## Database: PostgreSQL with Supabase

### Schema: `analytics`
All analytics-related tables are stored in the `analytics` schema to keep them separate from the main calendar application.

## Tables

### 1. `properties`
Core table storing property information.

```sql
CREATE TABLE analytics.properties (
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
    last_synced_at TIMESTAMPTZ,
    
    -- Indexes
    INDEX idx_properties_user_id ON (user_id),
    INDEX idx_properties_listing_id ON (listing_id),
    INDEX idx_properties_name ON (name),
    UNIQUE INDEX idx_properties_user_name ON (user_id, name)
);
```

### 2. `property_metrics`
Stores calculated metrics for properties over time periods.

```sql
CREATE TABLE analytics.property_metrics (
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
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_metrics_property_id ON (property_id),
    INDEX idx_metrics_period ON (period_start, period_end),
    UNIQUE INDEX idx_metrics_property_period_source ON (property_id, period_start, period_end, source)
);
```

### 3. `data_sources`
Stores raw data from various sources (PDF, CSV, scraping).

```sql
CREATE TABLE analytics.data_sources (
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
    processing_errors JSONB,
    
    -- Indexes
    INDEX idx_data_sources_property_id ON (property_id),
    INDEX idx_data_sources_type ON (type),
    INDEX idx_data_sources_uploaded_at ON (uploaded_at DESC),
    UNIQUE INDEX idx_data_sources_property_type ON (property_id, type) -- Only one of each type per property
);
```

### 4. `property_mappings`
Maps property names across different data sources.

```sql
CREATE TABLE analytics.property_mappings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    property_id TEXT NOT NULL REFERENCES analytics.properties(id) ON DELETE CASCADE,
    source_name TEXT NOT NULL, -- Name as it appears in source
    source_type TEXT NOT NULL CHECK (source_type IN ('pdf', 'csv', 'airbnb')),
    mapped_name TEXT NOT NULL, -- Standardized name
    confidence DECIMAL(5,2) DEFAULT 100 CHECK (confidence >= 0 AND confidence <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_mappings_property_id ON (property_id),
    UNIQUE INDEX idx_mappings_source ON (source_name, source_type)
);
```

### 5. `insights`
AI-generated insights and recommendations.

```sql
CREATE TABLE analytics.insights (
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
    confidence DECIMAL(5,2) DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 100),
    
    -- Indexes
    INDEX idx_insights_property_id ON (property_id),
    INDEX idx_insights_status ON (status),
    INDEX idx_insights_priority ON (priority),
    INDEX idx_insights_created_at ON (created_at DESC)
);
```

### 6. `property_comparisons`
Stores property comparison sessions.

```sql
CREATE TABLE analytics.property_comparisons (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    property_ids TEXT[] NOT NULL,
    comparison_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_comparisons_user_id ON (user_id),
    INDEX idx_comparisons_created_at ON (created_at DESC)
);
```

## Views

### 1. `property_overview`
Aggregated view combining properties with their latest metrics.

```sql
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
```

## Indexes Summary

### Performance Indexes
- User queries: `idx_properties_user_id`
- Property lookups: `idx_properties_name`, `idx_metrics_property_id`
- Time-based queries: `idx_metrics_period`, `idx_data_sources_uploaded_at`
- Data source queries: `idx_data_sources_type`

### Unique Constraints
- One property per name per user: `idx_properties_user_name`
- One metric per property/period/source: `idx_metrics_property_period_source`
- One data source type per property: `idx_data_sources_property_type`
- One mapping per source name/type: `idx_mappings_source`

## Row Level Security (RLS)

Enable RLS on all tables:

```sql
ALTER TABLE analytics.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.property_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.property_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.property_comparisons ENABLE ROW LEVEL SECURITY;
```

### RLS Policies

```sql
-- Properties: Users can only see/modify their own properties
CREATE POLICY "Users can view own properties" ON analytics.properties
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own properties" ON analytics.properties
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own properties" ON analytics.properties
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own properties" ON analytics.properties
    FOR DELETE USING (auth.uid() = user_id);

-- Similar policies for related tables based on property ownership
CREATE POLICY "Users can view metrics for own properties" ON analytics.property_metrics
    FOR SELECT USING (
        property_id IN (
            SELECT id FROM analytics.properties WHERE user_id = auth.uid()
        )
    );

-- Add similar policies for other tables
```

## Migration from Development to Production

### 1. Enable UUID extension (if not already enabled)
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### 2. Create schema
```sql
CREATE SCHEMA IF NOT EXISTS analytics;
```

### 3. Run table creation scripts in order:
1. properties
2. property_metrics
3. data_sources
4. property_mappings
5. insights
6. property_comparisons

### 4. Create views
```sql
-- Run view creation scripts
```

### 5. Enable RLS and create policies
```sql
-- Run RLS scripts
```

### 6. Grant permissions
```sql
GRANT USAGE ON SCHEMA analytics TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA analytics TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA analytics TO authenticated;
```

## Data Types and Conventions

### IDs
- Use TEXT with UUID for all primary keys
- Generate with `gen_random_uuid()::text` or `uuid_generate_v4()::text`

### Timestamps
- Always use `TIMESTAMPTZ` (timestamp with timezone)
- Store in UTC, display in user's timezone

### Money
- Use `DECIMAL(12,2)` for currency amounts
- Store in USD cents internally if needed

### Percentages
- Use `DECIMAL(5,2)` for percentages (0.00 to 100.00)

### JSON Data
- Use `JSONB` for flexible data storage
- Always validate structure in application code

## Backup and Recovery

### Regular Backups
```bash
# Backup analytics schema
pg_dump -h [host] -U [user] -d [database] -n analytics -f analytics_backup.sql

# Restore analytics schema
psql -h [host] -U [user] -d [database] -f analytics_backup.sql
```

### Point-in-Time Recovery
Supabase provides automatic point-in-time recovery for Pro and Enterprise plans.

## Performance Considerations

1. **Partitioning**: Consider partitioning `property_metrics` by `period_start` if data grows large
2. **Archival**: Move old data_sources to cold storage after processing
3. **Vacuum**: Regular VACUUM ANALYZE on high-write tables
4. **Connection Pooling**: Use PgBouncer for connection pooling in production

## Monitoring Queries

### Table Sizes
```sql
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'analytics'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Index Usage
```sql
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'analytics'
ORDER BY idx_scan DESC;
```