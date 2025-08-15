#!/usr/bin/env npx tsx

/**
 * Ensure database schema exists
 * Run this to create all necessary tables for the analytics platform
 */

import { query } from '../lib/db/client'

async function ensureSchema() {
  console.log('🔧 Ensuring database schema exists...\n');
  
  try {
    // Check if analytics schema exists
    const schemaResult = await query(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'analytics'`
    );
    
    if (schemaResult.rows.length === 0) {
      console.log('📦 Creating analytics schema...');
      await query('CREATE SCHEMA IF NOT EXISTS analytics');
    } else {
      console.log('✅ Analytics schema exists');
    }
    
    // Check if property_metrics table exists
    const tableResult = await query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'analytics' AND table_name = 'property_metrics'`
    );
    
    if (tableResult.rows.length === 0) {
      console.log('📦 Creating property_metrics table...');
      
      // Create the table
      await query(`
        CREATE TABLE IF NOT EXISTS analytics.property_metrics (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          property_id TEXT NOT NULL,
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
        )
      `);
      
      // Create indexes
      await query('CREATE INDEX IF NOT EXISTS idx_metrics_property_id ON analytics.property_metrics(property_id)');
      await query('CREATE INDEX IF NOT EXISTS idx_metrics_period ON analytics.property_metrics(period_start, period_end)');
      await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_metrics_property_period_source 
                   ON analytics.property_metrics(property_id, period_start, period_end, source)`);
      
      console.log('✅ Created property_metrics table');
    } else {
      console.log('✅ property_metrics table exists');
    }
    
    // Check if properties table exists
    const propsTableResult = await query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'analytics' AND table_name = 'properties'`
    );
    
    if (propsTableResult.rows.length === 0) {
      console.log('📦 Creating properties table...');
      
      await query(`
        CREATE TABLE IF NOT EXISTS analytics.properties (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          user_id TEXT NOT NULL,
          listing_id TEXT,
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
        )
      `);
      
      await query('CREATE INDEX IF NOT EXISTS idx_properties_user_id ON analytics.properties(user_id)');
      await query('CREATE INDEX IF NOT EXISTS idx_properties_name ON analytics.properties(name)');
      
      console.log('✅ Created properties table');
    } else {
      console.log('✅ properties table exists');
    }
    
    // Check if data_sources table exists
    const dataSourcesResult = await query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'analytics' AND table_name = 'data_sources'`
    );
    
    if (dataSourcesResult.rows.length === 0) {
      console.log('📦 Creating data_sources table...');
      
      await query(`
        CREATE TABLE IF NOT EXISTS analytics.data_sources (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          property_id TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('pdf', 'csv', 'scraped')),
          data JSONB NOT NULL,
          file_name TEXT,
          file_size INTEGER,
          mime_type TEXT,
          period_start DATE,
          period_end DATE,
          uploaded_at TIMESTAMPTZ DEFAULT NOW(),
          uploaded_by TEXT,
          processed BOOLEAN DEFAULT FALSE,
          processed_at TIMESTAMPTZ,
          processing_errors JSONB
        )
      `);
      
      await query('CREATE INDEX IF NOT EXISTS idx_data_sources_property_id ON analytics.data_sources(property_id)');
      await query('CREATE INDEX IF NOT EXISTS idx_data_sources_type ON analytics.data_sources(type)');
      
      console.log('✅ Created data_sources table');
    } else {
      console.log('✅ data_sources table exists');
    }
    
    console.log('\n🎉 Database schema is ready!');
    
    // Test the connection and show some stats
    const propCount = await query('SELECT COUNT(*) FROM analytics.properties');
    const metricsCount = await query('SELECT COUNT(*) FROM analytics.property_metrics');
    
    console.log(`\n📊 Current data:`);
    console.log(`   Properties: ${propCount.rows[0].count}`);
    console.log(`   Metrics: ${metricsCount.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error ensuring schema:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

ensureSchema();