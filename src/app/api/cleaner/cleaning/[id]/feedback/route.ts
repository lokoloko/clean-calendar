import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateCleanerSession, getCleanerToken } from '@/lib/cleaner-auth'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const token = getCleanerToken(request)
    const session = await validateCleanerSession(token)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { cleanlinessRating, notes } = await request.json()
    const cleaningId = params.id

    // Validate the cleanliness rating
    if (!cleanlinessRating || !['clean', 'normal', 'dirty'].includes(cleanlinessRating)) {
      return NextResponse.json(
        { error: 'Invalid cleanliness rating' },
        { status: 400 }
      )
    }

    // First, verify this cleaning belongs to this cleaner
    const schedule = await db.getCleanerSchedule(session.cleanerId)
    const cleaning = schedule.find(item => item.id === cleaningId)

    if (!cleaning) {
      return NextResponse.json(
        { error: 'Cleaning not found' },
        { status: 404 }
      )
    }

    // Create or update the feedback
    const feedback = await db.createCleanerFeedback({
      scheduleItemId: cleaningId,
      cleanerId: session.cleanerId,
      listingId: cleaning.listing_id,
      cleanlinessRating,
      notes,
      completedAt: new Date()
    })

    return NextResponse.json({
      success: true,
      feedback: {
        id: feedback.id,
        cleanlinessRating: feedback.cleanliness_rating,
        notes: feedback.notes,
        completedAt: feedback.completed_at
      }
    })
  } catch (error) {
    console.error('Error submitting feedback:', error)
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    )
  }
}