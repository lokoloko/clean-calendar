/**
 * React Hook for Property Store
 * Handles both sync (localStorage) and async (database) operations seamlessly
 */

import { useState, useEffect, useCallback } from 'react'
import { PropertyStoreAdapter } from '@/lib/storage/property-store-adapter'
import { PropertyStore as PropertyStoreLocal } from '@/lib/storage/property-store'
import { FeatureFlag, isFeatureEnabled } from '@/lib/features/feature-flags'
import type { Property } from '@/lib/storage/property-store'

interface UsePropertyStoreReturn {
  properties: Property[]
  loading: boolean
  error: string | null
  
  // CRUD operations
  getAll: () => Promise<Property[]>
  getById: (id: string) => Promise<Property | null>
  save: (property: Property) => Promise<Property>
  deleteProperty: (id: string) => Promise<boolean>
  
  // Special operations
  createFromUpload: (uploadData: any) => Promise<Property[]>
  updateDataSource: (propertyId: string, sourceType: 'pdf' | 'csv' | 'scraped', data: any) => Promise<Property | null>
  updateUrl: (propertyId: string, airbnbUrl: string) => Promise<Property | null>
  calculateMetrics: (property: Property) => Promise<any>
  
  // Utility operations
  findByName: (name: string) => Promise<Property[]>
  getIncomplete: () => Promise<Property[]>
  clear: () => Promise<void>
  exportAll: () => Promise<string>
  importData: (jsonString: string) => Promise<number>
  
  // Refresh data
  refresh: () => Promise<void>
}

export function usePropertyStore(): UsePropertyStoreReturn {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDbMode, setIsDbMode] = useState(false)

  // Load initial data
  useEffect(() => {
    loadProperties()
  }, [])

  // Check if database mode is enabled
  useEffect(() => {
    setIsDbMode(isFeatureEnabled(FeatureFlag.USE_DATABASE_STORAGE))
  }, [])

  const loadProperties = async () => {
    setLoading(true)
    setError(null)
    
    try {
      if (isFeatureEnabled(FeatureFlag.USE_DATABASE_STORAGE)) {
        // Database mode (async)
        const props = await PropertyStoreAdapter.getAll()
        setProperties(props)
      } else {
        // LocalStorage mode (sync)
        const props = PropertyStoreLocal.getAll()
        setProperties(props)
      }
    } catch (err) {
      console.error('Error loading properties:', err)
      setError(err instanceof Error ? err.message : 'Failed to load properties')
    } finally {
      setLoading(false)
    }
  }

  const getAll = useCallback(async (): Promise<Property[]> => {
    try {
      const props = await PropertyStoreAdapter.getAll()
      setProperties(props)
      return props
    } catch (err) {
      console.error('Error getting all properties:', err)
      throw err
    }
  }, [])

  const getById = useCallback(async (id: string): Promise<Property | null> => {
    try {
      return await PropertyStoreAdapter.getById(id)
    } catch (err) {
      console.error('Error getting property by ID:', err)
      throw err
    }
  }, [])

  const save = useCallback(async (property: Property): Promise<Property> => {
    try {
      const saved = await PropertyStoreAdapter.save(property)
      // Update local state
      setProperties(prev => {
        const index = prev.findIndex(p => p.id === saved.id)
        if (index >= 0) {
          const updated = [...prev]
          updated[index] = saved
          return updated
        } else {
          return [...prev, saved]
        }
      })
      return saved
    } catch (err) {
      console.error('Error saving property:', err)
      throw err
    }
  }, [])

  const deleteProperty = useCallback(async (id: string): Promise<boolean> => {
    try {
      const result = await PropertyStoreAdapter.delete(id)
      if (result) {
        setProperties(prev => prev.filter(p => p.id !== id))
      }
      return result
    } catch (err) {
      console.error('Error deleting property:', err)
      throw err
    }
  }, [])

  const createFromUpload = useCallback(async (uploadData: any): Promise<Property[]> => {
    try {
      const created = await PropertyStoreAdapter.createFromUpload(uploadData)
      // Refresh all properties
      await loadProperties()
      return created
    } catch (err) {
      console.error('Error creating from upload:', err)
      throw err
    }
  }, [])

  const updateDataSource = useCallback(async (
    propertyId: string,
    sourceType: 'pdf' | 'csv' | 'scraped',
    data: any
  ): Promise<Property | null> => {
    try {
      const updated = await PropertyStoreAdapter.updateDataSource(propertyId, sourceType, data)
      if (updated) {
        setProperties(prev => {
          const index = prev.findIndex(p => p.id === updated.id)
          if (index >= 0) {
            const updatedList = [...prev]
            updatedList[index] = updated
            return updatedList
          }
          return prev
        })
      }
      return updated
    } catch (err) {
      console.error('Error updating data source:', err)
      throw err
    }
  }, [])

  const updateUrl = useCallback(async (propertyId: string, airbnbUrl: string): Promise<Property | null> => {
    try {
      const updated = await PropertyStoreAdapter.updateUrl(propertyId, airbnbUrl)
      if (updated) {
        setProperties(prev => {
          const index = prev.findIndex(p => p.id === updated.id)
          if (index >= 0) {
            const updatedList = [...prev]
            updatedList[index] = updated
            return updatedList
          }
          return prev
        })
      }
      return updated
    } catch (err) {
      console.error('Error updating URL:', err)
      throw err
    }
  }, [])

  const calculateMetrics = useCallback(async (property: Property) => {
    try {
      return await PropertyStoreAdapter.calculateMetrics(property)
    } catch (err) {
      console.error('Error calculating metrics:', err)
      throw err
    }
  }, [])

  const findByName = useCallback(async (name: string): Promise<Property[]> => {
    try {
      return await PropertyStoreAdapter.findByName(name)
    } catch (err) {
      console.error('Error finding by name:', err)
      throw err
    }
  }, [])

  const getIncomplete = useCallback(async (): Promise<Property[]> => {
    try {
      return await PropertyStoreAdapter.getIncomplete()
    } catch (err) {
      console.error('Error getting incomplete properties:', err)
      throw err
    }
  }, [])

  const clear = useCallback(async (): Promise<void> => {
    try {
      await PropertyStoreAdapter.clear()
      setProperties([])
    } catch (err) {
      console.error('Error clearing properties:', err)
      throw err
    }
  }, [])

  const exportAll = useCallback(async (): Promise<string> => {
    try {
      return await PropertyStoreAdapter.exportAll()
    } catch (err) {
      console.error('Error exporting properties:', err)
      throw err
    }
  }, [])

  const importData = useCallback(async (jsonString: string): Promise<number> => {
    try {
      const count = await PropertyStoreAdapter.importData(jsonString)
      await loadProperties()
      return count
    } catch (err) {
      console.error('Error importing data:', err)
      throw err
    }
  }, [])

  const refresh = useCallback(async (): Promise<void> => {
    await loadProperties()
  }, [])

  return {
    properties,
    loading,
    error,
    getAll,
    getById,
    save,
    deleteProperty,
    createFromUpload,
    updateDataSource,
    updateUrl,
    calculateMetrics,
    findByName,
    getIncomplete,
    clear,
    exportAll,
    importData,
    refresh
  }
}

// Export a singleton hook for shared state across components
let sharedStore: UsePropertyStoreReturn | null = null

export function useSharedPropertyStore(): UsePropertyStoreReturn {
  // In production, you might want to use a context provider instead
  // For now, we'll create a simple shared instance
  if (!sharedStore) {
    sharedStore = usePropertyStore()
  }
  return sharedStore
}