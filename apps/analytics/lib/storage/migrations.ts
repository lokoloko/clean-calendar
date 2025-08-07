/**
 * Data Migration Utilities
 * Handles migration from sessionStorage to persistent PropertyStore
 */

import { PropertyStore, type Property } from './property-store'

export class DataMigration {
  private static MIGRATION_KEY = 'gostudiom_migration_completed'
  
  /**
   * Check if migration has been completed
   */
  static isMigrationCompleted(): boolean {
    return localStorage.getItem(this.MIGRATION_KEY) === 'true'
  }
  
  /**
   * Mark migration as completed
   */
  static markMigrationCompleted(): void {
    localStorage.setItem(this.MIGRATION_KEY, 'true')
  }
  
  /**
   * Migrate data from sessionStorage to PropertyStore
   */
  static async migrateFromSessionStorage(): Promise<{
    success: boolean
    migratedCount: number
    errors: string[]
  }> {
    const result = {
      success: true,
      migratedCount: 0,
      errors: [] as string[]
    }
    
    try {
      // Check for uploadData in sessionStorage
      const uploadData = sessionStorage.getItem('uploadData')
      if (uploadData) {
        console.log('Found uploadData in sessionStorage, migrating...')
        const parsed = JSON.parse(uploadData)
        const properties = PropertyStore.createFromUpload(parsed)
        result.migratedCount += properties.length
        console.log(`Migrated ${properties.length} properties from uploadData`)
      }
      
      // Check for uploadedData (alternative key)
      const uploadedData = sessionStorage.getItem('uploadedData')
      if (uploadedData) {
        console.log('Found uploadedData in sessionStorage, migrating...')
        const parsed = JSON.parse(uploadedData)
        const properties = PropertyStore.createFromUpload(parsed)
        result.migratedCount += properties.length
        console.log(`Migrated ${properties.length} properties from uploadedData`)
      }
      
      // Check for individual property data
      const keys = Object.keys(sessionStorage)
      for (const key of keys) {
        if (key.startsWith('property_') || key.includes('_data')) {
          try {
            const data = sessionStorage.getItem(key)
            if (data) {
              const parsed = JSON.parse(data)
              if (parsed.name || parsed.properties) {
                const properties = PropertyStore.createFromUpload(parsed)
                result.migratedCount += properties.length
                console.log(`Migrated ${properties.length} properties from ${key}`)
              }
            }
          } catch (error) {
            result.errors.push(`Failed to migrate ${key}: ${error}`)
          }
        }
      }
      
      // Mark migration as completed if we migrated any data
      if (result.migratedCount > 0) {
        this.markMigrationCompleted()
        console.log(`Migration completed: ${result.migratedCount} properties migrated`)
      }
      
    } catch (error) {
      result.success = false
      result.errors.push(`Migration failed: ${error}`)
      console.error('Migration error:', error)
    }
    
    return result
  }
  
  /**
   * Sync sessionStorage with PropertyStore (for backwards compatibility)
   */
  static syncWithSessionStorage(properties: Property[]): void {
    if (properties.length === 0) return
    
    // Create a format compatible with existing code
    const uploadData = {
      properties: properties.map(p => {
        const baseData: any = {
          name: p.name,
          standardName: p.standardName,
          netEarnings: 0,
          nightsBooked: 0,
          avgNightStay: 0,
          hasAccurateMetrics: false,
          dataSource: 'pdf-only'
        }
        
        // Add PDF data
        if (p.dataSources.pdf) {
          const pdfProp = p.dataSources.pdf.data.properties?.[0]
          if (pdfProp) {
            baseData.netEarnings = pdfProp.netEarnings || 0
            baseData.grossEarnings = pdfProp.grossEarnings || 0
            baseData.serviceFees = pdfProp.serviceFees || 0
            baseData.adjustments = pdfProp.adjustments || 0
            baseData.taxWithheld = pdfProp.taxWithheld || 0
            baseData.nightsBooked = pdfProp.nightsBooked || 0
            baseData.avgNightStay = pdfProp.avgNightStay || 0
          }
        }
        
        // Add CSV data markers
        if (p.dataSources.csv) {
          baseData.hasAccurateMetrics = true
          baseData.dataSource = 'pdf-csv'
          baseData.csvData = p.dataSources.csv.data
        }
        
        // Add metrics
        if (p.metrics) {
          baseData.revenue = p.metrics.revenue.value
          baseData.health = p.metrics.health
          baseData.occupancyRate = p.metrics.occupancy.value
          baseData.avgNightlyRate = p.metrics.pricing.value
        }
        
        return baseData
      }),
      
      // Add summary data
      totalRevenue: properties.reduce((sum, p) => 
        sum + (p.metrics?.revenue.value || 0), 0
      ),
      totalProperties: properties.length,
      activeProperties: properties.filter(p => 
        (p.metrics?.revenue.value || 0) > 0
      ).length,
      totalNights: properties.reduce((sum, p) => {
        const nights = p.dataSources.pdf?.data.totalNightsBooked || 0
        return sum + nights
      }, 0),
      
      // Add date range if available
      dateRange: properties[0]?.dataSources.pdf?.data.dateRange,
      period: properties[0]?.dataSources.pdf?.data.period,
      
      // Mark data source
      dataSource: properties.some(p => p.dataSources.csv) ? 'pdf-csv' : 'pdf-only'
    }
    
    // Save to sessionStorage for backwards compatibility
    sessionStorage.setItem('uploadData', JSON.stringify(uploadData))
    sessionStorage.setItem('uploadedData', JSON.stringify(uploadData))
  }
  
  /**
   * Clean up old sessionStorage data after successful migration
   */
  static cleanupSessionStorage(): void {
    const keysToRemove = [
      'uploadData',
      'uploadedData',
      'pdfData',
      'csvData',
      'mappingData'
    ]
    
    // Also remove any property-specific keys
    const allKeys = Object.keys(sessionStorage)
    allKeys.forEach(key => {
      if (key.startsWith('property_') || 
          key.includes('_data') || 
          keysToRemove.includes(key)) {
        sessionStorage.removeItem(key)
        console.log(`Removed sessionStorage key: ${key}`)
      }
    })
  }
  
  /**
   * Run automatic migration on app startup
   */
  static async runAutoMigration(): Promise<void> {
    // Skip if already migrated
    if (this.isMigrationCompleted()) {
      console.log('Migration already completed, skipping...')
      return
    }
    
    console.log('Starting automatic data migration...')
    const result = await this.migrateFromSessionStorage()
    
    if (result.success && result.migratedCount > 0) {
      console.log(`Successfully migrated ${result.migratedCount} properties`)
      
      // Keep sessionStorage data for now (backwards compatibility)
      // Can be removed in a future update
      // this.cleanupSessionStorage()
    } else if (result.errors.length > 0) {
      console.error('Migration errors:', result.errors)
    }
  }
  
  /**
   * Export migration report
   */
  static getMigrationReport(): {
    migrated: boolean
    propertyCount: number
    sessionStorageKeys: string[]
    localStorageKeys: string[]
  } {
    const properties = PropertyStore.getAll()
    const sessionKeys = Object.keys(sessionStorage)
    const localKeys = Object.keys(localStorage).filter(k => 
      k.startsWith('gostudiom_')
    )
    
    return {
      migrated: this.isMigrationCompleted(),
      propertyCount: properties.length,
      sessionStorageKeys: sessionKeys,
      localStorageKeys: localKeys
    }
  }
}