/**
 * Property Store Adapter
 * Unified interface that switches between localStorage and database based on feature flags
 * Supports dual-write mode for safe migration
 */

import { PropertyStore as PropertyStoreLocal } from './property-store'
import { PropertyStoreDB } from './property-store-db'
import { FeatureFlag, isFeatureEnabled } from '@/lib/features/feature-flags'
import type { Property, PropertyDataSource, PropertyMetrics } from './property-store'

export class PropertyStoreAdapter {
  /**
   * Get the active store based on feature flags
   */
  private static getStore() {
    if (isFeatureEnabled(FeatureFlag.USE_DATABASE_STORAGE)) {
      return PropertyStoreDB
    }
    return PropertyStoreLocal
  }

  /**
   * Check if dual-write mode is enabled
   */
  private static isDualWriteEnabled(): boolean {
    return isFeatureEnabled(FeatureFlag.DUAL_WRITE_MODE)
  }

  /**
   * Generate a unique ID for a property
   */
  static generateId(): string {
    return this.getStore().generateId()
  }

  /**
   * Get all properties
   */
  static async getAll(): Promise<Property[]> {
    const store = this.getStore()
    
    if (store === PropertyStoreDB) {
      return await PropertyStoreDB.getAll()
    } else {
      // LocalStorage version is synchronous
      return PropertyStoreLocal.getAll()
    }
  }

  /**
   * Get all properties for a specific user
   */
  static async getAllForUser(userId: string): Promise<Property[]> {
    const store = this.getStore()
    
    if (store === PropertyStoreDB) {
      return await PropertyStoreDB.getAllForUser(userId)
    } else {
      // LocalStorage doesn't have user separation, return all
      return PropertyStoreLocal.getAll()
    }
  }

  /**
   * Get all properties (synchronous version for compatibility)
   */
  static getAllSync(): Property[] {
    if (isFeatureEnabled(FeatureFlag.USE_DATABASE_STORAGE)) {
      console.warn('getAllSync called but database mode is enabled. Use getAll() instead.')
      // Return cached data if available
      return []
    }
    return PropertyStoreLocal.getAll()
  }

  /**
   * Get a single property by ID
   */
  static async getById(id: string): Promise<Property | null> {
    const store = this.getStore()
    
    if (store === PropertyStoreDB) {
      return await PropertyStoreDB.getById(id)
    } else {
      return PropertyStoreLocal.getById(id)
    }
  }

  /**
   * Get a single property by ID (synchronous version for compatibility)
   */
  static getByIdSync(id: string): Property | null {
    if (isFeatureEnabled(FeatureFlag.USE_DATABASE_STORAGE)) {
      console.warn('getByIdSync called but database mode is enabled. Use getById() instead.')
      return null
    }
    return PropertyStoreLocal.getById(id)
  }

  /**
   * Save a property for a specific user
   */
  static async saveForUser(property: Property, userId: string): Promise<Property> {
    // Add userId to property
    const propertyWithUser = { ...property, userId }
    
    // Dual-write mode: write to both stores
    if (this.isDualWriteEnabled()) {
      try {
        // Write to localStorage first (synchronous)
        PropertyStoreLocal.save(propertyWithUser)
        
        // Then write to database (async)
        await PropertyStoreDB.saveForUser(propertyWithUser, userId)
        
        console.log(`Dual-write successful for property ${property.id}`)
      } catch (error) {
        console.error('Dual-write failed:', error)
        // Continue with single store
      }
    }
    
    // Normal mode: write to active store
    const store = this.getStore()
    
    if (store === PropertyStoreDB) {
      return await PropertyStoreDB.saveForUser(propertyWithUser, userId)
    } else {
      return PropertyStoreLocal.save(propertyWithUser)
    }
  }

  /**
   * Save a property
   */
  static async save(property: Property): Promise<Property> {
    // Dual-write mode: write to both stores
    if (this.isDualWriteEnabled()) {
      try {
        // Write to localStorage first (synchronous)
        PropertyStoreLocal.save(property)
        
        // Then write to database (async)
        await PropertyStoreDB.save(property)
        
        console.log(`Dual-write successful for property ${property.id}`)
      } catch (error) {
        console.error('Error in dual-write mode:', error)
        // Continue with primary store even if dual-write fails
      }
    }

    // Primary write
    const store = this.getStore()
    if (store === PropertyStoreDB) {
      return await PropertyStoreDB.save(property)
    } else {
      return PropertyStoreLocal.save(property)
    }
  }

  /**
   * Save a property (synchronous version for compatibility)
   */
  static saveSync(property: Property): Property {
    if (isFeatureEnabled(FeatureFlag.USE_DATABASE_STORAGE)) {
      console.warn('saveSync called but database mode is enabled. Use save() instead.')
      // Queue for later save
      this.queueForSave(property)
      return property
    }
    
    // Dual-write mode
    if (this.isDualWriteEnabled()) {
      PropertyStoreLocal.save(property)
      // Queue database write for later
      this.queueForSave(property)
    }
    
    return PropertyStoreLocal.save(property)
  }

  /**
   * Create properties from upload
   */
  static async createFromUpload(uploadData: any): Promise<Property[]> {
    // Dual-write mode
    if (this.isDualWriteEnabled()) {
      try {
        PropertyStoreLocal.createFromUpload(uploadData)
        await PropertyStoreDB.createFromUpload(uploadData)
        console.log('Dual-write successful for upload')
      } catch (error) {
        console.error('Error in dual-write mode:', error)
      }
    }

    const store = this.getStore()
    if (store === PropertyStoreDB) {
      return await PropertyStoreDB.createFromUpload(uploadData)
    } else {
      return PropertyStoreLocal.createFromUpload(uploadData)
    }
  }

  /**
   * Update data source
   */
  static async updateDataSource(
    propertyId: string,
    sourceType: 'pdf' | 'csv' | 'scraped',
    data: any
  ): Promise<Property | null> {
    // Dual-write mode
    if (this.isDualWriteEnabled()) {
      try {
        PropertyStoreLocal.updateDataSource(propertyId, sourceType, data)
        await PropertyStoreDB.updateDataSource(propertyId, sourceType, data)
        console.log(`Dual-write successful for data source update ${propertyId}`)
      } catch (error) {
        console.error('Error in dual-write mode:', error)
      }
    }

    const store = this.getStore()
    if (store === PropertyStoreDB) {
      return await PropertyStoreDB.updateDataSource(propertyId, sourceType, data)
    } else {
      return PropertyStoreLocal.updateDataSource(propertyId, sourceType, data)
    }
  }

  /**
   * Update property URL
   */
  static async updateUrl(propertyId: string, airbnbUrl: string): Promise<Property | null> {
    // Dual-write mode
    if (this.isDualWriteEnabled()) {
      try {
        PropertyStoreLocal.updateUrl(propertyId, airbnbUrl)
        await PropertyStoreDB.updateUrl(propertyId, airbnbUrl)
        console.log(`Dual-write successful for URL update ${propertyId}`)
      } catch (error) {
        console.error('Error in dual-write mode:', error)
      }
    }

    const store = this.getStore()
    if (store === PropertyStoreDB) {
      return await PropertyStoreDB.updateUrl(propertyId, airbnbUrl)
    } else {
      return PropertyStoreLocal.updateUrl(propertyId, airbnbUrl)
    }
  }

  /**
   * Delete a property
   */
  static async delete(propertyId: string): Promise<boolean> {
    // Dual-write mode: delete from both
    if (this.isDualWriteEnabled()) {
      try {
        PropertyStoreLocal.delete(propertyId)
        await PropertyStoreDB.delete(propertyId)
        console.log(`Dual-delete successful for property ${propertyId}`)
      } catch (error) {
        console.error('Error in dual-write mode:', error)
      }
    }

    const store = this.getStore()
    if (store === PropertyStoreDB) {
      return await PropertyStoreDB.delete(propertyId)
    } else {
      return PropertyStoreLocal.delete(propertyId)
    }
  }

  /**
   * Find properties by name
   */
  static async findByName(name: string): Promise<Property[]> {
    const store = this.getStore()
    if (store === PropertyStoreDB) {
      return await PropertyStoreDB.findByName(name)
    } else {
      return PropertyStoreLocal.findByName(name)
    }
  }

  /**
   * Get incomplete properties
   */
  static async getIncomplete(): Promise<Property[]> {
    const store = this.getStore()
    if (store === PropertyStoreDB) {
      return await PropertyStoreDB.getIncomplete()
    } else {
      return PropertyStoreLocal.getIncomplete()
    }
  }

  /**
   * Calculate metrics (public method)
   */
  static async calculateMetrics(property: Property): Promise<PropertyMetrics> {
    const store = this.getStore()
    if (store === PropertyStoreDB) {
      return await PropertyStoreDB.calculateMetrics(property)
    } else {
      return PropertyStoreLocal.calculateMetrics(property)
    }
  }

  /**
   * Clear all properties
   */
  static async clear(): Promise<void> {
    // Clear both stores in dual-write mode
    if (this.isDualWriteEnabled()) {
      PropertyStoreLocal.clear()
      await PropertyStoreDB.clear()
      return
    }

    const store = this.getStore()
    if (store === PropertyStoreDB) {
      await PropertyStoreDB.clear()
    } else {
      PropertyStoreLocal.clear()
    }
  }

  /**
   * Export all data
   */
  static async exportAll(): Promise<string> {
    const store = this.getStore()
    if (store === PropertyStoreDB) {
      return await PropertyStoreDB.exportAll()
    } else {
      return PropertyStoreLocal.exportAll()
    }
  }

  /**
   * Import data
   */
  static async importData(jsonString: string): Promise<number> {
    // Import to both stores in dual-write mode
    if (this.isDualWriteEnabled()) {
      try {
        const localCount = PropertyStoreLocal.importData(jsonString)
        const dbCount = await PropertyStoreDB.importData(jsonString)
        return Math.max(localCount, dbCount)
      } catch (error) {
        console.error('Error in dual-write import:', error)
      }
    }

    const store = this.getStore()
    if (store === PropertyStoreDB) {
      return await PropertyStoreDB.importData(jsonString)
    } else {
      return PropertyStoreLocal.importData(jsonString)
    }
  }

  // Migration helpers

  /**
   * Migrate data from localStorage to database
   */
  static async migrateToDatabase(): Promise<{
    success: boolean
    migratedCount: number
    errors: string[]
  }> {
    const errors: string[] = []
    let migratedCount = 0

    try {
      // Check if migration is enabled
      if (!isFeatureEnabled(FeatureFlag.ENABLE_MIGRATION)) {
        errors.push('Migration is not enabled. Enable the ENABLE_MIGRATION feature flag.')
        return { success: false, migratedCount, errors }
      }

      // Get all properties from localStorage
      const localProperties = PropertyStoreLocal.getAll()
      console.log(`Found ${localProperties.length} properties in localStorage`)

      // Migrate each property
      for (const property of localProperties) {
        try {
          await PropertyStoreDB.save(property)
          migratedCount++
        } catch (error) {
          errors.push(`Failed to migrate property ${property.id}: ${error}`)
        }
      }

      console.log(`Successfully migrated ${migratedCount} of ${localProperties.length} properties`)

      // Mark migration as complete
      localStorage.setItem('gostudiom_migration_completed', new Date().toISOString())

      return {
        success: migratedCount === localProperties.length,
        migratedCount,
        errors
      }
    } catch (error) {
      errors.push(`Migration failed: ${error}`)
      return { success: false, migratedCount, errors }
    }
  }

  /**
   * Check if migration has been completed
   */
  static isMigrationCompleted(): boolean {
    return !!localStorage.getItem('gostudiom_migration_completed')
  }

  // Queue for async operations when called synchronously

  private static saveQueue: Property[] = []
  private static saveQueueTimer: NodeJS.Timeout | null = null

  private static queueForSave(property: Property): void {
    this.saveQueue.push(property)
    
    // Debounce saves
    if (this.saveQueueTimer) {
      clearTimeout(this.saveQueueTimer)
    }
    
    this.saveQueueTimer = setTimeout(async () => {
      await this.processSaveQueue()
    }, 100)
  }

  private static async processSaveQueue(): Promise<void> {
    const queue = [...this.saveQueue]
    this.saveQueue = []
    
    for (const property of queue) {
      try {
        await PropertyStoreDB.save(property)
      } catch (error) {
        console.error(`Failed to save property ${property.id}:`, error)
      }
    }
  }
}

// Export a default instance that maintains compatibility with existing code
export const PropertyStore = PropertyStoreAdapter