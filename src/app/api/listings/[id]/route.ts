import { db } from '@/lib/db-edge'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params;
    const listing = await db.getListing(id, user.id)

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    return NextResponse.json(listing)
  } catch (error) {
    console.error('Error fetching listing:', error)
    return NextResponse.json(
      { error: 'Failed to fetch listing' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params;
    const body = await request.json()
    const { name, ics_url, cleaning_fee, timezone, is_active_on_airbnb } = body

    // Get the current listing to check if ICS URL changed
    const currentResult = await db.query(
      'SELECT ics_url, is_active_on_airbnb FROM public.listings WHERE id = $1 AND user_id = $2',
      [id, user.id]
    )
    
    if (currentResult.rows.length === 0) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }
    
    const currentListing = currentResult.rows[0]
    const icsUrlChanged = currentListing.ics_url !== (ics_url || null)
    const becameActive = !currentListing.is_active_on_airbnb && is_active_on_airbnb

    const result = await db.query(
      `UPDATE public.listings 
       SET name = $1, ics_url = $2, cleaning_fee = $3, timezone = $4, is_active_on_airbnb = $5, updated_at = NOW()
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [name, ics_url || null, cleaning_fee, timezone || 'America/New_York', is_active_on_airbnb !== false, id, user.id]
    )

    const updatedListing = result.rows[0]

    // Automatically sync if ICS URL was added/changed or listing became active
    if (updatedListing.is_active_on_airbnb && updatedListing.ics_url && (icsUrlChanged || becameActive)) {
      try {
        const syncResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/listings/${id}/sync`, {
          method: 'POST',
          headers: {
            'Authorization': request.headers.get('authorization') || '',
            'Cookie': request.headers.get('cookie') || ''
          }
        })
        
        if (syncResponse.ok) {
          const syncResult = await syncResponse.json()
          if (syncResult.note) {
            console.log(`Auto-sync for updated listing ${updatedListing.name}: ${syncResult.note}`)
          } else {
            console.log(`Auto-synced updated listing ${updatedListing.name}: ${syncResult.itemsCreated} new, ${syncResult.itemsUpdated} updated`)
          }
        }
      } catch (syncError) {
        // Don't fail the update if sync fails
        console.error('Auto-sync failed for updated listing:', syncError)
      }
    }

    return NextResponse.json(updatedListing)
  } catch (error) {
    console.error('Error updating listing:', error)
    return NextResponse.json(
      { error: 'Failed to update listing' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params;
    const result = await db.query(
      'DELETE FROM public.listings WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, user.id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting listing:', error)
    return NextResponse.json(
      { error: 'Failed to delete listing' },
      { status: 500 }
    )
  }
}