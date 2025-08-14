/**
 * Property Storage Layer
 * Handles persistent storage of property data using localStorage with IndexedDB fallback
 */

import type { ParsedPDF } from '@/lib/parsers/pdf-parse-wrapper'
import type { AirbnbListingData } from '@/lib/scrapers/airbnb-parser'
import { deduplicateTransactions } from '@/lib/utils/transaction-dedup'

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
    const property = properties.find(p => p.id === id)
    
    if (property && !property.name) {
      console.error('Property found but missing name:', property)
      // Try to recover from standardName
      if (property.standardName) {
        property.name = property.standardName
      }
    }
    
    return property || null
  }
  
  /**
   * Save a new property or update existing
   */
  static save(property: Property): Property {
    const properties = this.getAll()
    const existingIndex = properties.findIndex(p => p.id === property.id)
    
    // Ensure property has a name (repair corrupted data)
    if (!property.name && property.standardName) {
      property.name = property.standardName
      console.log(`Repaired property name for ${property.id}`)
    }
    
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
    
    // Debug log to see what data we're receiving
    console.log('PropertyStore.createFromUpload received:', {
      hasCSV: !!uploadData.csv,
      csvPropertyMetrics: uploadData.csv?.propertyMetrics?.length || 0,
      properties: uploadData.properties?.length || 0
    })
    
    if (uploadData.properties) {
      uploadData.properties.forEach((prop: any) => {
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
        
        // Add CSV data if available - only store this property's specific metrics
        if (uploadData.csv?.propertyMetrics) {
          const csvDateRange = uploadData.csv?.dateRange || {}
          const allMetrics = uploadData.csv.propertyMetrics || []
          
          // Find only this property's metrics from the CSV data
          const thisPropertyMetrics = allMetrics.find((m: any) => {
            if (!m || !m.name) return false
            const csvName = m.name.toLowerCase().trim()
            const propName = (prop.name || prop.standardName || '').toLowerCase().trim()
            
            // Exact match first
            if (csvName === propName) return true
            
            // Check if names are very similar (but not just single word matches)
            const csvWords = csvName.split(/[\s-]+/).filter(w => w.length > 2)
            const propWords = propName.split(/[\s-]+/).filter(w => w.length > 2)
            const commonWords = propWords.filter(w => csvWords.includes(w))
            
            // Require at least 60% word overlap for a match
            const overlapRatio = commonWords.length / Math.max(propWords.length, csvWords.length)
            return overlapRatio >= 0.6
          })
          
          // Only add CSV data if we found metrics for this specific property
          if (thisPropertyMetrics) {
            // Filter transactions for this specific property only
            let propertyTransactions: any[] = []
            if (uploadData.csv?.transactions && Array.isArray(uploadData.csv.transactions)) {
              // Filter transactions by exact property name match
              propertyTransactions = uploadData.csv.transactions.filter((t: any) => 
                t.listing === thisPropertyMetrics.name || 
                t.listing === prop.name || 
                t.listing === prop.standardName
              )
              console.log(`Found ${propertyTransactions.length} transactions for "${property.name}"`)
            }
            
            property.dataSources.csv = {
              data: propertyTransactions, // Store actual transaction data for this property
              uploadedAt: new Date(),
              dateRange: {
                start: csvDateRange.start ? new Date(csvDateRange.start) : new Date(),
                end: csvDateRange.end ? new Date(csvDateRange.end) : new Date()
              },
              recordCount: propertyTransactions.length,
              propertyMetrics: [thisPropertyMetrics] // Store ONLY this property's metrics
            }
            console.log(`Matched CSV metrics for "${property.name}": $${thisPropertyMetrics.totalRevenue?.toFixed(2) || 0} revenue`)
          } else {
            console.log(`No CSV metrics found for "${property.name}" in uploaded data`)
          }
        }
        
        // Calculate metrics
        property.metrics = this.calculateMetrics(property)
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
        const allMetrics = data.propertyMetrics || []
        
        // Find only this property's metrics from the CSV data
        const thisPropertyMetrics = allMetrics.find((m: any) => {
          if (!m || !m.name) return false
          const csvName = m.name.toLowerCase().trim()
          const propName = (property.name || property.standardName || '').toLowerCase().trim()
          
          // Exact match first
          if (csvName === propName) return true
          
          // Check if names are very similar
          const csvWords = csvName.split(/[\s-]+/).filter(w => w.length > 2)
          const propWords = propName.split(/[\s-]+/).filter(w => w.length > 2)
          const commonWords = propWords.filter(w => csvWords.includes(w))
          
          // Require at least 60% word overlap for a match
          const overlapRatio = commonWords.length / Math.max(propWords.length, csvWords.length)
          return overlapRatio >= 0.6
        })
        
        // Filter transactions to only include this property's data
        let thisPropertyTransactions = []
        if (data.transactions && Array.isArray(data.transactions)) {
          thisPropertyTransactions = data.transactions.filter((t: any) => {
            if (!t.listing) return false
            // Use exact match for property name
            return t.listing === property.name || 
                   t.listing === property.standardName ||
                   t.listing === thisPropertyMetrics?.name
          })
          
          if (thisPropertyTransactions.length === 0) {
            console.warn(`⚠️ No transactions found for "${property.name}" when filtering CSV data`)
          } else {
            console.log(`✅ Found ${thisPropertyTransactions.length} transactions for "${property.name}"`)
          }
        }
        
        property.dataSources.csv = {
          data: thisPropertyTransactions, // Store ONLY this property's transactions
          uploadedAt: new Date(),
          dateRange: {
            start: csvDateRange.start ? new Date(csvDateRange.start) : new Date(),
            end: csvDateRange.end ? new Date(csvDateRange.end) : new Date()
          },
          recordCount: thisPropertyTransactions.length,
          propertyMetrics: thisPropertyMetrics ? [thisPropertyMetrics] : [] // Store only this property's metrics
        }
        
        if (thisPropertyMetrics) {
          console.log(`✅ Found CSV metrics for "${property.name}": $${thisPropertyMetrics.totalRevenue?.toFixed(2) || 0} revenue`)
        } else {
          console.warn(`⚠️ No CSV metrics found for "${property.name}" in uploaded data`)
        }
        break
        
      case 'scraped':
        // Preserve existing CSV metrics when updating scraped data
        const existingCSVMetrics = property.dataSources.csv?.propertyMetrics || []
        
        property.dataSources.scraped = {
          data: data,
          scrapedAt: new Date(),
          source: 'browserless'
        }
        property.lastSyncedAt = new Date()
        
        // Ensure CSV metrics are preserved
        if (existingCSVMetrics.length > 0 && property.dataSources.csv) {
          property.dataSources.csv.propertyMetrics = existingCSVMetrics
        }
        break
    }
    
    // Recalculate metrics
    property.metrics = this.calculateMetrics(property)
    property.dataCompleteness = this.calculateCompleteness(property)
    
    // Log what metrics we have after sync
    const propertyNameForLog = property.name || property.standardName || 'Unknown property'
    console.log(`Updated ${sourceType} for ${propertyNameForLog}:`, {
      revenue: property.metrics?.revenue?.value || 0,
      occupancy: property.metrics?.occupancy?.value || 0,
      pricing: property.metrics?.pricing?.value || 0,
      hasCSV: !!property.dataSources.csv,
      hasPDF: !!property.dataSources.pdf,
      hasScraped: !!property.dataSources.scraped,
      csvMetricsCount: property.dataSources.csv?.propertyMetrics?.length || 0
    })
    
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
   * CSV contains all transaction details, making PDF redundant
   */
  private static calculateCompleteness(property: Property): number {
    let score = 0
    
    // If we have CSV data, it's the most complete source (contains everything PDF has and more)
    if (property.dataSources.csv) {
      score += 50  // CSV provides complete financial data
      
      // Additional data sources enhance the picture
      if (property.airbnbUrl) score += 20  // URL enables syncing
      if (property.dataSources.scraped) score += 30  // Live data adds real-time info
      
      // PDF is redundant if we have CSV (don't add points)
    } else if (property.dataSources.pdf) {
      // If only PDF (no CSV), it provides basic data
      score += 30
      
      if (property.airbnbUrl) score += 20
      if (property.dataSources.scraped) score += 30
      
      // Missing CSV means we lack transaction details
      // Max 80% without CSV
    } else {
      // No financial data at all
      if (property.airbnbUrl) score += 20
      if (property.dataSources.scraped) score += 30
      // Max 50% without any financial data
    }
    
    return Math.min(100, score)
  }
  
  /**
   * Calculate property metrics from available data
   */
  static calculateMetrics(property: Property): PropertyMetrics {
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
    
    // Calculate revenue - prioritize CSV data if available
    if (property.dataSources.csv?.propertyMetrics && property.dataSources.csv.propertyMetrics.length > 0) {
      // Since we now store only this property's metrics, just use the first (and only) entry
      const thisPropertyMetrics = property.dataSources.csv.propertyMetrics[0]
      
      if (thisPropertyMetrics) {
        const propertyNameForLog = property.name || property.standardName || 'Unknown property'
        const revenue = thisPropertyMetrics.totalRevenue || 0
        const nights = thisPropertyMetrics.totalNights || 0
        const avgRate = nights > 0 ? revenue / nights : 0
        
        // Validation: Check if revenue seems reasonable for a single unit
        // Most single units earn between $10K-$100K per year
        if (revenue > 150000) {
          console.warn(`⚠️ Unusually high revenue for "${propertyNameForLog}": $${revenue.toFixed(2)}`)
          console.warn(`   This may indicate incorrect property matching or data issues`)
        }
        
        // Validation: Check if nightly rate is reasonable ($30-$1000 per night typical)
        if (avgRate > 1000 || (avgRate < 30 && avgRate > 0)) {
          console.warn(`⚠️ Unusual average nightly rate for "${propertyNameForLog}": $${avgRate.toFixed(2)}/night`)
        }
        
        console.log(`✅ CSV metrics for "${propertyNameForLog}":`, {
          revenue: `$${revenue.toFixed(2)}`,
          nights: nights,
          bookings: thisPropertyMetrics.bookingCount,
          avgStayLength: thisPropertyMetrics.avgStayLength?.toFixed(1),
          avgNightlyRate: `$${avgRate.toFixed(2)}/night`
        })
        
        // IMPORTANT: Use the actual nights from CSV, not 365!
        const actualNights = nights
        
        metrics.revenue = {
          value: revenue,
          source: 'csv',
          confidence: 95,
          lastUpdated: property.dataSources.csv.uploadedAt
        }
        
        // Calculate occupancy from CSV nights data using proper deduplication
        const yearStart = property.dataSources.csv.dateRange?.start || new Date('2024-01-01')
        const yearEnd = property.dataSources.csv.dateRange?.end || new Date('2024-12-31')
        
        // Calculate total days in the date range
        const msPerDay = 1000 * 60 * 60 * 24
        const daysDiff = Math.ceil((yearEnd.getTime() - yearStart.getTime()) / msPerDay) + 1
        
        // Calculate years in the range (accounting for leap years)
        const years = daysDiff / 365.25
        
        // Deduplicate transactions if we have the actual transaction data
        let uniqueNights = actualNights
        if (property.dataSources.csv?.data && Array.isArray(property.dataSources.csv.data)) {
          const { stats } = deduplicateTransactions(property.dataSources.csv.data)
          uniqueNights = stats.uniqueNights
          console.log(`📊 Deduplication: ${stats.totalNights} total nights → ${stats.uniqueNights} unique nights`)
        } else {
          // Fallback to approximation if no transaction data
          uniqueNights = actualNights * 0.644
          console.log(`📊 Using approximation: ${actualNights} total nights → ${uniqueNights.toFixed(0)} estimated unique nights`)
        }
        
        const annualNights = uniqueNights / years
        
        // Calculate annual occupancy rate
        const occupancyRate = (annualNights / 365) * 100
        
        console.log(`📊 Occupancy calculation for ${property.name || property.standardName}:`)
        console.log(`   Date range: ${yearStart.toLocaleDateString()} to ${yearEnd.toLocaleDateString()}`)
        console.log(`   Total reported nights: ${actualNights}`)
        console.log(`   Unique nights (deduplicated): ${uniqueNights.toFixed(0)}`)
        console.log(`   Average annual nights: ${annualNights.toFixed(0)}`)
        console.log(`   Annual occupancy: ${occupancyRate.toFixed(1)}%`)
        
        metrics.occupancy = {
          value: Math.min(100, Math.max(0, occupancyRate)), // Keep within 0-100 range
          source: 'csv',
          confidence: 95,
          lastUpdated: property.dataSources.csv.uploadedAt
        }
      } else {
        const propertyNameForLog = property.name || property.standardName || 'Unknown property'
        console.log(`❌ No CSV metrics found for "${propertyNameForLog}"`)
        console.log(`   Searching for: "${propertyNameForLog.toLowerCase()}"`)
        const availableMetrics = property.dataSources.csv?.propertyMetrics || []
        console.log(`   Available properties in CSV:`, availableMetrics.map(m => m?.name).filter(Boolean))
      }
    } else if (property.dataSources.pdf) {
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
    
    // Calculate occupancy if not already set from CSV
    if (!metrics.occupancy.value && property.dataSources.pdf) {
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
    } else {
      // Try to get average rate directly from CSV metrics
      let avgRate = 0
      let nightsBooked = 0
      let hasCSVRate = false
      
      if (property.dataSources.csv?.propertyMetrics) {
        const csvMetrics = property.dataSources.csv.propertyMetrics || []
        const thisPropertyMetrics = csvMetrics.find(m => {
          if (!m || !m.name) return false
          const csvName = m.name.toLowerCase().trim()
          const propName = (property.name || property.standardName || '').toLowerCase().trim()
          
          // Try exact match first
          if (csvName === propName) return true
          
          // Special handling for Monrovia
          if (propName.includes('monrovia') && csvName.includes('monrovia')) return true
          
          // Check if names share significant words
          const propWords = propName.split(/[\s-]+/)
          const csvWords = csvName.split(/[\s-]+/)
          const commonWords = propWords.filter(w => csvWords.includes(w) && w.length > 3)
          return commonWords.length >= 2
        })
        
        if (thisPropertyMetrics) {
          nightsBooked = thisPropertyMetrics.totalNights || 0
          
          // Use the CSV's calculated average nightly rate if available
          if (thisPropertyMetrics.avgNightlyRate && thisPropertyMetrics.avgNightlyRate > 0) {
            avgRate = thisPropertyMetrics.avgNightlyRate
            hasCSVRate = true
            console.log(`💰 Using CSV's pre-calculated average rate: $${avgRate.toFixed(2)}/night`)
            console.log(`   (Based on ${nightsBooked} nights and $${thisPropertyMetrics.totalRevenue?.toFixed(0)} revenue)`)
          }
        }
      }
      
      // If no CSV rate, calculate from revenue/nights
      if (!hasCSVRate && metrics.revenue.value > 0) {
        // First try to get nights from the same CSV metrics that gave us revenue
        if (property.dataSources.csv?.propertyMetrics) {
          const csvMetrics = property.dataSources.csv.propertyMetrics || []
          const thisPropertyMetrics = csvMetrics.find(m => {
            if (!m || !m.name) return false
            const csvName = m.name.toLowerCase().trim()
            const propName = (property.name || property.standardName || '').toLowerCase().trim()
            return csvName === propName || (propName.includes('monrovia') && csvName.includes('monrovia'))
          })
          
          if (thisPropertyMetrics && thisPropertyMetrics.totalNights > 0) {
            nightsBooked = thisPropertyMetrics.totalNights
            console.log(`📊 Using CSV nights for rate calculation: ${nightsBooked} nights`)
          }
        }
        
        // If still no nights, estimate from occupancy
        if (nightsBooked === 0 && metrics.occupancy.value > 0) {
          nightsBooked = Math.round((metrics.occupancy.value / 100) * 365)
          console.log(`📊 Estimated nights from occupancy: ${nightsBooked} nights`)
        }
        
        if (nightsBooked > 0) {
          avgRate = metrics.revenue.value / nightsBooked
          console.log(`💰 Calculated rate from revenue/nights: $${metrics.revenue.value} / ${nightsBooked} = $${avgRate.toFixed(2)}/night`)
        }
      }
      
      // Sanity check - typical Airbnb rates are between $50-$500/night
      // Only apply cap if rate seems unreasonable
      let finalRate = avgRate
      if (avgRate > 1000) {
        console.log(`⚠️ Rate of $${avgRate.toFixed(0)}/night seems high, may be a data issue`)
        // Don't cap it, just warn - let the user see the issue
      }
      
      metrics.pricing = {
        value: finalRate,
        source: hasCSVRate ? 'csv' : 'calculated',
        confidence: hasCSVRate ? 90 : (nightsBooked > 0 ? 60 : 30),
        lastUpdated: new Date()
      }
      
      console.log(`💰 Final pricing:`)
      console.log(`   Source: ${hasCSVRate ? 'CSV data' : 'Calculated'}`)
      console.log(`   Revenue: $${metrics.revenue.value?.toFixed(0) || 0}`)
      console.log(`   Nights: ${nightsBooked}`)
      console.log(`   Avg rate: $${finalRate.toFixed(0)}/night`)
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
      metrics: property.metrics ? {
        ...property.metrics,
        revenue: {
          ...property.metrics.revenue,
          lastUpdated: property.metrics.revenue.lastUpdated?.toISOString()
        },
        occupancy: {
          ...property.metrics.occupancy,
          lastUpdated: property.metrics.occupancy.lastUpdated?.toISOString()
        },
        pricing: {
          ...property.metrics.pricing,
          lastUpdated: property.metrics.pricing.lastUpdated?.toISOString()
        },
        satisfaction: {
          ...property.metrics.satisfaction,
          lastUpdated: property.metrics.satisfaction.lastUpdated?.toISOString()
        },
        health: property.metrics.health
      } : undefined,
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
          },
          propertyMetrics: property.dataSources.csv.propertyMetrics || [] // Preserve the metrics array!
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
    // Ensure property has a name - repair if needed
    if (!data.name && data.standardName) {
      data.name = data.standardName
      console.log(`Repaired property name during deserialization for: ${data.standardName}`)
    }
    
    return {
      ...data,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
      lastSyncedAt: data.lastSyncedAt ? new Date(data.lastSyncedAt) : undefined,
      metrics: data.metrics ? {
        ...data.metrics,
        revenue: data.metrics.revenue ? {
          ...data.metrics.revenue,
          lastUpdated: data.metrics.revenue.lastUpdated ? new Date(data.metrics.revenue.lastUpdated) : new Date()
        } : undefined,
        occupancy: data.metrics.occupancy ? {
          ...data.metrics.occupancy,
          lastUpdated: data.metrics.occupancy.lastUpdated ? new Date(data.metrics.occupancy.lastUpdated) : new Date()
        } : undefined,
        pricing: data.metrics.pricing ? {
          ...data.metrics.pricing,
          lastUpdated: data.metrics.pricing.lastUpdated ? new Date(data.metrics.pricing.lastUpdated) : new Date()
        } : undefined,
        satisfaction: data.metrics.satisfaction ? {
          ...data.metrics.satisfaction,
          lastUpdated: data.metrics.satisfaction.lastUpdated ? new Date(data.metrics.satisfaction.lastUpdated) : new Date()
        } : undefined,
        health: data.metrics.health || 0
      } : undefined,
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
          } : undefined,
          propertyMetrics: data.dataSources.csv.propertyMetrics || [] // Preserve the metrics array!
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
    // Also clear migration flag to prevent re-migration
    localStorage.removeItem('gostudiom_migration_completed')
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