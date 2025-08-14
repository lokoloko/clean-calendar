import { NextRequest, NextResponse } from 'next/server'
import { getSessionId } from '@/lib/session-helper'
import { getSession, updatePropertyInSession } from '@/lib/session-store'
import { DataSync } from '@/lib/utils/data-sync'
import { PropertyStore } from '@/lib/storage/property-store'

/**
 * POST /api/properties/[id]/sync
 * Sync a property with Airbnb
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = await getSessionId()
    const session = getSession(sessionId)
    
    const property = session.properties.find(p => p.id === params.id)
    
    if (!property) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Property not found' 
        },
        { status: 404 }
      )
    }
    
    if (!property.airbnbUrl) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Property has no Airbnb URL to sync' 
        },
        { status: 400 }
      )
    }
    
    // Use existing sync logic
    const result = await DataSync.syncWithAirbnbUrl(property.airbnbUrl)
    
    if (result.success && result.data) {
      // Update property with scraped data
      const updatedProperty = updatePropertyInSession(sessionId, params.id, {
        dataSources: {
          ...property.dataSources,
          scraped: {
            data: result.data,
            scrapedAt: new Date(),
            source: 'browserless'
          }
        },
        lastSyncedAt: new Date(),
        // Recalculate metrics with new data
        metrics: PropertyStore.calculateMetrics({
          ...property,
          dataSources: {
            ...property.dataSources,
            scraped: {
              data: result.data,
              scrapedAt: new Date(),
              source: 'browserless'
            }
          }
        })
      })
      
      return NextResponse.json({
        success: true,
        property: updatedProperty,
        data: result.data
      })
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: result.errors?.join(', ') || 'Sync failed' 
      },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error syncing property:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to sync property' 
      },
      { status: 500 }
    )
  }
}