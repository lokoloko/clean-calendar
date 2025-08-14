/**
 * Property Storage Layer - Database Implementation
 * Replaces localStorage with Supabase database storage
 */

import { supabase, getCurrentUser } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'
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
    propertyMetrics?: any[] // Keep for compatibility
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

type DBProperty = Database['analytics']['Tables']['properties']['Row']
type DBPropertyInsert = Database['analytics']['Tables']['properties']['Insert']
type DBPropertyUpdate = Database['analytics']['Tables']['properties']['Update']
type DBMetrics = Database['analytics']['Tables']['property_metrics']['Row']
type DBDataSource = Database['analytics']['Tables']['data_sources']['Row']

export class PropertyStoreDB {
  private static cache: Map<string, Property> = new Map()
  private static cacheExpiry = 5 * 60 * 1000 // 5 minutes
  private static lastCacheUpdate = 0

  /**
   * Generate a unique ID for a property
   */
  static generateId(): string {
    return `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get all properties from database
   */
  static async getAll(): Promise<Property[]> {
    try {
      const user = await getCurrentUser()
      if (!user) return []

      // Check cache first
      if (Date.now() - this.lastCacheUpdate < this.cacheExpiry && this.cache.size > 0) {
        return Array.from(this.cache.values())
      }

      // Get properties with their latest metrics
      const { data: properties, error } = await supabase
        .schema('analytics')
        .from('property_overview')
        .select('*')
        .eq('user_id', user.id)
        .order('name')

      if (error) {
        console.error('Error loading properties:', error)
        return []
      }

      // Get data sources for all properties
      const propertyIds = properties?.map(p => p.id) || []
      const { data: dataSources } = await supabase
        .schema('analytics')
        .from('data_sources')
        .select('*')
        .in('property_id', propertyIds)
        .order('uploaded_at', { ascending: false })

      // Transform to Property format
      const transformedProperties = await Promise.all(
        (properties || []).map(async (dbProp) => {
          const propDataSources = dataSources?.filter(ds => ds.property_id === dbProp.id) || []
          return this.transformDBToProperty(dbProp, propDataSources)
        })
      )

      // Update cache
      this.cache.clear()
      transformedProperties.forEach(prop => {
        this.cache.set(prop.id, prop)
      })
      this.lastCacheUpdate = Date.now()

      return transformedProperties
    } catch (error) {
      console.error('Error in getAll:', error)
      return []
    }
  }

  /**
   * Get all properties for a specific user
   */
  static async getAllForUser(userId: string): Promise<Property[]> {
    try {
      // Get properties with their latest metrics
      const { data: properties, error } = await supabase
        .schema('analytics')
        .from('properties')
        .select('*')
        .eq('user_id', userId)
        .order('name')

      if (error) {
        console.error('Error fetching properties:', error)
        return []
      }

      if (!properties || properties.length === 0) {
        return []
      }

      // Transform database properties to our Property interface
      const transformedProperties = await Promise.all(
        properties.map(async (dbProp) => {
          // Get latest metrics for this property
          const { data: metrics } = await supabase
            .schema('analytics')
            .from('property_metrics')
            .select('*')
            .eq('property_id', dbProp.id)
            .order('period_end', { ascending: false })
            .limit(1)

          // Get data sources
          const { data: dataSources } = await supabase
            .schema('analytics')
            .from('data_sources')
            .select('*')
            .eq('property_id', dbProp.id)
            .order('uploaded_at', { ascending: false })

          return this.transformToProperty(dbProp, metrics?.[0], dataSources || [])
        })
      )

      return transformedProperties
    } catch (error) {
      console.error('Error in getAllForUser:', error)
      return []
    }
  }

  /**
   * Get a single property by ID
   */
  static async getById(id: string): Promise<Property | null> {
    try {
      // Check cache first
      if (this.cache.has(id)) {
        const cached = this.cache.get(id)!
        // Verify it's still fresh
        if (Date.now() - this.lastCacheUpdate < this.cacheExpiry) {
          return cached
        }
      }

      const { data: property, error } = await supabase
        .schema('analytics')
        .from('properties')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !property) {
        console.error('Property not found:', id)
        return null
      }

      // Get metrics
      const { data: metrics } = await supabase
        .schema('analytics')
        .from('property_metrics')
        .select('*')
        .eq('property_id', id)
        .order('period_end', { ascending: false })
        .limit(1)

      // Get data sources
      const { data: dataSources } = await supabase
        .schema('analytics')
        .from('data_sources')
        .select('*')
        .eq('property_id', id)
        .order('uploaded_at', { ascending: false })

      const transformed = await this.transformDBToProperty(
        property,
        dataSources || [],
        metrics?.[0]
      )

      // Update cache
      this.cache.set(id, transformed)

      return transformed
    } catch (error) {
      console.error('Error in getById:', error)
      return null
    }
  }

  /**
   * Save a property for a specific user
   */
  static async saveForUser(property: Property, userId: string): Promise<Property> {
    try {
      // Prepare database format
      const dbProperty: DBPropertyInsert = {
        id: property.id,
        user_id: userId,
        name: property.name,
        standard_name: property.standardName,
        airbnb_url: property.airbnbUrl,
        listing_id: property.airbnbListingId,
        data_completeness: property.dataCompleteness || 0
      }

      // Upsert property
      const { data: savedProperty, error } = await supabase
        .schema('analytics')
        .from('properties')
        .upsert(dbProperty)
        .select()
        .single()

      if (error) throw error

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
   * Save a new property or update existing
   */
  static async save(property: Property): Promise<Property> {
    try {
      const user = await getCurrentUser()
      if (!user) throw new Error('User not authenticated')

      // Prepare database format
      const dbProperty: DBPropertyInsert = {
        id: property.id,
        user_id: user.id,
        name: property.name,
        standard_name: property.standardName,
        airbnb_url: property.airbnbUrl,
        listing_id: property.airbnbListingId,
        data_completeness: property.dataCompleteness || 0
      }

      // Upsert property
      const { data: savedProperty, error } = await supabase
        .schema('analytics')
        .from('properties')
        .upsert(dbProperty)
        .select()
        .single()

      if (error) throw error

      // Save metrics if present
      if (property.metrics) {
        await this.saveMetrics(property.id, property.metrics)
      }

      // Save data sources
      await this.saveDataSources(property.id, property.dataSources)

      // Update cache
      property.updatedAt = new Date()
      this.cache.set(property.id, property)

      return property
    } catch (error) {
      console.error('Error saving property:', error)
      throw error
    }
  }

  /**
   * Create properties from uploaded data
   */
  static async createFromUpload(uploadData: any): Promise<Property[]> {
    const properties: Property[] = []
    const user = await getCurrentUser()
    if (!user) throw new Error('User not authenticated')

    console.log('PropertyStoreDB.createFromUpload received:', {
      hasCSV: !!uploadData.csv,
      csvPropertyMetrics: uploadData.csv?.propertyMetrics?.length || 0,
      properties: uploadData.properties?.length || 0
    })

    if (uploadData.properties) {
      for (const prop of uploadData.properties) {
        const property: Property = {
          id: this.generateId(),
          name: prop.name || prop.pdfName || prop.standardName,
          standardName: prop.standardName || prop.name || prop.pdfName,
          dataSources: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          dataCompleteness: 0,
          mappings: {
            pdfName: prop.pdfName || prop.name,
            csvName: prop.csvName || prop.name
          }
        }

        // Add PDF data if available
        if (prop.netEarnings !== undefined) {
          property.dataSources.pdf = {
            data: {
              period: uploadData.period || '',
              dateRange: uploadData.dateRange || '',
              totalGrossEarnings: prop.grossEarnings || 0,
              totalServiceFees: prop.serviceFees || 0,
              totalAdjustments: prop.adjustments || 0,
              totalTaxWithheld: prop.taxWithheld || 0,
              totalNetEarnings: prop.netEarnings || 0,
              totalNightsBooked: prop.nightsBooked || 0,
              properties: [prop]
            } as ParsedPDF,
            uploadedAt: new Date(),
            period: uploadData.period || '',
            fileName: uploadData.fileName || 'earnings.pdf'
          }
        }

        // Add CSV data if available
        if (uploadData.csv?.propertyMetrics) {
          const csvDateRange = uploadData.csv?.dateRange || {}
          property.dataSources.csv = {
            data: [],
            uploadedAt: new Date(),
            dateRange: {
              start: csvDateRange.start ? new Date(csvDateRange.start) : new Date(),
              end: csvDateRange.end ? new Date(csvDateRange.end) : new Date()
            },
            recordCount: 0,
            propertyMetrics: uploadData.csv.propertyMetrics || []
          }
        }

        // Calculate metrics
        property.metrics = await this.calculateMetrics(property)
        property.dataCompleteness = this.calculateCompleteness(property)

        console.log(`Created property "${property.name}" with metrics:`, {
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
      await this.save(property)
    }

    return properties
  }

  /**
   * Update property with new data source
   */
  static async updateDataSource(
    propertyId: string,
    sourceType: 'pdf' | 'csv' | 'scraped',
    data: any
  ): Promise<Property | null> {
    const property = await this.getById(propertyId)
    if (!property) {
      console.error(`Property not found for ID: ${propertyId}`)
      return null
    }

    console.log(`Updating ${sourceType} for property:`, {
      id: property.id,
      name: property.name,
      standardName: property.standardName
    })

    switch (sourceType) {
      case 'pdf':
        property.dataSources.pdf = {
          data: data,
          uploadedAt: new Date(),
          period: data.period || '',
          fileName: data.fileName || 'earnings.pdf'
        }
        break

      case 'csv':
        const csvDateRange = data.dateRange || {}
        property.dataSources.csv = {
          data: data.transactions || data,
          uploadedAt: new Date(),
          dateRange: {
            start: csvDateRange.start ? new Date(csvDateRange.start) : new Date(),
            end: csvDateRange.end ? new Date(csvDateRange.end) : new Date()
          },
          recordCount: Array.isArray(data) ? data.length : data.transactions?.length || 0,
          propertyMetrics: data.propertyMetrics || []
        }
        break

      case 'scraped':
        property.dataSources.scraped = {
          data: data,
          scrapedAt: new Date(),
          source: 'browserless'
        }
        property.lastSyncedAt = new Date()
        break
    }

    // Recalculate metrics
    property.metrics = await this.calculateMetrics(property)
    property.dataCompleteness = this.calculateCompleteness(property)

    console.log(`Updated ${sourceType} for ${property.name}:`, {
      revenue: property.metrics?.revenue?.value || 0,
      occupancy: property.metrics?.occupancy?.value || 0,
      pricing: property.metrics?.pricing?.value || 0
    })

    return await this.save(property)
  }

  /**
   * Update property URL
   */
  static async updateUrl(propertyId: string, airbnbUrl: string): Promise<Property | null> {
    const property = await this.getById(propertyId)
    if (!property) return null

    property.airbnbUrl = airbnbUrl

    // Extract listing ID from URL
    const match = airbnbUrl.match(/rooms\/(\d+)/)
    if (match) {
      property.airbnbListingId = match[1]
    }

    return await this.save(property)
  }

  /**
   * Delete a property
   */
  static async delete(propertyId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .schema('analytics')
        .from('properties')
        .delete()
        .eq('id', propertyId)

      if (error) throw error

      // Remove from cache
      this.cache.delete(propertyId)

      return true
    } catch (error) {
      console.error('Error deleting property:', error)
      return false
    }
  }

  /**
   * Find properties by name (fuzzy match)
   */
  static async findByName(name: string): Promise<Property[]> {
    const properties = await this.getAll()
    const searchTerm = name.toLowerCase()

    return properties.filter(p =>
      p.name.toLowerCase().includes(searchTerm) ||
      p.standardName.toLowerCase().includes(searchTerm) ||
      p.mappings?.pdfName?.toLowerCase().includes(searchTerm) ||
      p.mappings?.csvName?.toLowerCase().includes(searchTerm)
    )
  }

  /**
   * Get properties with missing data
   */
  static async getIncomplete(): Promise<Property[]> {
    const properties = await this.getAll()
    return properties.filter(p => p.dataCompleteness < 100)
  }

  /**
   * Calculate property metrics from available data
   * This is a simplified version - full logic would be migrated from PropertyStore
   */
  static async calculateMetrics(property: Property): Promise<PropertyMetrics> {
    // For now, use the same logic as PropertyStore
    // In production, this would be optimized for database operations
    const { PropertyStore } = await import('./property-store')
    return PropertyStore.calculateMetrics(property)
  }

  /**
   * Clear all properties (use with caution)
   */
  static async clear(): Promise<void> {
    const user = await getCurrentUser()
    if (!user) return

    const { error } = await supabase
      .schema('analytics')
      .from('properties')
      .delete()
      .eq('user_id', user.id)

    if (error) {
      console.error('Error clearing properties:', error)
    }

    this.cache.clear()
  }

  /**
   * Export all data as JSON
   */
  static async exportAll(): Promise<string> {
    const properties = await this.getAll()
    return JSON.stringify({
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      properties
    }, null, 2)
  }

  /**
   * Import data from JSON
   */
  static async importData(jsonString: string): Promise<number> {
    try {
      const data = JSON.parse(jsonString)
      const properties = data.properties || []

      for (const prop of properties) {
        await this.save(prop)
      }

      return properties.length
    } catch (error) {
      console.error('Error importing data:', error)
      return 0
    }
  }

  // Helper methods

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

  private static async transformDBToProperty(
    dbProp: any,
    dataSources: DBDataSource[],
    metrics?: DBMetrics
  ): Promise<Property> {
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
    for (const ds of dataSources) {
      switch (ds.type) {
        case 'pdf':
          property.dataSources.pdf = {
            data: ds.data,
            uploadedAt: new Date(ds.uploaded_at),
            period: ds.data?.period || '',
            fileName: ds.file_name || 'earnings.pdf'
          }
          break
        case 'csv':
          property.dataSources.csv = {
            data: ds.data?.transactions || [],
            uploadedAt: new Date(ds.uploaded_at),
            dateRange: {
              start: ds.period_start ? new Date(ds.period_start) : new Date(),
              end: ds.period_end ? new Date(ds.period_end) : new Date()
            },
            recordCount: ds.data?.recordCount || 0,
            propertyMetrics: ds.data?.propertyMetrics || []
          }
          break
        case 'scraped':
          property.dataSources.scraped = {
            data: ds.data,
            scrapedAt: new Date(ds.uploaded_at),
            source: 'browserless'
          }
          property.lastSyncedAt = new Date(ds.uploaded_at)
          break
      }
    }

    // Transform metrics if available
    if (metrics || dbProp.revenue) {
      const m = metrics || dbProp
      property.metrics = {
        revenue: {
          value: m.revenue || 0,
          source: m.source || 'calculated',
          confidence: m.confidence || 0,
          lastUpdated: new Date(m.updated_at || m.created_at)
        },
        occupancy: {
          value: m.occupancy_rate || 0,
          source: m.source || 'calculated',
          confidence: m.confidence || 0,
          lastUpdated: new Date(m.updated_at || m.created_at)
        },
        pricing: {
          value: m.avg_nightly_rate || 0,
          source: m.source || 'calculated',
          confidence: m.confidence || 0,
          lastUpdated: new Date(m.updated_at || m.created_at)
        },
        satisfaction: {
          value: 0, // Would come from scraped data
          source: 'calculated',
          confidence: 0,
          lastUpdated: new Date()
        },
        health: Math.round((m.confidence || 0) * 0.8) // Simplified calculation
      }
    }

    return property
  }

  private static async saveMetrics(propertyId: string, metrics: PropertyMetrics): Promise<void> {
    try {
      const metricsData = {
        property_id: propertyId,
        period_start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        period_end: new Date().toISOString(),
        revenue: metrics.revenue.value,
        occupancy_rate: metrics.occupancy.value,
        avg_nightly_rate: metrics.pricing.value,
        total_nights: Math.round((metrics.occupancy.value / 100) * 365),
        total_bookings: 0, // Would be calculated from CSV data
        avg_stay_length: 0, // Would be calculated from CSV data
        source: metrics.revenue.source,
        confidence: metrics.revenue.confidence
      }

      const { error } = await supabase
        .schema('analytics')
        .from('property_metrics')
        .upsert(metricsData, {
          onConflict: 'property_id,period_start,period_end,source'
        })

      if (error) {
        console.error('Error saving metrics:', error)
      }
    } catch (error) {
      console.error('Error in saveMetrics:', error)
    }
  }

  private static async saveDataSources(propertyId: string, dataSources: PropertyDataSource): Promise<void> {
    try {
      const dataSourceRecords = []

      if (dataSources.pdf) {
        dataSourceRecords.push({
          property_id: propertyId,
          type: 'pdf' as const,
          data: dataSources.pdf.data,
          file_name: dataSources.pdf.fileName,
          uploaded_at: dataSources.pdf.uploadedAt.toISOString(),
          period_start: null,
          period_end: null
        })
      }

      if (dataSources.csv) {
        dataSourceRecords.push({
          property_id: propertyId,
          type: 'csv' as const,
          data: {
            transactions: dataSources.csv.data,
            propertyMetrics: dataSources.csv.propertyMetrics,
            recordCount: dataSources.csv.recordCount
          },
          file_name: null,
          uploaded_at: dataSources.csv.uploadedAt.toISOString(),
          period_start: dataSources.csv.dateRange?.start?.toISOString(),
          period_end: dataSources.csv.dateRange?.end?.toISOString()
        })
      }

      if (dataSources.scraped) {
        dataSourceRecords.push({
          property_id: propertyId,
          type: 'scraped' as const,
          data: dataSources.scraped.data,
          file_name: null,
          uploaded_at: dataSources.scraped.scrapedAt.toISOString(),
          period_start: null,
          period_end: null
        })
      }

      if (dataSourceRecords.length > 0) {
        const { error } = await supabase
          .schema('analytics')
          .from('data_sources')
          .upsert(dataSourceRecords, {
            onConflict: 'property_id,type'
          })

        if (error) {
          console.error('Error saving data sources:', error)
        }
      }
    } catch (error) {
      console.error('Error in saveDataSources:', error)
    }
  }
}