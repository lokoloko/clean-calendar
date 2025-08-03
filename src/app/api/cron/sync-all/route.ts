import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { parseICSFromURL, getCheckoutTime } from '@/lib/ics-parser'

export async function POST(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    
    // For now, sync only for the primary user (you)
    // In the future, this would iterate through all users
    const userId = 'e488f6e1-1b21-4513-be24-0b8c2bb5f3f0' // richmontoya@gmail.com
    
    // Get all listings with ICS URLs for this user
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select('*')
      .eq('user_id', userId)
      .not('ics_url', 'is', null)

    if (listingsError) throw listingsError
    if (!listings || listings.length === 0) {
      return NextResponse.json({
        success: true,
        summary: { total: 0, successful: 0, failed: 0, skipped: 0 },
        results: [],
        syncedAt: new Date().toISOString()
      })
    }

    const results = []

    for (const listing of listings) {
      try {
        // Get assigned cleaners for this listing
        const { data: assignments, error: assignmentsError } = await supabase
          .from('assignments')
          .select('cleaner_id')
          .eq('listing_id', listing.id)

        if (assignmentsError) throw assignmentsError

        const defaultCleanerId = assignments?.[0]?.cleaner_id || null

        if (!defaultCleanerId) {
          results.push({
            listingId: listing.id,
            listingName: listing.name,
            status: 'skipped',
            reason: 'No cleaner assigned'
          })
          continue
        }

        // Parse the ICS file
        const bookings = await parseICSFromURL(listing.ics_url)
        
        console.log(`Parsed ${bookings.length} bookings from ${listing.name} ICS feed`)
        
        // Get all future bookings UIDs from the ICS feed
        const currentBookingUids = bookings.map(b => b.uid)
        
        // First, mark past bookings as completed if they haven't been marked yet
        const today = new Date().toISOString().split('T')[0]
        await supabase
          .from('schedule_items')
          .update({
            status: 'completed',
            is_completed: true,
            updated_at: new Date().toISOString()
          })
          .eq('listing_id', listing.id)
          .lt('check_out', today)
          .eq('status', 'pending')

        // Get existing future bookings to check for cancellations
        const { data: existingItems } = await supabase
          .from('schedule_items')
          .select('booking_uid')
          .eq('listing_id', listing.id)
          .gt('check_out', today)
          .neq('status', 'cancelled')
          .neq('status', 'completed')
          .eq('source', 'airbnb')

        // Find bookings that are no longer in the ICS feed
        const existingUids = existingItems?.map(item => item.booking_uid) || []
        const cancelledUids = existingUids.filter(uid => !currentBookingUids.includes(uid))

        // Mark cancelled bookings
        if (cancelledUids.length > 0) {
          console.log(`Found ${cancelledUids.length} cancelled bookings for ${listing.name}:`, cancelledUids)
          
          // We need to update each cancelled booking individually to append to notes
          for (const uid of cancelledUids) {
            const { data: item } = await supabase
              .from('schedule_items')
              .select('notes, guest_name')
              .eq('booking_uid', uid)
              .single()
            
            console.log(`Marking booking as cancelled: ${item?.guest_name} (UID: ${uid})`)
            
            await supabase
              .from('schedule_items')
              .update({
                status: 'cancelled',
                cancelled_at: new Date().toISOString(),
                notes: item?.notes ? `${item.notes} | Cancelled on ${new Date().toISOString().split('T')[0]}` : `Cancelled on ${new Date().toISOString().split('T')[0]}`,
                updated_at: new Date().toISOString()
              })
              .eq('booking_uid', uid)
          }
        }

        // Create new schedule items
        let insertedCount = 0
        let updatedCount = 0
        
        for (const booking of bookings) {
          // Check if booking already exists
          const { data: existing } = await supabase
            .from('schedule_items')
            .select('id, check_out')
            .eq('booking_uid', booking.uid)
            .single()

          if (existing) {
            // Update existing booking if checkout date changed
            const oldCheckout = new Date(existing.check_out)
            const newCheckout = booking.checkOut
            
            if (oldCheckout.getTime() !== newCheckout.getTime()) {
              const isExtension = newCheckout > oldCheckout
              
              // Get current extension count
              const { data: currentItem } = await supabase
                .from('schedule_items')
                .select('extension_count')
                .eq('id', existing.id)
                .single()
              
              const updateData: any = {
                guest_name: booking.guestName || null,
                check_in: booking.checkIn.toISOString(),
                check_out: booking.checkOut.toISOString(),
                checkout_time: getCheckoutTime(booking.checkOut),
                notes: booking.description || null,
                updated_at: new Date().toISOString()
              }
              
              if (isExtension) {
                updateData.is_extended = true
                updateData.extension_count = (currentItem?.extension_count || 0) + 1
                updateData.extension_notes = `Extended from ${oldCheckout.toISOString().split('T')[0]} to ${newCheckout.toISOString().split('T')[0]} on ${new Date().toISOString().split('T')[0]}`
              }
              
              const { error: updateError } = await supabase
                .from('schedule_items')
                .update(updateData)
                .eq('id', existing.id)
                .gte('check_out', today)

              if (!updateError) updatedCount++
            }
          } else {
            // Insert new booking
            const { error: insertError } = await supabase
              .from('schedule_items')
              .insert({
                listing_id: listing.id,
                cleaner_id: defaultCleanerId,
                booking_uid: booking.uid,
                guest_name: booking.guestName || null,
                check_in: booking.checkIn.toISOString(),
                check_out: booking.checkOut.toISOString(),
                checkout_time: getCheckoutTime(booking.checkOut),
                notes: booking.description || null,
                status: 'pending',
                original_check_in: booking.checkIn.toISOString(),
                original_check_out: booking.checkOut.toISOString(),
                source: 'airbnb'
              })

            if (!insertError) insertedCount++
          }
        }

        // Update last sync time
        await supabase
          .from('listings')
          .update({ last_sync: new Date().toISOString() })
          .eq('id', listing.id)

        results.push({
          listingId: listing.id,
          listingName: listing.name,
          status: 'success',
          itemsCreated: insertedCount,
          itemsUpdated: updatedCount,
          totalBookings: bookings.length
        })
      } catch (error) {
        console.error(`Error syncing listing ${listing.name}:`, error)
        results.push({
          listingId: listing.id,
          listingName: listing.name,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const successful = results.filter(r => r.status === 'success').length
    const failed = results.filter(r => r.status === 'error').length
    const skipped = results.filter(r => r.status === 'skipped').length

    console.log(`Cron sync completed: ${successful} successful, ${failed} failed, ${skipped} skipped`)

    return NextResponse.json({
      success: true,
      summary: {
        total: listings.length,
        successful,
        failed,
        skipped
      },
      results,
      syncedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error in cron sync-all:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync all calendars' },
      { status: 500 }
    )
  }
}

// GET endpoint for monitoring/health checks
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/cron/sync-all',
    method: 'POST',
    description: 'Cron job endpoint for syncing all calendars',
    authentication: 'Bearer token via CRON_SECRET env var',
    note: 'This endpoint is designed to be called by Vercel cron jobs only'
  })
}