import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params;
    const body = await request.json()
    const { status, cleaner_id } = body

    // Build update fields dynamically
    const updateFields: string[] = []
    const updateValues: any[] = []
    let paramCount = 1

    // Validate and add status update
    if (status !== undefined) {
      const validStatuses = ['pending', 'confirmed', 'declined', 'completed', 'cancelled']
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status value' },
          { status: 400 }
        )
      }
      updateFields.push(`status = $${paramCount}`)
      updateValues.push(status)
      paramCount++
    }

    // Validate and add cleaner_id update
    if (cleaner_id !== undefined) {
      // Verify the cleaner exists and belongs to the user
      const cleanerResult = await db.query(
        `SELECT id FROM public.cleaners WHERE id = $1 AND user_id = $2`,
        [cleaner_id, user.id]
      )
      
      if (cleanerResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Cleaner not found or not authorized' },
          { status: 400 }
        )
      }
      
      updateFields.push(`cleaner_id = $${paramCount}`)
      updateValues.push(cleaner_id)
      paramCount++
    }

    // Ensure at least one field is being updated
    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Verify the schedule item belongs to the user and check constraints
    const verifyResult = await db.query(
      `SELECT s.id, s.status, s.check_in
       FROM public.schedule_items s
       JOIN public.listings l ON s.listing_id = l.id
       WHERE s.id = $1 AND l.user_id = $2`,
      [id, user.id]
    )

    if (verifyResult.rows.length === 0) {
      return NextResponse.json({ error: 'Schedule item not found' }, { status: 404 })
    }

    const scheduleItem = verifyResult.rows[0]
    
    // Prevent updates to completed or cancelled items when changing cleaner
    if (cleaner_id !== undefined && ['completed', 'cancelled'].includes(scheduleItem.status)) {
      return NextResponse.json(
        { error: 'Cannot reassign cleaner for completed or cancelled cleanings' },
        { status: 400 }
      )
    }

    // Prevent updates to past cleanings when changing cleaner
    if (cleaner_id !== undefined && new Date(scheduleItem.check_in) < new Date()) {
      return NextResponse.json(
        { error: 'Cannot reassign cleaner for past cleanings' },
        { status: 400 }
      )
    }

    // Add updated_at to the update
    updateFields.push(`updated_at = NOW()`)

    // Update the schedule item
    updateValues.push(id)
    const result = await db.query(
      `UPDATE public.schedule_items 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, listing_id, cleaner_id, check_in, check_out, checkout_time, status, 
                 is_same_day_checkout, notes, source, created_at, updated_at`,
      updateValues
    )

    // Fetch the updated item with cleaner details
    const detailedResult = await db.query(
      `SELECT s.*, c.name as cleaner_name, l.name as listing_name
       FROM public.schedule_items s
       LEFT JOIN public.cleaners c ON s.cleaner_id = c.id
       LEFT JOIN public.listings l ON s.listing_id = l.id
       WHERE s.id = $1`,
      [id]
    )

    return NextResponse.json(detailedResult.rows[0])
  } catch (error) {
    console.error('Error updating schedule item:', error)
    return NextResponse.json(
      { error: 'Failed to update schedule item' },
      { status: 500 }
    )
  }
}