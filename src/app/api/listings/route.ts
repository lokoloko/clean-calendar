import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'

export async function GET() {
  try {
    const user = await requireAuth()
    const listings = await db.getListings(user.id)
    return NextResponse.json(listings)
  } catch (error) {
    console.error('Error fetching listings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch listings' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { name, ics_url, cleaning_fee, timezone, is_active_on_airbnb } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // Only require ICS URL if listing is active on Airbnb
    if (is_active_on_airbnb && !ics_url) {
      return NextResponse.json(
        { error: 'Calendar URL is required for Airbnb listings' },
        { status: 400 }
      )
    }

    const listing = await db.createListing(user.id, {
      name,
      ics_url: is_active_on_airbnb ? ics_url : null,
      cleaning_fee: parseFloat(cleaning_fee) || 0,
      timezone: timezone || 'America/New_York',
      is_active_on_airbnb: is_active_on_airbnb !== false
    })

    // Check if there are cleaners before trying to sync
    let hasCleaners = false
    try {
      const cleanersResult = await db.query(
        'SELECT COUNT(*) as count FROM public.cleaners WHERE user_id = $1',
        [user.id]
      )
      hasCleaners = cleanersResult.rows[0].count > 0
    } catch (error) {
      console.error('Error checking cleaners:', error)
    }

    // Automatically sync if it's an Airbnb listing with ICS URL and cleaners exist
    if (listing.is_active_on_airbnb && listing.ics_url && hasCleaners) {
      try {
        const syncResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/listings/${listing.id}/sync`, {
          method: 'POST',
          headers: {
            'Authorization': request.headers.get('authorization') || '',
            'Cookie': request.headers.get('cookie') || ''
          }
        })
        
        if (syncResponse.ok) {
          const syncResult = await syncResponse.json()
          if (syncResult.note) {
            console.log(`Auto-sync for new listing ${listing.name}: ${syncResult.note}`)
          } else {
            console.log(`Auto-synced new listing ${listing.name}: ${syncResult.itemsCreated} items created`)
          }
        }
      } catch (syncError) {
        // Don't fail the listing creation if sync fails
        console.error('Auto-sync failed for new listing:', syncError)
      }
    } else if (listing.is_active_on_airbnb && listing.ics_url && !hasCleaners) {
      // Return listing with a note about adding cleaners
      return NextResponse.json({
        ...listing,
        syncNote: 'Calendar sync will start automatically after you add cleaners and assign them to this listing.'
      })
    }

    return NextResponse.json(listing)
  } catch (error) {
    console.error('Error creating listing:', error)
    return NextResponse.json(
      { error: 'Failed to create listing' },
      { status: 500 }
    )
  }
}