import { NextRequest, NextResponse } from 'next/server'
import { getSessionId } from '@/lib/session-helper'
import { 
  getSession, 
  updatePropertyInSession, 
  deletePropertyFromSession 
} from '@/lib/session-store-persistent'
import { getCurrentUser } from '@/lib/auth-helper'
import { PropertyStoreAdapter } from '@/lib/storage/property-store-adapter'

/**
 * GET /api/properties/[id]
 * Get a single property by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params in Next.js 15
    const { id } = await params
    
    // Check if user is authenticated
    const user = await getCurrentUser()
    
    if (user) {
      // Authenticated user - get from database
      console.log(`GET /api/properties/${id} - User: ${user.email}`)
      
      const properties = await PropertyStoreAdapter.getAllForUser(user.id)
      const property = properties.find(p => p.id === id)
      
      if (!property) {
        console.log(`Property ${id} not found for user ${user.email}`)
        return NextResponse.json(
          { 
            success: false, 
            error: 'Property not found',
            property: null
          },
          { status: 404 }
        )
      }
      
      console.log(`Found property: ${property.name} for user ${user.email}`)
      return NextResponse.json({
        success: true,
        property
      })
    } else {
      // Unauthenticated - get from session
      const sessionId = await getSessionId()
      const session = getSession(sessionId)
      
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
    }
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
    // Await params in Next.js 15
    const { id } = await params
    const updates = await request.json()
    
    // Check if user is authenticated
    const user = await getCurrentUser()
    
    if (user) {
      // Authenticated user - update in database
      console.log(`PATCH /api/properties/${id} - User: ${user.email}`)
      console.log('Updates:', updates)
      
      const properties = await PropertyStoreAdapter.getAllForUser(user.id)
      const property = properties.find(p => p.id === id)
      
      if (!property) {
        return NextResponse.json(
          { success: false, error: 'Property not found' },
          { status: 404 }
        )
      }
      
      // Apply updates
      const updatedProperty = {
        ...property,
        ...updates,
        updatedAt: new Date()
      }
      
      // Save the updated property
      await PropertyStoreAdapter.saveForUser(updatedProperty, user.id)
      
      console.log(`Updated property ${property.name} for user ${user.email}`)
      
      return NextResponse.json({
        success: true,
        property: updatedProperty
      })
    } else {
      // Unauthenticated - update in session
      const sessionId = await getSessionId()
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
    }
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