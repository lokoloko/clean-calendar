import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateCleanerSession, getCleanerToken } from '@/lib/cleaner-auth'
import { format } from 'date-fns'

export async function GET(request: Request) {
  try {
    const token = getCleanerToken(request)
    const session = await validateCleanerSession(token)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    // Default to today if no date range specified
    const today = format(new Date(), 'yyyy-MM-dd')
    const fromDate = dateFrom || today
    const toDate = dateTo || (dateFrom ? undefined : today)

    const schedule = await db.getCleanerSchedule(session.cleanerId, fromDate, toDate)

    return NextResponse.json({
      cleaner: {
        id: session.cleanerId,
        name: session.cleanerName,
        phone: session.cleanerPhone
      },
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
    console.error('Error fetching cleaner schedule:', error)
    return NextResponse.json(
      { error: 'Failed to fetch schedule' },
      { status: 500 }
    )
  }
}