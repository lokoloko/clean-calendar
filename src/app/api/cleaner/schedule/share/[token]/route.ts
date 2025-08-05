import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params

    // Get cleaner info by share token
    const cleaner = await db.getCleanerByShareToken(token)
    
    if (!cleaner) {
      return NextResponse.json(
        { error: 'Invalid or expired share link' },
        { status: 404 }
      )
    }

    // Get the cleaner's schedule across all hosts
    const schedule = await db.getCleanerScheduleAllHosts(cleaner.id)

    // Format the schedule items
    const formattedSchedule = schedule.map((item: any) => ({
      id: item.id,
      listing_name: item.listing_name,
      listing_address: item.listing_address,
      host_name: item.host_name,
      check_in: item.check_in,
      check_out: item.check_out,
      checkout_time: item.checkout_time,
      guest_name: item.guest_name,
      is_completed: item.is_completed || false,
      feedback_id: item.feedback_id,
      cleanliness_rating: item.cleanliness_rating
    }))

    return NextResponse.json({
      cleanerId: cleaner.id,
      cleanerName: cleaner.name,
      schedule: formattedSchedule
    })
  } catch (error) {
    console.error('Error fetching cleaner schedule:', error)
    return NextResponse.json(
      { error: 'Failed to fetch schedule' },
      { status: 500 }
    )
  }
}