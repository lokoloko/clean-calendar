import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// Mock user ID for development
const DEV_USER_ID = '00000000-0000-0000-0000-000000000001'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json()
    const { status } = body

    // Validate status
    const validStatuses = ['pending', 'confirmed', 'declined', 'completed', 'cancelled']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      )
    }

    // Update the schedule item status
    // First verify the item belongs to the user
    const verifyResult = await db.query(
      `SELECT s.id 
       FROM public.schedule_items s
       JOIN public.listings l ON s.listing_id = l.id
       WHERE s.id = $1 AND l.user_id = $2`,
      [id, DEV_USER_ID]
    )

    if (verifyResult.rows.length === 0) {
      return NextResponse.json({ error: 'Schedule item not found' }, { status: 404 })
    }

    // Update the status
    const result = await db.query(
      `UPDATE public.schedule_items 
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, id]
    )

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error updating schedule item:', error)
    return NextResponse.json(
      { error: 'Failed to update schedule item' },
      { status: 500 }
    )
  }
}