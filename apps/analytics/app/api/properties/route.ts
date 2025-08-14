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
    const user = getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
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
    const user = getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const data = await request.json()
    
    console.log(`POST /api/properties - User: ${user.email}`)
    console.log(`Creating properties from upload data:`, {
      hasProperties: !!data.properties,
      propertyCount: data.properties?.length || 0,
      replace: data.replace
    })
    
    // Create properties with user_id
    const propertiesData = data.properties || []
    const savedProperties: Property[] = []
    
    for (const propData of propertiesData) {
      const property: Property = {
        ...propData,
        id: propData.id || PropertyStoreAdapter.generateId(),
        userId: user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      const saved = await PropertyStoreAdapter.saveForUser(property, user.id)
      if (saved) {
        savedProperties.push(saved)
      }
    }
    
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
 * Clear all properties from session
 */
export async function DELETE(request: NextRequest) {
  try {
    const sessionId = await getSessionId()
    saveToSession(sessionId, [])
    
    return NextResponse.json({
      success: true,
      message: 'All properties cleared'
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