import { supabase, getCurrentUser, isDevelopmentMode } from '../supabase/client'
import type { Database } from '../supabase/database.types'

type Property = Database['analytics']['Tables']['properties']['Row']
type PropertyInsert = Database['analytics']['Tables']['properties']['Insert']
type PropertyUpdate = Database['analytics']['Tables']['properties']['Update']
type PropertyMetrics = Database['analytics']['Tables']['property_metrics']['Row']
type DataSource = Database['analytics']['Tables']['data_sources']['Row']

export class AnalyticsDB {
  // Properties CRUD
  static async getProperties(userId?: string) {
    const user = userId || (await getCurrentUser())?.id
    if (!user) return []

    const { data, error } = await supabase
      .schema('analytics')
      .from('properties')
      .select('*')
      .eq('user_id', user)
      .order('name')

    if (error) {
      console.error('Error fetching properties:', error)
      return []
    }

    return data || []
  }

  static async getPropertyById(id: string) {
    const { data, error } = await supabase
      .schema('analytics')
      .from('properties')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching property:', error)
      return null
    }

    return data
  }

  static async createProperty(property: Omit<PropertyInsert, 'user_id'>) {
    const user = await getCurrentUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .schema('analytics')
      .from('properties')
      .insert({
        ...property,
        user_id: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating property:', error)
      throw error
    }

    return data
  }

  static async updateProperty(id: string, updates: PropertyUpdate) {
    const { data, error } = await supabase
      .schema('analytics')
      .from('properties')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating property:', error)
      throw error
    }

    return data
  }

  static async deleteProperty(id: string) {
    const { error } = await supabase
      .schema('analytics')
      .from('properties')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting property:', error)
      throw error
    }
  }

  // Property Metrics
  static async getPropertyMetrics(propertyId: string) {
    const { data, error } = await supabase
      .schema('analytics')
      .from('property_metrics')
      .select('*')
      .eq('property_id', propertyId)
      .order('period_end', { ascending: false })

    if (error) {
      console.error('Error fetching metrics:', error)
      return []
    }

    return data || []
  }

  static async upsertPropertyMetrics(metrics: Omit<Database['analytics']['Tables']['property_metrics']['Insert'], 'id'>) {
    const { data, error } = await supabase
      .schema('analytics')
      .from('property_metrics')
      .upsert(metrics, {
        onConflict: 'property_id,period_start,period_end,source'
      })
      .select()
      .single()

    if (error) {
      console.error('Error upserting metrics:', error)
      throw error
    }

    return data
  }

  // Data Sources
  static async getDataSources(propertyId: string) {
    const { data, error } = await supabase
      .schema('analytics')
      .from('data_sources')
      .select('*')
      .eq('property_id', propertyId)
      .order('uploaded_at', { ascending: false })

    if (error) {
      console.error('Error fetching data sources:', error)
      return []
    }

    return data || []
  }

  static async addDataSource(dataSource: Omit<Database['analytics']['Tables']['data_sources']['Insert'], 'id'>) {
    const { data, error } = await supabase
      .schema('analytics')
      .from('data_sources')
      .insert(dataSource)
      .select()
      .single()

    if (error) {
      console.error('Error adding data source:', error)
      throw error
    }

    return data
  }

  // Property Overview (using the view)
  static async getPropertiesOverview(userId?: string) {
    const user = userId || (await getCurrentUser())?.id
    if (!user) return []

    const { data, error } = await supabase
      .schema('analytics')
      .from('property_overview')
      .select('*')
      .eq('user_id', user)
      .order('name')

    if (error) {
      console.error('Error fetching properties overview:', error)
      return []
    }

    return data || []
  }

  // Bulk operations for initial data upload
  static async bulkCreateProperties(properties: Omit<PropertyInsert, 'user_id'>[]) {
    const user = await getCurrentUser()
    if (!user) throw new Error('User not authenticated')

    const propertiesWithUser = properties.map(p => ({
      ...p,
      user_id: user.id
    }))

    const { data, error } = await supabase
      .schema('analytics')
      .from('properties')
      .insert(propertiesWithUser)
      .select()

    if (error) {
      console.error('Error bulk creating properties:', error)
      throw error
    }

    return data || []
  }

  // Migration helper - check if user has existing properties
  static async hasExistingProperties(userId?: string) {
    const user = userId || (await getCurrentUser())?.id
    if (!user) return false

    const { count, error } = await supabase
      .schema('analytics')
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user)

    if (error) {
      console.error('Error checking existing properties:', error)
      return false
    }

    return (count || 0) > 0
  }

  // Link property to calendar listing
  static async linkToListing(propertyId: string, listingId: string) {
    const { data, error } = await supabase
      .schema('analytics')
      .from('properties')
      .update({ listing_id: listingId })
      .eq('id', propertyId)
      .select()
      .single()

    if (error) {
      console.error('Error linking to listing:', error)
      throw error
    }

    return data
  }
}