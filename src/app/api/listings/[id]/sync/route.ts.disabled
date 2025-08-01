import { db } from '@/lib/db-edge'
import { NextResponse } from 'next/server'
import { parseICSFromURL, getCheckoutTime } from '@/lib/ics-parser'
import { requireAuth } from '@/lib/auth-server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params;
    
    // Get the listing
    const listingResult = await db.query(
      'SELECT * FROM public.listings WHERE id = $1 AND user_id = $2',
      [id, user.id]
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
      // For auto-sync, return success but with a note about assigning cleaners
      return NextResponse.json({
        success: true,
        itemsCreated: 0,
        itemsUpdated: 0,
        lastSync: new Date().toISOString(),
        note: 'Calendar data fetched but no schedule items created. Please assign a cleaner first.'
      })
    }

    // Get all future bookings UIDs from the ICS feed
    const currentBookingUids = bookings.map(b => b.uid);
    
    // First, mark past bookings as completed if they haven't been marked yet
    await db.query(
      `UPDATE public.schedule_items 
       SET status = 'completed',
           is_completed = true,
           modification_history = modification_history || 
             jsonb_build_object(
               'type', 'completion',
               'timestamp', NOW(),
               'previous_status', status
             ),
           updated_at = NOW()
       WHERE listing_id = $1 
         AND check_out < CURRENT_DATE
         AND status = 'pending'`,
      [id]
    )

    // Mark future bookings that are no longer in the ICS feed as cancelled
    // This preserves the record of cancelled bookings for historical analysis
    // Only mark bookings as cancelled if they are in the future (not today or past)
    await db.query(
      `UPDATE public.schedule_items 
       SET status = 'cancelled', 
           cancelled_at = NOW(),
           notes = COALESCE(notes || ' | ', '') || 'Cancelled on ' || TO_CHAR(NOW(), 'YYYY-MM-DD'),
           modification_history = modification_history || 
             jsonb_build_object(
               'type', 'cancellation',
               'timestamp', NOW(),
               'previous_status', status
             ),
           updated_at = NOW()
       WHERE listing_id = $1 
         AND check_out > CURRENT_DATE  -- Changed from >= to > to preserve today's and past checkouts
         AND status != 'cancelled'
         AND status != 'completed'  -- Don't mark completed bookings as cancelled
         AND source = 'airbnb'  -- Only cancel Airbnb bookings, not manual ones
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
        (listing_id, cleaner_id, booking_uid, guest_name, check_in, check_out, 
         checkout_time, notes, status, original_check_in, original_check_out) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (booking_uid) 
        DO UPDATE SET 
          guest_name = EXCLUDED.guest_name,
          check_in = EXCLUDED.check_in,
          previous_check_out = CASE 
            WHEN public.schedule_items.check_out != EXCLUDED.check_out 
            THEN public.schedule_items.check_out
            ELSE public.schedule_items.previous_check_out
          END,
          check_out = EXCLUDED.check_out,
          checkout_time = EXCLUDED.checkout_time,
          notes = EXCLUDED.notes,
          is_extended = CASE 
            WHEN EXCLUDED.check_out > public.schedule_items.check_out 
            THEN true
            ELSE public.schedule_items.is_extended
          END,
          extension_count = CASE 
            WHEN EXCLUDED.check_out > public.schedule_items.check_out 
            THEN public.schedule_items.extension_count + 1
            ELSE public.schedule_items.extension_count
          END,
          extension_notes = CASE 
            WHEN EXCLUDED.check_out > public.schedule_items.check_out 
            THEN 'Extended from ' || TO_CHAR(public.schedule_items.check_out, 'YYYY-MM-DD') || 
                 ' to ' || TO_CHAR(EXCLUDED.check_out, 'YYYY-MM-DD') || 
                 ' on ' || TO_CHAR(NOW(), 'YYYY-MM-DD')
            ELSE public.schedule_items.extension_notes
          END,
          modification_history = CASE 
            WHEN public.schedule_items.check_out != EXCLUDED.check_out 
            THEN public.schedule_items.modification_history || 
                 jsonb_build_object(
                   'type', CASE 
                     WHEN EXCLUDED.check_out > public.schedule_items.check_out THEN 'extension'
                     WHEN EXCLUDED.check_out < public.schedule_items.check_out THEN 'shortened'
                     ELSE 'date_change'
                   END,
                   'timestamp', NOW(),
                   'old_check_out', public.schedule_items.check_out,
                   'new_check_out', EXCLUDED.check_out,
                   'old_check_in', public.schedule_items.check_in,
                   'new_check_in', EXCLUDED.check_in
                 )
            ELSE public.schedule_items.modification_history
          END,
          updated_at = NOW()
        WHERE public.schedule_items.check_out >= CURRENT_DATE`,
        [
          id,
          defaultCleanerId,
          booking.uid,
          booking.guestName || null,
          booking.checkIn.toISOString(),
          booking.checkOut.toISOString(),
          getCheckoutTime(booking.checkOut),
          booking.description || null,
          'pending',
          booking.checkIn.toISOString(), // original_check_in
          booking.checkOut.toISOString()  // original_check_out
        ]
      )
      if (result.rowCount && result.rowCount > 0) {
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