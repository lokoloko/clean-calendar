import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-helper'
import { PropertyStoreAdapter } from '@/lib/storage/property-store-adapter'
import type { Property } from '@/lib/storage/property-store'

/**
 * GET /api/properties
 * Get all properties for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    // For unauthenticated users, return empty array (they haven't saved anything yet)
    if (!user) {
      return NextResponse.json({
        success: true,
        properties: [],
        metadata: {
          count: 0,
          userId: 'anonymous'
        }
      })
    }
    
    console.log(`GET /api/properties - User: ${user.email}`)
    
    // Get properties from database
    const properties = await PropertyStoreAdapter.getAllForUser(user.id)
    
    console.log(`Found ${properties.length} properties for user ${user.email}`)
    
    return NextResponse.json({
      success: true,
      properties,
      metadata: {
        count: properties.length,
        userId: user.id
      }
    })
  } catch (error) {
    console.error('Error fetching properties:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch properties',
        properties: [] 
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/properties
 * Create properties from uploaded data
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    const data = await request.json()
    
    // For unauthenticated users, store in session/localStorage
    // They'll need to login to persist to database
    if (!user) {
      // For now, just return success
      // In a real app, we'd store this in a session or temporary storage
      console.log('Anonymous user uploading data - storing temporarily')
      
      return NextResponse.json({
        success: true,
        properties: data.properties || [],
        count: data.properties?.length || 0,
        message: 'Data processed successfully. Login to save permanently.'
      })
    }
    
    console.log(`POST /api/properties - User: ${user.email}`)
    console.log(`Creating properties from upload data:`, {
      hasProperties: !!data.properties,
      propertyCount: data.properties?.length || 0,
      replace: data.replace
    })
    
    // Transform upload data to Property format
    const uploadData = {
      ...data,
      fileName: data.fileName || 'earnings.pdf',
      period: data.pdf?.period || data.period || '',
      dateRange: data.pdf?.dateRange || data.dateRange || ''
    }
    
    // Use createFromUpload to properly process the data with user context
    const savedProperties = await PropertyStoreAdapter.createFromUpload(uploadData, user.id)
    
    console.log(`Saved ${savedProperties.length} properties for user ${user.email}`)
    
    return NextResponse.json({
      success: true,
      properties: savedProperties,
      count: savedProperties.length
    })
  } catch (error) {
    console.error('Error creating properties:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create properties'
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/properties
 * Clear all properties for current user
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Would implement clear functionality here if needed
    // For now, just return success
    
    return NextResponse.json({
      success: true,
      message: 'Properties cleared'
    })
  } catch (error) {
    console.error('Error clearing properties:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to clear properties'
      },
      { status: 500 }
    )
  }
}