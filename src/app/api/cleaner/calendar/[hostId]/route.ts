import { NextResponse } from 'next/server'
import { db } from '@/lib/db-edge'
import { validateCleanerSession, getCleanerToken } from '@/lib/cleaner-auth'

interface Props {
  params: Promise<{
    hostId: string;
  }>;
}

export async function GET(request: Request, { params }: Props) {
  try {
    const { hostId } = await params;
    const token = getCleanerToken(request)
    const session = await validateCleanerSession(token || null)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const listingId = searchParams.get('listingId')

    // Get all cleaners for this phone number
    const cleaners = await db.getCleanersByPhone(session.cleanerPhone)
    
    // Find the cleaner record for the specified host
    const cleaner = cleaners.find(c => c.user_id === hostId)
    
    if (!cleaner) {
      return NextResponse.json(
        { error: 'Host not found' },
        { status: 404 }
      )
    }

    // Get host info
    const user = await db.getUser(hostId)
    
    // Get properties for this host
    const listings = await db.getListings(hostId)
    
    // Get schedule for this specific cleaner
    // Default to showing next 3 months
    const fromDate = new Date()
    const toDate = new Date()
    toDate.setMonth(toDate.getMonth() + 3)
    
    let schedule = await db.getCleanerSchedule(cleaner.id, fromDate, toDate)
    
    // Filter by listing if specified
    if (listingId && listingId !== 'all') {
      schedule = schedule.filter(item => item.listing_id === listingId)
    }

    return NextResponse.json({
      hostInfo: {
        hostName: user?.name || user?.email || 'Unknown Host',
        companyName: user?.company_name,
        cleanerId: cleaner.id
      },
      properties: listings.map(listing => ({
        id: listing.id,
        name: listing.name
      })),
      schedule: schedule.map(item => ({
        id: item.id,
        checkIn: item.check_in,
        checkOut: item.check_out,
        checkoutTime: item.checkout_time,
        guestName: item.guest_name,
        notes: item.notes,
        status: item.status,
        source: item.source,
        listingId: item.listing_id,
        listingName: item.listing_name,
        listingTimezone: item.listing_timezone,
        isCompleted: item.is_completed,
        feedback: item.feedback_id ? {
          id: item.feedback_id,
          cleanlinessRating: item.cleanliness_rating,
          notes: item.feedback_notes,
          completedAt: item.completed_at
        } : null
      }))
    })
  } catch (error) {
    console.error('Error fetching cleaner calendar:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calendar' },
      { status: 500 }
    )
  }
}