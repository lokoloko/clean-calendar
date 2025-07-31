import { db } from '@/lib/db'
import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { canCreateListing, getSubscriptionInfo } from '@/lib/subscription'
import { withApiHandler, parseRequestBody, createApiResponse } from '@/lib/api-wrapper'
import { ApiError } from '@/lib/api-errors'
import { listingSchema } from '@/lib/validations'

export const GET = withApiHandler(async (req: NextRequest) => {
  const user = await requireAuth()
  const [listings, subscriptionInfo] = await Promise.all([
    db.getListings(user.id),
    getSubscriptionInfo(user.id)
  ])
  
  return createApiResponse.success({
    listings,
    subscription: subscriptionInfo
  })
})

export const POST = withApiHandler(async (req: NextRequest) => {
  const user = await requireAuth()
  
  // Check if user can create more listings
  const canCreate = await canCreateListing(user.id)
  if (!canCreate.allowed) {
    throw new ApiError(403, canCreate.reason || 'Limit reached', 'LISTING_LIMIT_REACHED', {
      limit: canCreate.limit,
      current: canCreate.current,
      upgradeUrl: '/billing/upgrade?feature=listings'
    })
  }
  
  // Validate request body with Zod
  const validatedData = await parseRequestBody(req, listingSchema)
  const { name, ics_url, cleaning_fee, timezone, is_active_on_airbnb } = validatedData

  // Only require ICS URL if listing is active on Airbnb
  if (is_active_on_airbnb && !ics_url) {
    throw new ApiError(400, 'Calendar URL is required for Airbnb listings', 'ICS_URL_REQUIRED')
  }

  const listing = await db.createListing({
    userId: user.id,
    name,
    icsUrl: is_active_on_airbnb ? ics_url : null,
    timezone,
    isActiveOnAirbnb: is_active_on_airbnb
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
            'Authorization': req.headers.get('authorization') || '',
            'Cookie': req.headers.get('cookie') || ''
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
      return createApiResponse.success({
        ...listing,
        syncNote: 'Calendar sync will start automatically after you add cleaners and assign them to this listing.'
      })
    }

    return createApiResponse.created(listing)
})