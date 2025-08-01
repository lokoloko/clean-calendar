import { db } from '@/lib/db-edge'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      listing_id,
      cleaner_id,
      date,
      time,
      notes
    } = body

    // Validate required fields
    if (!listing_id || !cleaner_id || !date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create a one-time manual cleaning
    const result = await db.query(
      `INSERT INTO public.schedule_items 
       (listing_id, cleaner_id, check_in, check_out, checkout_time, 
        notes, status, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        listing_id,
        cleaner_id,
        date, // For manual cleanings, check_in = check_out
        date,
        time || '11:00',
        notes || 'Manual cleaning',
        'pending',
        'manual'
      ]
    )

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error creating one-time manual cleaning:', error)
    return NextResponse.json(
      { error: 'Failed to create manual cleaning' },
      { status: 500 }
    )
  }
}