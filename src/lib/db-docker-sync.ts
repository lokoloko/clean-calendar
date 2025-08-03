import { Pool } from 'pg'
import { parseICSFromURL, getCheckoutTime } from './ics-parser'

// Docker mode database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@db:5432/cleansweep'
})

export async function syncAllListingsDocker(userId: string) {
  const client = await pool.connect()
  
  try {
    // Get all listings with ICS URLs for this user
    const listingsResult = await client.query(
      'SELECT * FROM listings WHERE user_id = $1 AND ics_url IS NOT NULL',
      [userId]
    )
    
    const listings = listingsResult.rows
    if (listings.length === 0) {
      return {
        success: true,
        summary: { total: 0, successful: 0, failed: 0, skipped: 0 },
        results: [],
        syncedAt: new Date().toISOString()
      }
    }

    const results = []

    for (const listing of listings) {
      try {
        // Get assigned cleaners for this listing
        const assignmentsResult = await client.query(
          'SELECT cleaner_id FROM assignments WHERE listing_id = $1',
          [listing.id]
        )

        const defaultCleanerId = assignmentsResult.rows[0]?.cleaner_id || null

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
        await client.query(
          `UPDATE schedule_items 
           SET status = 'completed', is_completed = true, updated_at = NOW()
           WHERE listing_id = $1 AND check_out < $2 AND status = 'pending'`,
          [listing.id, today]
        )

        // Get existing future bookings to check for cancellations
        const existingItemsResult = await client.query(
          `SELECT booking_uid FROM schedule_items 
           WHERE listing_id = $1 AND check_out > $2 
           AND status != 'cancelled' AND status != 'completed' 
           AND source = 'airbnb'`,
          [listing.id, today]
        )

        // Find bookings that are no longer in the ICS feed
        const existingUids = existingItemsResult.rows.map(item => item.booking_uid)
        const cancelledUids = existingUids.filter(uid => !currentBookingUids.includes(uid))

        // Mark cancelled bookings
        if (cancelledUids.length > 0) {
          console.log(`Found ${cancelledUids.length} cancelled bookings for ${listing.name}:`, cancelledUids)
          
          for (const uid of cancelledUids) {
            const itemResult = await client.query(
              'SELECT notes, guest_name FROM schedule_items WHERE booking_uid = $1',
              [uid]
            )
            const item = itemResult.rows[0]
            
            console.log(`Marking booking as cancelled: ${item?.guest_name} (UID: ${uid})`)
            
            const cancelledDate = new Date().toISOString().split('T')[0]
            const newNotes = item?.notes 
              ? `${item.notes} | Cancelled on ${cancelledDate}` 
              : `Cancelled on ${cancelledDate}`
            
            await client.query(
              `UPDATE schedule_items 
               SET status = 'cancelled', cancelled_at = NOW(), notes = $1, updated_at = NOW()
               WHERE booking_uid = $2`,
              [newNotes, uid]
            )
          }
        }

        // Create new schedule items
        let insertedCount = 0
        let updatedCount = 0
        
        for (const booking of bookings) {
          // Check if booking already exists
          const existingResult = await client.query(
            'SELECT id, check_out FROM schedule_items WHERE booking_uid = $1',
            [booking.uid]
          )
          const existing = existingResult.rows[0]

          if (existing) {
            // Update existing booking if checkout date changed
            const oldCheckout = new Date(existing.check_out)
            const newCheckout = booking.checkOut
            
            if (oldCheckout.getTime() !== newCheckout.getTime()) {
              const isExtension = newCheckout > oldCheckout
              
              // Get current extension count
              const currentItemResult = await client.query(
                'SELECT extension_count FROM schedule_items WHERE id = $1',
                [existing.id]
              )
              const currentItem = currentItemResult.rows[0]
              
              const extensionCount = (currentItem?.extension_count || 0) + 1
              const extensionNotes = isExtension
                ? `Extended from ${oldCheckout.toISOString().split('T')[0]} to ${newCheckout.toISOString().split('T')[0]} on ${new Date().toISOString().split('T')[0]}`
                : null
              
              await client.query(
                `UPDATE schedule_items 
                 SET guest_name = $1, check_in = $2, check_out = $3, 
                     checkout_time = $4, notes = $5, updated_at = NOW(),
                     is_extended = $6, extension_count = $7, extension_notes = $8
                 WHERE id = $9 AND check_out >= $10`,
                [
                  booking.guestName || null,
                  booking.checkIn.toISOString(),
                  booking.checkOut.toISOString(),
                  getCheckoutTime(booking.checkOut),
                  booking.description || null,
                  isExtension,
                  isExtension ? extensionCount : currentItem?.extension_count || 0,
                  extensionNotes,
                  existing.id,
                  today
                ]
              )
              
              updatedCount++
            }
          } else {
            // Insert new booking
            await client.query(
              `INSERT INTO schedule_items 
               (listing_id, cleaner_id, booking_uid, guest_name, check_in, check_out, 
                checkout_time, notes, status, original_check_in, original_check_out, source)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
              [
                listing.id,
                defaultCleanerId,
                booking.uid,
                booking.guestName || null,
                booking.checkIn.toISOString(),
                booking.checkOut.toISOString(),
                getCheckoutTime(booking.checkOut),
                booking.description || null,
                'pending',
                booking.checkIn.toISOString(),
                booking.checkOut.toISOString(),
                'airbnb'
              ]
            )
            
            insertedCount++
          }
        }

        // Update last sync time
        await client.query(
          'UPDATE listings SET last_sync = NOW() WHERE id = $1',
          [listing.id]
        )

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

    console.log(`Docker sync completed: ${successful} successful, ${failed} failed, ${skipped} skipped`)

    return {
      success: true,
      summary: {
        total: listings.length,
        successful,
        failed,
        skipped
      },
      results,
      syncedAt: new Date().toISOString()
    }
  } catch (error) {
    console.error('Error in Docker sync-all:', error)
    throw error
  } finally {
    client.release()
  }
}