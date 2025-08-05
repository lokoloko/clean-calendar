import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const runtime = 'edge'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = await createClient()

    // Get cleaner info by share token using the SECURITY DEFINER function
    const { data: cleanerData, error: cleanerError } = await supabase
      .rpc('get_cleaner_by_token', { share_token: token })
      .single() as { data: { id: string; name: string; phone: string; email: string } | null; error: any }
    
    if (cleanerError || !cleanerData) {
      console.error('Error getting cleaner by token:', cleanerError)
      return NextResponse.json(
        { error: 'Invalid or expired share link' },
        { status: 404 }
      )
    }

    // Get the cleaner's schedule using the SECURITY DEFINER function
    const { data: schedule, error: scheduleError } = await supabase
      .rpc('get_cleaner_schedule_by_token', { share_token: token })

    if (scheduleError) {
      console.error('Error getting cleaner schedule:', scheduleError)
      throw scheduleError
    }

    // Format the schedule items
    const formattedSchedule = (schedule || []).map((item: any) => ({
      id: item.id,
      listing_id: item.listing_id,
      listing_name: item.listing_name,
      listing_address: '', // Address not available in database
      host_name: item.host_email, // Using host_email as host_name for display
      check_in: item.check_in,
      check_out: item.check_out,
      checkout_time: item.checkout_time,
      guest_name: item.guest_name,
      is_completed: item.is_completed || false,
      feedback_id: item.feedback_id,
      cleanliness_rating: item.cleanliness_rating,
      status: item.status,
      source: item.source,
      manual_rule_frequency: item.manual_rule_frequency
    }))

    return NextResponse.json({
      cleanerId: cleanerData.id,
      cleanerName: cleanerData.name,
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