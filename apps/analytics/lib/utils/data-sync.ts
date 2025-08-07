/**
 * Data Synchronization Utilities
 * Handles syncing property data across different sources
 */

import { PropertyStore, type Property } from '@/lib/storage/property-store'
import type { AirbnbListingData } from '@/lib/scrapers/airbnb-parser'

export interface SyncResult {
  success: boolean
  propertyId: string
  updatedFields: string[]
  errors?: string[]
  timestamp: Date
}

export class DataSync {
  /**
   * Sync property with live Airbnb data
   */
  static async syncWithAirbnb(propertyId: string): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      propertyId,
      updatedFields: [],
      timestamp: new Date()
    }
    
    try {
      const property = PropertyStore.getById(propertyId)
      if (!property) {
        result.errors = ['Property not found']
        return result
      }
      
      if (!property.airbnbUrl) {
        result.errors = ['No Airbnb URL configured for this property']
        return result
      }
      
      // Call scraping API
      const response = await fetch('/api/scrape/airbnb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: property.airbnbUrl,
          propertyId: property.id
        })
      })
      
      if (!response.ok) {
        result.errors = [`Scraping failed: ${response.statusText}`]
        return result
      }
      
      const scrapeResult = await response.json()
      
      if (scrapeResult.success && scrapeResult.data) {
        // Update property with scraped data
        const updated = PropertyStore.updateDataSource(
          propertyId,
          'scraped',
          scrapeResult.data
        )
        
        if (updated) {
          result.success = true
          result.updatedFields = ['scraped', 'lastSyncedAt', 'metrics']
          
          // Check for significant changes
          const changes = this.detectSignificantChanges(property, scrapeResult.data)
          if (changes.length > 0) {
            result.updatedFields.push(...changes)
          }
        }
      } else {
        result.errors = [scrapeResult.error || 'Unknown scraping error']
      }
      
    } catch (error) {
      result.errors = [`Sync failed: ${error}`]
    }
    
    return result
  }
  
  /**
   * Sync all properties with URLs
   */
  static async syncAllProperties(): Promise<{
    total: number
    successful: number
    failed: number
    results: SyncResult[]
  }> {
    const properties = PropertyStore.getAll()
    const propertiesWithUrls = properties.filter(p => p.airbnbUrl)
    
    const results: SyncResult[] = []
    let successful = 0
    let failed = 0
    
    for (const property of propertiesWithUrls) {
      const result = await this.syncWithAirbnb(property.id)
      results.push(result)
      
      if (result.success) {
        successful++
      } else {
        failed++
      }
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    return {
      total: propertiesWithUrls.length,
      successful,
      failed,
      results
    }
  }
  
  /**
   * Detect significant changes between old and new data
   */
  private static detectSignificantChanges(
    property: Property,
    newData: AirbnbListingData
  ): string[] {
    const changes: string[] = []
    
    // Check price changes
    if (property.dataSources.scraped?.data.price?.nightly) {
      const oldPrice = property.dataSources.scraped.data.price.nightly
      const newPrice = newData.price?.nightly || 0
      
      if (Math.abs(oldPrice - newPrice) > 5) {
        changes.push(`price_change_${oldPrice}_to_${newPrice}`)
      }
    }
    
    // Check rating changes
    if (property.dataSources.scraped?.data.reviews?.overall) {
      const oldRating = property.dataSources.scraped.data.reviews.overall
      const newRating = newData.reviews?.overall || 0
      
      if (Math.abs(oldRating - newRating) > 0.1) {
        changes.push(`rating_change_${oldRating}_to_${newRating}`)
      }
    }
    
    // Check review count changes
    if (property.dataSources.scraped?.data.reviews?.count) {
      const oldCount = property.dataSources.scraped.data.reviews.count
      const newCount = newData.reviews?.count || 0
      
      if (newCount > oldCount) {
        changes.push(`new_reviews_${newCount - oldCount}`)
      }
    }
    
    // Check Superhost status change
    if (property.dataSources.scraped?.data.host?.isSuperhost !== undefined) {
      const oldStatus = property.dataSources.scraped.data.host.isSuperhost
      const newStatus = newData.host?.isSuperhost
      
      if (oldStatus !== newStatus) {
        changes.push(`superhost_${newStatus ? 'gained' : 'lost'}`)
      }
    }
    
    return changes
  }
  
  /**
   * Reconcile data from multiple sources
   */
  static reconcileData(property: Property): {
    revenue: number
    nights: number
    avgStay: number
    occupancy: number
    avgRate: number
    confidence: {
      revenue: number
      nights: number
      avgStay: number
    }
  } {
    const result = {
      revenue: 0,
      nights: 0,
      avgStay: 0,
      occupancy: 0,
      avgRate: 0,
      confidence: {
        revenue: 0,
        nights: 0,
        avgStay: 0
      }
    }
    
    // Revenue - prefer PDF data
    if (property.dataSources.pdf) {
      const pdfProp = property.dataSources.pdf.data.properties?.[0]
      if (pdfProp) {
        result.revenue = pdfProp.netEarnings || 0
        result.confidence.revenue = 90
      }
    }
    
    // Nights - prefer CSV data
    if (property.dataSources.csv) {
      result.nights = property.dataSources.csv.recordCount || 0
      result.confidence.nights = 95
    } else if (property.dataSources.pdf) {
      result.nights = property.dataSources.pdf.data.totalNightsBooked || 0
      result.confidence.nights = 70
    }
    
    // Average stay - prefer CSV data
    if (property.dataSources.csv && property.dataSources.csv.data.length > 0) {
      // Calculate from transaction data
      const stays = property.dataSources.csv.data.map((t: any) => t.nights || 1)
      result.avgStay = stays.reduce((a: number, b: number) => a + b, 0) / stays.length
      result.confidence.avgStay = 95
    } else if (property.dataSources.pdf) {
      result.avgStay = property.dataSources.pdf.data.avgNightStay || 0
      result.confidence.avgStay = 60
    }
    
    // Calculate occupancy
    if (result.nights > 0) {
      const daysInPeriod = 365 // Approximate
      result.occupancy = Math.min(100, (result.nights / daysInPeriod) * 100)
    }
    
    // Calculate average rate
    if (property.dataSources.scraped?.data.price?.nightly) {
      result.avgRate = property.dataSources.scraped.data.price.nightly
    } else if (result.revenue > 0 && result.nights > 0) {
      result.avgRate = result.revenue / result.nights
    }
    
    return result
  }
  
  /**
   * Schedule automatic sync for a property
   */
  static scheduleAutoSync(
    propertyId: string,
    intervalHours: number = 24
  ): NodeJS.Timeout {
    return setInterval(async () => {
      console.log(`Auto-syncing property ${propertyId}...`)
      const result = await this.syncWithAirbnb(propertyId)
      
      if (result.success) {
        console.log(`Auto-sync successful for ${propertyId}`)
      } else {
        console.error(`Auto-sync failed for ${propertyId}:`, result.errors)
      }
    }, intervalHours * 60 * 60 * 1000)
  }
  
  /**
   * Check if property needs sync
   */
  static needsSync(property: Property): boolean {
    if (!property.airbnbUrl) return false
    if (!property.lastSyncedAt) return true
    
    const hoursSinceSync = 
      (Date.now() - property.lastSyncedAt.getTime()) / (1000 * 60 * 60)
    
    // Sync if more than 24 hours old
    return hoursSinceSync > 24
  }
  
  /**
   * Get sync status for a property
   */
  static getSyncStatus(property: Property): {
    canSync: boolean
    lastSyncedAt?: Date
    hoursSinceSync?: number
    needsSync: boolean
    message: string
  } {
    if (!property.airbnbUrl) {
      return {
        canSync: false,
        needsSync: false,
        message: 'No Airbnb URL configured'
      }
    }
    
    if (!property.lastSyncedAt) {
      return {
        canSync: true,
        needsSync: true,
        message: 'Never synced'
      }
    }
    
    const hoursSinceSync = 
      (Date.now() - property.lastSyncedAt.getTime()) / (1000 * 60 * 60)
    
    return {
      canSync: true,
      lastSyncedAt: property.lastSyncedAt,
      hoursSinceSync,
      needsSync: hoursSinceSync > 24,
      message: hoursSinceSync < 1 
        ? 'Recently synced'
        : hoursSinceSync < 24
        ? `Synced ${Math.round(hoursSinceSync)} hours ago`
        : `Needs sync (${Math.round(hoursSinceSync)} hours ago)`
    }
  }
}