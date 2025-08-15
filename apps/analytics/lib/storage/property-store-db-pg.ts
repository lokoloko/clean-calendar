/**
 * Property Storage Layer - Direct PostgreSQL Implementation
 * Uses direct database connections instead of Supabase client
 */

import { query } from '@/lib/db/client'
import type { ParsedPDF } from '@/lib/parsers/pdf-parse-wrapper'
import type { AirbnbListingData } from '@/lib/scrapers/airbnb-parser'

// Re-export types from original PropertyStore for compatibility
export interface PropertyDataSource {
  pdf?: {
    data: ParsedPDF
    uploadedAt: Date
    period: string
    fileName: string
  }
  csv?: {
    data: any[]
    uploadedAt: Date
    dateRange: { start: Date, end: Date }
    recordCount: number
    propertyMetrics?: any[]
  }
  scraped?: {
    data: AirbnbListingData
    scrapedAt: Date
    source: 'browserless'
  }
}

export interface MetricWithSource {
  value: number
  source: 'pdf' | 'csv' | 'scraped' | 'calculated'
  confidence: number
  lastUpdated: Date
}

export interface PropertyMetrics {
  revenue: MetricWithSource
  occupancy: MetricWithSource
  pricing: MetricWithSource
  satisfaction: MetricWithSource
  health: number
}

export interface Property {
  id: string
  name: string
  standardName: string
  airbnbUrl?: string
  airbnbListingId?: string
  address?: string
  propertyType?: string
  dataSources: PropertyDataSource
  metrics?: PropertyMetrics
  createdAt: Date
  updatedAt: Date
  lastSyncedAt?: Date
  dataCompleteness: number
  mappings?: {
    pdfName?: string
    csvName?: string
  }
}

export class PropertyStoreDBPG {
  private static cache: Map<string, Property> = new Map()
  private static cacheExpiry = 5 * 60 * 1000 // 5 minutes
  private static lastCacheUpdate = 0

  /**
   * Generate a unique ID for a property (UUID v4)
   */
  static generateId(): string {
    // Generate a UUID v4
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  /**
   * Get all properties for a specific user
   */
  static async getAllForUser(userId: string): Promise<Property[]> {
    try {
      // Get properties
      const propertiesResult = await query(
        `SELECT * FROM analytics.properties WHERE user_id = $1 ORDER BY name`,
        [userId]
      )
      
      if (!propertiesResult.rows || propertiesResult.rows.length === 0) {
        return []
      }

      // Get metrics for all properties
      const propertyIds = propertiesResult.rows.map(p => p.id)
      const metricsResult = await query(
        `SELECT DISTINCT ON (property_id) * 
         FROM analytics.property_metrics 
         WHERE property_id = ANY($1)
         ORDER BY property_id, period_end DESC`,
        [propertyIds]
      )

      // Get data sources for all properties
      const dataSourcesResult = await query(
        `SELECT * FROM analytics.data_sources 
         WHERE property_id = ANY($1)
         ORDER BY uploaded_at DESC`,
        [propertyIds]
      )

      // Transform to Property format
      const transformedProperties = propertiesResult.rows.map(dbProp => {
        const metrics = metricsResult.rows.find(m => m.property_id === dbProp.id)
        const dataSources = dataSourcesResult.rows.filter(ds => ds.property_id === dbProp.id)
        return this.transformToProperty(dbProp, metrics, dataSources)
      })

      return transformedProperties
    } catch (error) {
      console.error('Error in getAllForUser:', error)
      return []
    }
  }

  /**
   * Save a property for a specific user
   */
  static async saveForUser(property: Property, userId: string): Promise<Property> {
    try {
      // Upsert property
      const result = await query(
        `INSERT INTO analytics.properties (
          id, user_id, name, standard_name, airbnb_url, 
          data_completeness, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          standard_name = EXCLUDED.standard_name,
          airbnb_url = EXCLUDED.airbnb_url,
          data_completeness = EXCLUDED.data_completeness,
          updated_at = NOW()
        RETURNING *`,
        [
          property.id,
          userId,
          property.name,
          property.standardName,
          property.airbnbUrl || null,
          property.dataCompleteness || 0
        ]
      )

      // Save metrics if present
      if (property.metrics) {
        await this.saveMetrics(property.id, property.metrics)
      }

      // Save data sources
      if (property.dataSources) {
        await this.saveDataSources(property.id, property.dataSources)
      }

      // Update cache
      this.cache.set(property.id, property)

      return property
    } catch (error) {
      console.error('Error in saveForUser:', error)
      throw error
    }
  }

  /**
   * Create properties from uploaded data
   */
  static async createFromUpload(uploadData: any, userId: string): Promise<Property[]> {
    const properties: Property[] = []

    console.log('PropertyStoreDBPG.createFromUpload received:', {
      hasCSV: !!uploadData.csv,
      csvPropertyMetrics: uploadData.csv?.propertyMetrics?.length || 0,
      properties: uploadData.properties?.length || 0,
      replace: uploadData.replace
    })

    // If replace mode is true, first delete existing properties for this user
    if (uploadData.replace) {
      try {
        console.log('Replace mode: Deleting existing properties for user', userId)
        await query(
          `DELETE FROM analytics.properties WHERE user_id = $1`,
          [userId]
        )
      } catch (error) {
        console.error('Error deleting existing properties:', error)
      }
    }

    // Check for existing properties to avoid duplicates
    const existingProperties = await this.getAllForUser(userId)
    const existingNames = new Set(existingProperties.map(p => p.standardName.toLowerCase()))

    if (uploadData.properties) {
      for (const prop of uploadData.properties) {
        const standardName = prop.standardName || prop.name || prop.pdfName
        
        // Skip if property already exists (by name) and not in replace mode
        if (!uploadData.replace && existingNames.has(standardName.toLowerCase())) {
          console.log(`Skipping duplicate property: ${standardName}`)
          continue
        }

        const property: Property = {
          id: prop.id || this.generateId(), // Use existing ID if provided
          name: prop.name || prop.pdfName || prop.standardName,
          standardName: standardName,
          dataSources: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          dataCompleteness: 0,
          mappings: {
            pdfName: prop.pdfName || prop.name,
            csvName: prop.csvName || prop.name
          }
        }

        // Add PDF data if available (handle both PDF and CSV field names)
        const hasFinancialData = prop.netEarnings !== undefined || prop.revenue !== undefined
        if (hasFinancialData) {
          property.dataSources.pdf = {
            data: {
              period: uploadData.period || '',
              dateRange: uploadData.dateRange || '',
              totalGrossEarnings: prop.grossEarnings || 0,
              totalServiceFees: prop.serviceFees || 0,
              totalAdjustments: prop.adjustments || 0,
              totalTaxWithheld: prop.taxWithheld || 0,
              totalNetEarnings: prop.revenue || prop.netEarnings || 0,  // Handle both CSV (revenue) and PDF (netEarnings)
              totalNightsBooked: prop.nightsBooked || 0,
              properties: [{
                ...prop,
                netEarnings: prop.revenue || prop.netEarnings || 0  // Ensure netEarnings is set for metrics calculation
              }]
            } as ParsedPDF,
            uploadedAt: new Date(),
            period: uploadData.period || '',
            fileName: uploadData.fileName || 'earnings.pdf'
          }
        }

        // Add CSV data if available
        if (uploadData.csv?.propertyMetrics) {
          const csvDateRange = uploadData.csv?.dateRange || {}
          // Find the CSV metrics for THIS specific property
          const thisPropertyMetrics = uploadData.csv.propertyMetrics.find(
            (m: any) => m.name === standardName || m.name === prop.name
          )
          
          property.dataSources.csv = {
            data: [],
            uploadedAt: new Date(),
            dateRange: {
              start: csvDateRange.start ? new Date(csvDateRange.start) : new Date(),
              end: csvDateRange.end ? new Date(csvDateRange.end) : new Date()
            },
            recordCount: 0,
            // Only include this property's metrics, not all properties
            propertyMetrics: thisPropertyMetrics ? [thisPropertyMetrics] : []
          }
        }

        // Calculate metrics
        property.metrics = await this.calculateMetrics(property)
        property.dataCompleteness = this.calculateCompleteness(property)

        console.log(`✅ Created property "${property.name}" with calculated metrics:`, {
          revenue: property.metrics?.revenue?.value,
          occupancy: property.metrics?.occupancy?.value,
          pricing: property.metrics?.pricing?.value,
          health: property.metrics?.health,
          hasCSV: !!property.dataSources.csv,
          csvMetricsCount: property.dataSources.csv?.propertyMetrics?.length || 0
        })

        properties.push(property)
      }
    }

    // Save all properties to database
    for (const property of properties) {
      await this.saveForUser(property, userId)
    }

    return properties
  }

  /**
   * Save metrics to database
   */
  private static async saveMetrics(propertyId: string, metrics: PropertyMetrics): Promise<void> {
    try {
      await query(
        `INSERT INTO analytics.property_metrics (
          property_id, period_start, period_end, revenue, occupancy_rate,
          avg_nightly_rate, total_nights, total_bookings, avg_stay_length,
          source, confidence, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
        ON CONFLICT (property_id, period_start, period_end, source) DO UPDATE SET
          revenue = EXCLUDED.revenue,
          occupancy_rate = EXCLUDED.occupancy_rate,
          avg_nightly_rate = EXCLUDED.avg_nightly_rate,
          total_nights = EXCLUDED.total_nights,
          confidence = EXCLUDED.confidence,
          updated_at = NOW()`,
        [
          propertyId,
          new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
          new Date().toISOString(),
          metrics.revenue.value,
          metrics.occupancy.value,
          metrics.pricing.value,
          Math.round((metrics.occupancy.value / 100) * 365),
          0, // Would be calculated from CSV data
          0, // Would be calculated from CSV data
          metrics.revenue.source,
          metrics.revenue.confidence
        ]
      )
    } catch (error) {
      console.error('❌ Error saving metrics to database:', error)
      console.error('Metrics data that failed to save:', {
        propertyId,
        revenue: metrics.revenue?.value,
        occupancy: metrics.occupancy?.value,
        pricing: metrics.pricing?.value,
        source: metrics.revenue?.source
      })
      // Don't throw - continue with save even if metrics fail
    }
  }

  /**
   * Save data sources to database
   */
  private static async saveDataSources(propertyId: string, dataSources: PropertyDataSource): Promise<void> {
    try {
      // Save PDF data source
      if (dataSources.pdf) {
        // First delete existing PDF data source for this property
      await query(
        `DELETE FROM analytics.data_sources WHERE property_id = $1 AND type = 'pdf'`,
        [propertyId]
      )
      
      // Then insert new one
      await query(
          `INSERT INTO analytics.data_sources (
            property_id, type, data, file_name, uploaded_at, period_start, period_end
          ) VALUES ($1, $2, $3, $4, $5, NULL, NULL)`,
          [
            propertyId,
            'pdf',
            JSON.stringify(dataSources.pdf.data),
            dataSources.pdf.fileName,
            dataSources.pdf.uploadedAt.toISOString()
          ]
        )
      }

      // Save CSV data source
      if (dataSources.csv) {
        // First delete existing CSV data source for this property
        await query(
          `DELETE FROM analytics.data_sources WHERE property_id = $1 AND type = 'csv'`,
          [propertyId]
        )
        
        // Then insert new one
        await query(
          `INSERT INTO analytics.data_sources (
            property_id, type, data, file_name, uploaded_at, period_start, period_end
          ) VALUES ($1, $2, $3, NULL, $4, $5, $6)`,
          [
            propertyId,
            'csv',
            JSON.stringify({
              transactions: dataSources.csv.data,
              propertyMetrics: dataSources.csv.propertyMetrics,
              recordCount: dataSources.csv.recordCount
            }),
            dataSources.csv.uploadedAt.toISOString(),
            dataSources.csv.dateRange?.start?.toISOString(),
            dataSources.csv.dateRange?.end?.toISOString()
          ]
        )
      }

      // Save scraped data source
      if (dataSources.scraped) {
        // First delete existing scraped data source for this property
        await query(
          `DELETE FROM analytics.data_sources WHERE property_id = $1 AND type = 'scraped'`,
          [propertyId]
        )
        
        // Then insert new one
        await query(
          `INSERT INTO analytics.data_sources (
            property_id, type, data, file_name, uploaded_at, period_start, period_end
          ) VALUES ($1, $2, $3, NULL, $4, NULL, NULL)`,
          [
            propertyId,
            'scraped',
            JSON.stringify(dataSources.scraped.data),
            dataSources.scraped.scrapedAt.toISOString()
          ]
        )
      }
    } catch (error) {
      console.error('Error saving data sources:', error)
    }
  }

  /**
   * Calculate property metrics from available data
   */
  private static async calculateMetrics(property: Property): Promise<PropertyMetrics> {
    // For now, use the same logic as PropertyStore
    const { PropertyStore } = await import('./property-store')
    return PropertyStore.calculateMetrics(property)
  }

  /**
   * Calculate data completeness
   */
  private static calculateCompleteness(property: Property): number {
    let score = 0
    const weights = {
      pdf: 30,
      csv: 30,
      url: 20,
      scraped: 20
    }

    if (property.dataSources.pdf) score += weights.pdf
    if (property.dataSources.csv) score += weights.csv
    if (property.airbnbUrl) score += weights.url
    if (property.dataSources.scraped) score += weights.scraped

    return Math.min(100, score)
  }

  /**
   * Transform database row to Property interface
   */
  private static transformToProperty(dbProp: any, metrics?: any, dataSources?: any[]): Property {
    const property: Property = {
      id: dbProp.id,
      name: dbProp.name,
      standardName: dbProp.standard_name || dbProp.name,
      airbnbUrl: dbProp.airbnb_url || undefined,
      airbnbListingId: dbProp.listing_id || undefined,
      dataCompleteness: dbProp.data_completeness || 0,
      createdAt: new Date(dbProp.created_at),
      updatedAt: new Date(dbProp.updated_at),
      dataSources: {}
    }

    // Transform data sources
    if (dataSources) {
      for (const ds of dataSources) {
        const data = typeof ds.data === 'string' ? JSON.parse(ds.data) : ds.data
        
        switch (ds.type) {
          case 'pdf':
            property.dataSources.pdf = {
              data: data,
              uploadedAt: new Date(ds.uploaded_at),
              period: data?.period || '',
              fileName: ds.file_name || 'earnings.pdf'
            }
            break
          case 'csv':
            property.dataSources.csv = {
              data: data?.transactions || [],
              uploadedAt: new Date(ds.uploaded_at),
              dateRange: {
                start: ds.period_start ? new Date(ds.period_start) : new Date(),
                end: ds.period_end ? new Date(ds.period_end) : new Date()
              },
              recordCount: data?.recordCount || 0,
              propertyMetrics: data?.propertyMetrics || []
            }
            break
          case 'scraped':
            property.dataSources.scraped = {
              data: data,
              scrapedAt: new Date(ds.uploaded_at),
              source: 'browserless'
            }
            property.lastSyncedAt = new Date(ds.uploaded_at)
            break
        }
      }
    }

    // Transform metrics if available
    if (metrics) {
      property.metrics = {
        revenue: {
          value: metrics.revenue || 0,
          source: metrics.source || 'calculated',
          confidence: metrics.confidence || 0,
          lastUpdated: new Date(metrics.updated_at || metrics.created_at)
        },
        occupancy: {
          value: metrics.occupancy_rate || 0,
          source: metrics.source || 'calculated',
          confidence: metrics.confidence || 0,
          lastUpdated: new Date(metrics.updated_at || metrics.created_at)
        },
        pricing: {
          value: metrics.avg_nightly_rate || 0,
          source: metrics.source || 'calculated',
          confidence: metrics.confidence || 0,
          lastUpdated: new Date(metrics.updated_at || metrics.created_at)
        },
        satisfaction: {
          value: 0, // Would come from scraped data
          source: 'calculated',
          confidence: 0,
          lastUpdated: new Date()
        },
        health: Math.round((metrics.confidence || 0) * 0.8)
      }
    }

    return property
  }
}