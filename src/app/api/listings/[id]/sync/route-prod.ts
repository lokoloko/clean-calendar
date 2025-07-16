import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { parseICSFromURL, getCheckoutTime } from '@/lib/ics-parser'
import { addDays } from 'date-fns'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the listing
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (listingError || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    // Parse the ICS file
    const bookings = await parseICSFromURL(listing.ics_url)

    // Get assigned cleaners for this listing
    const { data: assignments } = await supabase
      .from('assignments')
      .select('cleaner_id')
      .eq('listing_id', listing.id)

    const cleanerIds = assignments?.map(a => a.cleaner_id) || []
    
    // Default to first cleaner or null if none assigned
    const defaultCleanerId = cleanerIds[0] || null

    if (!defaultCleanerId) {
      return NextResponse.json(
        { error: 'No cleaner assigned to this listing' },
        { status: 400 }
      )
    }

    // Delete existing schedule items for this listing
    await supabase
      .from('schedule_items')
      .delete()
      .eq('listing_id', listing.id)

    // Create new schedule items
    const scheduleItems = bookings.map(booking => ({
      listing_id: listing.id,
      cleaner_id: defaultCleanerId,
      booking_uid: booking.uid,
      guest_name: booking.guestName || 'Guest',
      check_in: booking.checkIn.toISOString(),
      check_out: booking.checkOut.toISOString(),
      checkout_time: getCheckoutTime(booking.checkOut),
      notes: booking.description || null,
      status: 'pending' as const,
    }))

    const { data: insertedItems, error: insertError } = await supabase
      .from('schedule_items')
      .insert(scheduleItems)
      .select()

    if (insertError) throw insertError

    // Update last sync time
    await supabase
      .from('listings')
      .update({ last_sync: new Date().toISOString() })
      .eq('id', listing.id)

    return NextResponse.json({
      success: true,
      itemsCreated: insertedItems?.length || 0,
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