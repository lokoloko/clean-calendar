import { NextRequest, NextResponse } from 'next/server'
import { getSessionId } from '@/lib/session-helper'
import { 
  getSession, 
  updatePropertyInSession, 
  deletePropertyFromSession 
} from '@/lib/session-store-persistent'

/**
 * GET /api/properties/[id]
 * Get a single property by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionId = await getSessionId()
    const session = getSession(sessionId)
    
    // Await params in Next.js 15
    const { id } = await params
    
    console.log(`GET /api/properties/${id} - Session: ${sessionId?.substring(0, 8)}...`)
    console.log(`Session has ${session.properties.length} properties`)
    console.log(`Looking for property ID: ${id}`)
    
    const property = session.properties.find(p => p.id === id)
    
    if (!property) {
      console.log(`Property ${id} not found in session`)
      console.log('Available property IDs:', session.properties.map(p => p.id))
      return NextResponse.json(
        { 
          success: false, 
          error: 'Property not found' 
        },
        { status: 404 }
      )
    }
    
    console.log(`Found property: ${property.name}`)
    return NextResponse.json({
      success: true,
      property
    })
  } catch (error) {
    console.error('Error fetching property:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch property' 
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/properties/[id]
 * Update a property
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionId = await getSessionId()
    const updates = await request.json()
    
    // Await params in Next.js 15
    const { id } = await params
    
    const updatedProperty = updatePropertyInSession(sessionId, id, updates)
    
    if (!updatedProperty) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Property not found' 
        },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      property: updatedProperty
    })
  } catch (error) {
    console.error('Error updating property:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update property' 
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/properties/[id]
 * Delete a property
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionId = await getSessionId()
    
    // Await params in Next.js 15
    const { id } = await params
    
    const deleted = deletePropertyFromSession(sessionId, id)
    
    if (!deleted) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Property not found' 
        },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Property deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting property:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete property' 
      },
      { status: 500 }
    )
  }
}