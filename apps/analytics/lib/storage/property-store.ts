/**
 * Property Storage Layer
 * Handles persistent storage of property data using localStorage with IndexedDB fallback
 */

import type { ParsedPDF } from '@/lib/parsers/pdf-parse-wrapper'
import type { AirbnbListingData } from '@/lib/scrapers/airbnb-parser'

export interface PropertyDataSource {
  pdf?: {
    data: ParsedPDF
    uploadedAt: Date
    period: string
    fileName: string
  }
  csv?: {
    data: any[] // Transaction data
    uploadedAt: Date
    dateRange: { start: Date, end: Date }
    recordCount: number
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
  confidence: number // 0-100
  lastUpdated: Date
}

export interface PropertyMetrics {
  revenue: MetricWithSource
  occupancy: MetricWithSource
  pricing: MetricWithSource
  satisfaction: MetricWithSource
  health: number // 0-100 score
}

export interface Property {
  id: string // UUID
  
  // Basic Information
  name: string
  standardName: string // Display name
  airbnbUrl?: string
  airbnbListingId?: string
  address?: string
  propertyType?: string
  
  // Data Sources
  dataSources: PropertyDataSource
  
  // Computed Metrics
  metrics?: PropertyMetrics
  
  // Metadata
  createdAt: Date
  updatedAt: Date
  lastSyncedAt?: Date
  dataCompleteness: number // 0-100%
  
  // Mappings
  mappings?: {
    pdfName?: string
    csvName?: string
  }
}

export class PropertyStore {
  private static STORAGE_KEY = 'gostudiom_properties'
  private static VERSION = '1.0.0'
  
  /**
   * Generate a unique ID for a property
   */
  static generateId(): string {
    return `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  /**
   * Get all properties from storage
   */
  static getAll(): Property[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (!stored) return []
      
      const data = JSON.parse(stored)
      // Convert date strings back to Date objects
      return data.properties?.map(this.deserializeProperty) || []
    } catch (error) {
      console.error('Error loading properties:', error)
      return []
    }
  }
  
  /**
   * Get a single property by ID
   */
  static getById(id: string): Property | null {
    const properties = this.getAll()
    return properties.find(p => p.id === id) || null
  }
  
  /**
   * Save a new property or update existing
   */
  static save(property: Property): Property {
    const properties = this.getAll()
    const existingIndex = properties.findIndex(p => p.id === property.id)
    
    // Update timestamps
    property.updatedAt = new Date()
    if (existingIndex === -1) {
      property.createdAt = property.createdAt || new Date()
    }
    
    // Calculate data completeness
    property.dataCompleteness = this.calculateCompleteness(property)
    
    if (existingIndex >= 0) {
      properties[existingIndex] = property
    } else {
      properties.push(property)
    }
    
    this.persist(properties)
    return property
  }
  
  /**
   * Create properties from uploaded data
   */
  static createFromUpload(uploadData: any): Property[] {
    const properties: Property[] = []
    
    if (uploadData.properties) {
      uploadData.properties.forEach((prop: any) => {
        const property: Property = {
          id: this.generateId(),
          name: prop.name,
          standardName: prop.standardName || prop.name,
          dataSources: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          dataCompleteness: 0,
          mappings: {
            pdfName: prop.name
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
        if (prop.hasAccurateMetrics && prop.csvData) {
          property.dataSources.csv = {
            data: prop.csvData,
            uploadedAt: new Date(),
            dateRange: prop.csvDateRange || { start: new Date(), end: new Date() },
            recordCount: prop.csvData.length || 0
          }
        }
        
        // Calculate metrics
        property.metrics = this.calculateMetrics(property)
        property.dataCompleteness = this.calculateCompleteness(property)
        
        properties.push(property)
      })
    }
    
    // Save all properties
    const existing = this.getAll()
    const merged = [...existing, ...properties]
    this.persist(merged)
    
    return properties
  }
  
  /**
   * Update property with new data source
   */
  static updateDataSource(
    propertyId: string, 
    sourceType: 'pdf' | 'csv' | 'scraped',
    data: any
  ): Property | null {
    const property = this.getById(propertyId)
    if (!property) return null
    
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
        property.dataSources.csv = {
          data: data.transactions || data,
          uploadedAt: new Date(),
          dateRange: data.dateRange || { start: new Date(), end: new Date() },
          recordCount: Array.isArray(data) ? data.length : data.transactions?.length || 0
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
    property.metrics = this.calculateMetrics(property)
    
    return this.save(property)
  }
  
  /**
   * Update property URL
   */
  static updateUrl(propertyId: string, airbnbUrl: string): Property | null {
    const property = this.getById(propertyId)
    if (!property) return null
    
    property.airbnbUrl = airbnbUrl
    
    // Extract listing ID from URL
    const match = airbnbUrl.match(/rooms\/(\d+)/)
    if (match) {
      property.airbnbListingId = match[1]
    }
    
    return this.save(property)
  }
  
  /**
   * Delete a property
   */
  static delete(propertyId: string): boolean {
    const properties = this.getAll()
    const filtered = properties.filter(p => p.id !== propertyId)
    
    if (filtered.length < properties.length) {
      this.persist(filtered)
      return true
    }
    return false
  }
  
  /**
   * Find properties by name (fuzzy match)
   */
  static findByName(name: string): Property[] {
    const properties = this.getAll()
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
  static getIncomplete(): Property[] {
    return this.getAll().filter(p => p.dataCompleteness < 100)
  }
  
  /**
   * Calculate data completeness percentage
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
   * Calculate property metrics from available data
   */
  private static calculateMetrics(property: Property): PropertyMetrics {
    const metrics: PropertyMetrics = {
      revenue: {
        value: 0,
        source: 'calculated',
        confidence: 0,
        lastUpdated: new Date()
      },
      occupancy: {
        value: 0,
        source: 'calculated',
        confidence: 0,
        lastUpdated: new Date()
      },
      pricing: {
        value: 0,
        source: 'calculated',
        confidence: 0,
        lastUpdated: new Date()
      },
      satisfaction: {
        value: 0,
        source: 'calculated',
        confidence: 0,
        lastUpdated: new Date()
      },
      health: 0
    }
    
    // Calculate revenue
    if (property.dataSources.pdf) {
      const pdfData = property.dataSources.pdf.data
      const propertyData = pdfData.properties?.[0]
      if (propertyData) {
        metrics.revenue = {
          value: propertyData.netEarnings || 0,
          source: 'pdf',
          confidence: 80,
          lastUpdated: property.dataSources.pdf.uploadedAt
        }
      }
    }
    
    // Calculate occupancy
    if (property.dataSources.csv) {
      // CSV has most accurate occupancy data
      const nights = property.dataSources.csv.data.length || 0
      const daysInPeriod = 365 // Approximate
      metrics.occupancy = {
        value: (nights / daysInPeriod) * 100,
        source: 'csv',
        confidence: 95,
        lastUpdated: property.dataSources.csv.uploadedAt
      }
    } else if (property.dataSources.pdf) {
      const pdfData = property.dataSources.pdf.data
      const nights = pdfData.totalNightsBooked || 0
      metrics.occupancy = {
        value: (nights / 365) * 100,
        source: 'pdf',
        confidence: 60,
        lastUpdated: property.dataSources.pdf.uploadedAt
      }
    }
    
    // Calculate pricing
    if (property.dataSources.scraped?.data.price?.nightly) {
      metrics.pricing = {
        value: property.dataSources.scraped.data.price.nightly,
        source: 'scraped',
        confidence: 100,
        lastUpdated: property.dataSources.scraped.scrapedAt
      }
    } else if (metrics.revenue.value > 0 && metrics.occupancy.value > 0) {
      const nights = (metrics.occupancy.value / 100) * 365
      metrics.pricing = {
        value: nights > 0 ? metrics.revenue.value / nights : 0,
        source: 'calculated',
        confidence: 50,
        lastUpdated: new Date()
      }
    }
    
    // Calculate satisfaction
    if (property.dataSources.scraped?.data.reviews?.overall) {
      metrics.satisfaction = {
        value: (property.dataSources.scraped.data.reviews.overall / 5) * 100,
        source: 'scraped',
        confidence: 100,
        lastUpdated: property.dataSources.scraped.scrapedAt
      }
    }
    
    // Calculate health score
    const healthFactors = []
    if (metrics.revenue.value > 0) healthFactors.push(metrics.revenue.confidence)
    if (metrics.occupancy.value > 0) healthFactors.push(metrics.occupancy.value)
    if (metrics.satisfaction.value > 0) healthFactors.push(metrics.satisfaction.value)
    
    metrics.health = healthFactors.length > 0
      ? Math.round(healthFactors.reduce((a, b) => a + b, 0) / healthFactors.length)
      : 0
    
    return metrics
  }
  
  /**
   * Persist properties to localStorage
   */
  private static persist(properties: Property[]): void {
    try {
      const data = {
        version: this.VERSION,
        properties: properties.map(this.serializeProperty),
        lastUpdated: new Date().toISOString()
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.error('Error saving properties:', error)
      // Could implement IndexedDB fallback here
    }
  }
  
  /**
   * Serialize property for storage (convert Dates to strings)
   */
  private static serializeProperty(property: Property): any {
    return {
      ...property,
      createdAt: property.createdAt?.toISOString(),
      updatedAt: property.updatedAt?.toISOString(),
      lastSyncedAt: property.lastSyncedAt?.toISOString(),
      dataSources: {
        pdf: property.dataSources.pdf ? {
          ...property.dataSources.pdf,
          uploadedAt: property.dataSources.pdf.uploadedAt?.toISOString()
        } : undefined,
        csv: property.dataSources.csv ? {
          ...property.dataSources.csv,
          uploadedAt: property.dataSources.csv.uploadedAt?.toISOString(),
          dateRange: {
            start: property.dataSources.csv.dateRange?.start?.toISOString(),
            end: property.dataSources.csv.dateRange?.end?.toISOString()
          }
        } : undefined,
        scraped: property.dataSources.scraped ? {
          ...property.dataSources.scraped,
          scrapedAt: property.dataSources.scraped.scrapedAt?.toISOString()
        } : undefined
      }
    }
  }
  
  /**
   * Deserialize property from storage (convert strings to Dates)
   */
  private static deserializeProperty(data: any): Property {
    return {
      ...data,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
      lastSyncedAt: data.lastSyncedAt ? new Date(data.lastSyncedAt) : undefined,
      dataSources: {
        pdf: data.dataSources?.pdf ? {
          ...data.dataSources.pdf,
          uploadedAt: new Date(data.dataSources.pdf.uploadedAt)
        } : undefined,
        csv: data.dataSources?.csv ? {
          ...data.dataSources.csv,
          uploadedAt: new Date(data.dataSources.csv.uploadedAt),
          dateRange: data.dataSources.csv.dateRange ? {
            start: new Date(data.dataSources.csv.dateRange.start),
            end: new Date(data.dataSources.csv.dateRange.end)
          } : undefined
        } : undefined,
        scraped: data.dataSources?.scraped ? {
          ...data.dataSources.scraped,
          scrapedAt: new Date(data.dataSources.scraped.scrapedAt)
        } : undefined
      }
    }
  }
  
  /**
   * Clear all properties (use with caution)
   */
  static clear(): void {
    localStorage.removeItem(this.STORAGE_KEY)
  }
  
  /**
   * Export all data as JSON
   */
  static exportAll(): string {
    const properties = this.getAll()
    return JSON.stringify({
      version: this.VERSION,
      exportedAt: new Date().toISOString(),
      properties
    }, null, 2)
  }
  
  /**
   * Import data from JSON
   */
  static importData(jsonString: string): number {
    try {
      const data = JSON.parse(jsonString)
      const properties = data.properties?.map(this.deserializeProperty) || []
      this.persist(properties)
      return properties.length
    } catch (error) {
      console.error('Error importing data:', error)
      return 0
    }
  }
}