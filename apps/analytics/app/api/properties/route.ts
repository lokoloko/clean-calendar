import { NextRequest, NextResponse } from 'next/server'
import { getSessionId } from '@/lib/session-helper'
import { 
  getSession, 
  saveToSession, 
  addPropertiesToSession,
  updateSessionMetadata 
} from '@/lib/session-store-persistent'
import { PropertyStore, type Property } from '@/lib/storage/property-store'

/**
 * GET /api/properties
 * Get all properties for the current session
 */
export async function GET(request: NextRequest) {
  try {
    const sessionId = await getSessionId()
    const session = getSession(sessionId)
    
    console.log(`GET /api/properties - Session ID: ${sessionId.substring(0, 8)}...`)
    console.log(`Session has ${session.properties.length} properties`)
    
    return NextResponse.json({
      success: true,
      properties: session.properties,
      metadata: session.metadata
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
    const sessionId = await getSessionId()
    const data = await request.json()
    
    console.log(`POST /api/properties - Session ID: ${sessionId.substring(0, 8)}...`)
    console.log(`Creating properties from upload data:`, {
      hasProperties: !!data.properties,
      propertyCount: data.properties?.length || 0,
      replace: data.replace
    })
    
    // Create properties using the existing PropertyStore logic
    // This maintains compatibility with the current data processing
    const properties = PropertyStore.createFromUpload(data)
    
    console.log(`Created ${properties.length} properties from upload data`)
    
    // Save to session instead of localStorage
    if (data.replace) {
      // Replace all properties
      saveToSession(sessionId, properties)
      console.log(`Replaced all properties in session ${sessionId.substring(0, 8)}...`)
    } else {
      // Add to existing properties
      addPropertiesToSession(sessionId, properties)
      console.log(`Added ${properties.length} properties to session ${sessionId.substring(0, 8)}...`)
    }
    
    // Update session metadata if provided
    if (data.csv?.dateRange) {
      updateSessionMetadata(sessionId, {
        csvDateRange: data.csv.dateRange
      })
    }
    
    // Verify save
    const session = getSession(sessionId)
    console.log(`Session ${sessionId.substring(0, 8)}... now has ${session.properties.length} properties`)
    
    return NextResponse.json({
      success: true,
      properties,
      count: properties.length
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