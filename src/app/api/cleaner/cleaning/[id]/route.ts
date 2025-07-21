import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateCleanerSession, getCleanerToken } from '@/lib/cleaner-auth'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const token = getCleanerToken(request)
    const session = await validateCleanerSession(token || null)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const cleaningId = id

    // Get the specific cleaning item for this cleaner
    const schedule = await db.getCleanerSchedule(session.cleanerId)
    const cleaning = schedule.find(item => item.id === cleaningId)

    if (!cleaning) {
      return NextResponse.json(
        { error: 'Cleaning not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: cleaning.id,
      checkIn: cleaning.check_in,
      checkOut: cleaning.check_out,
      checkoutTime: cleaning.checkout_time,
      guestName: cleaning.guest_name,
      notes: cleaning.notes,
      status: cleaning.status,
      source: cleaning.source,
      listingId: cleaning.listing_id,
      listingName: cleaning.listing_name,
      listingTimezone: cleaning.listing_timezone,
      isCompleted: cleaning.is_completed,
      feedback: cleaning.feedback_id ? {
        id: cleaning.feedback_id,
        cleanlinessRating: cleaning.cleanliness_rating,
        notes: cleaning.feedback_notes,
        completedAt: cleaning.completed_at
      } : null
    })
  } catch (error) {
    console.error('Error fetching cleaning details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cleaning details' },
      { status: 500 }
    )
  }
}