import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { parseICSFromURL, getCheckoutTime } from '@/lib/ics-parser'

// Mock user ID for development
const DEV_USER_ID = '00000000-0000-0000-0000-000000000001'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get the listing
    const listingResult = await db.query(
      'SELECT * FROM public.listings WHERE id = $1 AND user_id = $2',
      [id, DEV_USER_ID]
    )

    if (listingResult.rows.length === 0) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    const listing = listingResult.rows[0]

    // Parse the ICS file
    const bookings = await parseICSFromURL(listing.ics_url)

    // Get assigned cleaners for this listing
    const assignmentsResult = await db.query(
      'SELECT cleaner_id FROM public.assignments WHERE listing_id = $1',
      [id]
    )

    const cleanerIds = assignmentsResult.rows.map(row => row.cleaner_id)
    
    // Default to first cleaner or null if none assigned
    const defaultCleanerId = cleanerIds[0] || null

    if (!defaultCleanerId) {
      return NextResponse.json(
        { error: 'No cleaner assigned to this listing' },
        { status: 400 }
      )
    }

    // Get all future bookings UIDs from the ICS feed
    const currentBookingUids = bookings.map(b => b.uid);
    
    // Mark future bookings that are no longer in the ICS feed as cancelled
    // This preserves the record of cancelled bookings for historical analysis
    await db.query(
      `UPDATE public.schedule_items 
       SET status = 'cancelled', 
           notes = COALESCE(notes || ' | ', '') || 'Cancelled on ' || TO_CHAR(NOW(), 'YYYY-MM-DD'),
           updated_at = NOW()
       WHERE listing_id = $1 
         AND check_out > NOW() 
         AND status != 'cancelled'
         AND booking_uid NOT IN (${currentBookingUids.map((_, i) => `$${i + 2}`).join(', ') || 'NULL'})`,
      [id, ...currentBookingUids]
    )

    // Create new schedule items
    let insertedCount = 0
    let updatedCount = 0
    for (const booking of bookings) {
      // Use ON CONFLICT to update existing bookings if they've changed
      const result = await db.query(
        `INSERT INTO public.schedule_items 
        (listing_id, cleaner_id, booking_uid, guest_name, check_in, check_out, checkout_time, notes, status) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (booking_uid) 
        DO UPDATE SET 
          guest_name = EXCLUDED.guest_name,
          check_in = EXCLUDED.check_in,
          check_out = EXCLUDED.check_out,
          checkout_time = EXCLUDED.checkout_time,
          notes = EXCLUDED.notes
        WHERE public.schedule_items.check_out > NOW()`,
        [
          id,
          defaultCleanerId,
          booking.uid,
          booking.guestName || 'Guest',
          booking.checkIn.toISOString(),
          booking.checkOut.toISOString(),
          getCheckoutTime(booking.checkOut),
          booking.description || null,
          'pending'
        ]
      )
      if (result.rowCount > 0) {
        if (result.command === 'INSERT') insertedCount++
        else updatedCount++
      }
    }

    // Update last sync time
    await db.query(
      'UPDATE public.listings SET last_sync = NOW() WHERE id = $1',
      [id]
    )

    return NextResponse.json({
      success: true,
      itemsCreated: insertedCount,
      itemsUpdated: updatedCount,
      lastSync: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error syncing calendar:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync calendar' },
      { status: 500 }
    )
  }
}