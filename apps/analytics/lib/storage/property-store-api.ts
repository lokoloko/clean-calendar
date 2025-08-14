/**
 * PropertyStore API Version
 * Uses API calls instead of localStorage
 * All methods are now async
 */

import type { Property, PropertyDataSource, PropertyMetrics } from './property-store'

export class PropertyStoreAPI {
  private static VERSION = '2.0.0' // API version
  
  /**
   * Generate a unique ID for a property
   */
  static generateId(): string {
    return `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  /**
   * Get all properties from API
   */
  static async getAll(): Promise<Property[]> {
    try {
      const response = await fetch('/api/properties', {
        credentials: 'same-origin' // Include cookies in the request
      })
      const data = await response.json()
      
      if (!response.ok) {
        console.error('Failed to fetch properties:', data.error)
        return []
      }
      
      // Convert date strings back to Date objects
      return (data.properties || []).map(this.deserializeProperty)
    } catch (error) {
      console.error('Error loading properties:', error)
      return []
    }
  }
  
  /**
   * Get a single property by ID
   */
  static async getById(id: string): Promise<Property | null> {
    try {
      const response = await fetch(`/api/properties/${id}`, {
        credentials: 'same-origin'
      })
      const data = await response.json()
      
      if (!response.ok) {
        console.error('Failed to fetch property:', data.error)
        return null
      }
      
      const property = this.deserializeProperty(data.property)
      
      // Ensure property has a name (repair corrupted data)
      if (property && !property.name && property.standardName) {
        property.name = property.standardName
      }
      
      return property
    } catch (error) {
      console.error('Error loading property:', error)
      return null
    }
  }
  
  /**
   * Save a new property or update existing
   */
  static async save(property: Property): Promise<Property> {
    try {
      // Ensure property has a name
      if (!property.name && property.standardName) {
        property.name = property.standardName
      }
      
      // Update timestamps
      property.updatedAt = new Date()
      if (!property.createdAt) {
        property.createdAt = new Date()
      }
      
      // Calculate data completeness
      property.dataCompleteness = this.calculateCompleteness(property)
      
      const response = await fetch(`/api/properties/${property.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(this.serializeProperty(property))
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        console.error('Failed to save property:', data.error)
        return property
      }
      
      return this.deserializeProperty(data.property)
    } catch (error) {
      console.error('Error saving property:', error)
      return property
    }
  }
  
  /**
   * Create properties from uploaded data (unchanged logic)
   */
  static createFromUpload(uploadData: any): Property[] {
    const properties: Property[] = []
    
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
            },
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
            
            // Check if names are very similar
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
        
        properties.push(property)
      })
    }
    
    return properties
  }
  
  /**
   * Batch save properties to API
   */
  static async saveAll(properties: Property[]): Promise<Property[]> {
    try {
      const response = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          properties: properties.map(p => this.serializeProperty(p)),
          replace: true // Replace all existing properties
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        console.error('Failed to save properties:', data.error)
        return properties
      }
      
      return (data.properties || []).map(this.deserializeProperty)
    } catch (error) {
      console.error('Error saving properties:', error)
      return properties
    }
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
    
    return this.save(property)
  }
  
  /**
   * Delete a property
   */
  static async delete(propertyId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/properties/${propertyId}`, {
        method: 'DELETE',
        credentials: 'same-origin'
      })
      
      return response.ok
    } catch (error) {
      console.error('Error deleting property:', error)
      return false
    }
  }
  
  /**
   * Clear all properties
   */
  static async clear(): Promise<void> {
    try {
      await fetch('/api/properties', {
        method: 'DELETE',
        credentials: 'same-origin'
      })
      console.log('Cleared all properties from session')
    } catch (error) {
      console.error('Error clearing properties:', error)
    }
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
    
    // Update the data source (same logic as before)
    switch (sourceType) {
      case 'scraped':
        property.dataSources.scraped = {
          data: data,
          scrapedAt: new Date(),
          source: 'browserless'
        }
        property.lastSyncedAt = new Date()
        break
      // Add other cases as needed
    }
    
    // Recalculate metrics
    property.metrics = this.calculateMetrics(property)
    property.dataCompleteness = this.calculateCompleteness(property)
    
    return this.save(property)
  }
  
  // Copy all the calculation methods from the original PropertyStore
  // These don't need to change since they're pure functions
  
  static calculateCompleteness(property: Property): number {
    let score = 0
    
    if (property.dataSources.csv) {
      score += 50
      if (property.airbnbUrl) score += 20
      if (property.dataSources.scraped) score += 30
    } else if (property.dataSources.pdf) {
      score += 30
      if (property.airbnbUrl) score += 20
      if (property.dataSources.scraped) score += 30
    } else {
      if (property.airbnbUrl) score += 20
      if (property.dataSources.scraped) score += 30
    }
    
    return Math.min(100, score)
  }
  
  static calculateMetrics(property: Property): PropertyMetrics {
    // Copy the entire calculateMetrics method from the original
    // This is a pure function that doesn't need to change
    const metrics: PropertyMetrics = {
      revenue: { value: 0, source: 'calculated', confidence: 0, lastUpdated: new Date() },
      occupancy: { value: 0, source: 'calculated', confidence: 0, lastUpdated: new Date() },
      pricing: { value: 0, source: 'calculated', confidence: 0, lastUpdated: new Date() },
      satisfaction: { value: 0, source: 'calculated', confidence: 0, lastUpdated: new Date() },
      health: 0
    }
    
    // Calculate revenue from CSV if available
    if (property.dataSources.csv?.propertyMetrics && property.dataSources.csv.propertyMetrics.length > 0) {
      const thisPropertyMetrics = property.dataSources.csv.propertyMetrics[0]
      
      if (thisPropertyMetrics) {
        const revenue = thisPropertyMetrics.totalRevenue || 0
        const nights = thisPropertyMetrics.totalNights || 0
        
        metrics.revenue = {
          value: revenue,
          source: 'csv',
          confidence: 95,
          lastUpdated: property.dataSources.csv.uploadedAt
        }
        
        // Calculate occupancy more accurately
        // The totalNights from CSV includes duplicates (same confirmation code)
        // Apply correction factor: ~64.4% of nights are unique (2203/3421 from analysis)
        
        let occupancyRate = 0
        
        if (property.dataSources.csv?.dateRange) {
          const startDate = new Date(property.dataSources.csv.dateRange.start)
          const endDate = new Date(property.dataSources.csv.dateRange.end)
          
          if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
            const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
            const years = totalDays / 365.25 // Account for leap years
            
            // Apply correction for duplicate confirmation codes
            // Analysis shows ~64.4% of nights are unique (2203/3421)
            const estimatedUniqueNights = nights * 0.644
            const annualNights = estimatedUniqueNights / years
            
            occupancyRate = (annualNights / 365) * 100
            
            console.log(`Occupancy calculation for "${property.name}":`)
            console.log(`  Total reported nights: ${nights}`)
            console.log(`  Estimated unique nights (64.4%): ${estimatedUniqueNights.toFixed(0)}`)
            console.log(`  Years of data: ${years.toFixed(1)}`)
            console.log(`  Annual occupancy: ${occupancyRate.toFixed(1)}%`)
          }
        } else {
          // No date range, assume 1 year and apply same correction
          const estimatedUniqueNights = nights * 0.644
          occupancyRate = (estimatedUniqueNights / 365) * 100
        }
        
        metrics.occupancy = {
          value: Math.min(100, Math.max(0, occupancyRate)),
          source: 'csv',
          confidence: 95,
          lastUpdated: property.dataSources.csv.uploadedAt
        }
        
        // Calculate pricing
        if (nights > 0) {
          metrics.pricing = {
            value: revenue / nights,
            source: 'csv',
            confidence: 90,
            lastUpdated: property.dataSources.csv.uploadedAt
          }
        }
      }
    }
    
    // Add scraped data if available
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
   * Serialize property for API (convert Dates to strings)
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
          propertyMetrics: property.dataSources.csv.propertyMetrics || []
        } : undefined,
        scraped: property.dataSources.scraped ? {
          ...property.dataSources.scraped,
          scrapedAt: property.dataSources.scraped.scrapedAt?.toISOString()
        } : undefined
      }
    }
  }
  
  /**
   * Deserialize property from API (convert strings to Dates)
   */
  private static deserializeProperty(data: any): Property {
    if (!data.name && data.standardName) {
      data.name = data.standardName
    }
    
    return {
      ...data,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
      lastSyncedAt: data.lastSyncedAt ? new Date(data.lastSyncedAt) : undefined,
      metrics: data.metrics ? {
        ...data.metrics,
        revenue: {
          ...data.metrics.revenue,
          lastUpdated: new Date(data.metrics.revenue.lastUpdated)
        },
        occupancy: {
          ...data.metrics.occupancy,
          lastUpdated: new Date(data.metrics.occupancy.lastUpdated)
        },
        pricing: {
          ...data.metrics.pricing,
          lastUpdated: new Date(data.metrics.pricing.lastUpdated)
        },
        satisfaction: {
          ...data.metrics.satisfaction,
          lastUpdated: new Date(data.metrics.satisfaction.lastUpdated)
        },
        health: data.metrics.health
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
          propertyMetrics: data.dataSources.csv.propertyMetrics || []
        } : undefined,
        scraped: data.dataSources?.scraped ? {
          ...data.dataSources.scraped,
          scrapedAt: new Date(data.dataSources.scraped.scrapedAt)
        } : undefined
      }
    }
  }
}

// Export as default to make it easy to swap
export default PropertyStoreAPI