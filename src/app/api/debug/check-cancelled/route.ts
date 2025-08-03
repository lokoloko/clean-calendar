import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    
    // Look for L3 bookings
    const { data: l3Bookings, error: l3Error } = await supabase
      .from('schedule_items')
      .select(`
        id,
        guest_name,
        check_in,
        check_out,
        status,
        cancelled_at,
        notes,
        booking_uid,
        listings (name)
      `)
      .or('guest_name.ilike.%RV%,notes.ilike.%L3%,notes.ilike.%RV%')
      .order('check_out', { ascending: false })
      .limit(10)

    if (l3Error) throw l3Error

    // Also check by listing name
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select('id, name')
      .ilike('name', '%L3%')
      .eq('user_id', user.id)

    if (listingsError) throw listingsError

    let listingBookings = []
    if (listings && listings.length > 0) {
      const { data, error } = await supabase
        .from('schedule_items')
        .select(`
          id,
          guest_name,
          check_in,
          check_out,
          status,
          cancelled_at,
          notes,
          booking_uid
        `)
        .in('listing_id', listings.map(l => l.id))
        .order('check_out', { ascending: false })
        .limit(10)

      if (error) throw error
      listingBookings = data || []
    }

    return NextResponse.json({
      searchResults: {
        byGuestName: l3Bookings || [],
        byListingName: {
          listings: listings || [],
          bookings: listingBookings
        }
      },
      debug: {
        searchTerms: ['%RV%', '%L3%'],
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Error checking cancelled bookings:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check bookings' },
      { status: 500 }
    )
  }
}