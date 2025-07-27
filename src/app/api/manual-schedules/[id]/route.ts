import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      listing_id,
      cleaner_id,
      schedule_type,
      frequency,
      days_of_week,
      day_of_month,
      custom_interval_days,
      cleaning_time,
      start_date,
      end_date,
      notes,
      is_active
    } = body

    const result = await db.query(
      `UPDATE public.manual_schedule_rules 
       SET listing_id = $1, cleaner_id = $2, schedule_type = $3, 
           frequency = $4, days_of_week = $5, day_of_month = $6,
           custom_interval_days = $7, cleaning_time = $8, 
           start_date = $9, end_date = $10, notes = $11, 
           is_active = $12, updated_at = NOW()
       WHERE id = $13
       RETURNING *`,
      [
        listing_id,
        cleaner_id,
        schedule_type,
        frequency,
        days_of_week ? `{${days_of_week.join(',')}}` : null,
        day_of_month,
        custom_interval_days,
        cleaning_time,
        start_date,
        end_date,
        notes,
        is_active,
        id
      ]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error updating manual schedule:', error)
    return NextResponse.json(
      { error: 'Failed to update manual schedule' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // First, delete all associated schedule items
    const deleteItemsResult = await db.query(
      `DELETE FROM public.schedule_items 
       WHERE manual_rule_id = $1
       RETURNING id`,
      [id]
    )
    
    const deletedItemsCount = deleteItemsResult.rows.length
    
    // Then delete the manual schedule rule
    const result = await db.query(
      `DELETE FROM public.manual_schedule_rules 
       WHERE id = $1
       RETURNING id`,
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true,
      deletedItems: deletedItemsCount
    })
  } catch (error) {
    console.error('Error deleting manual schedule:', error)
    return NextResponse.json(
      { error: 'Failed to delete manual schedule' },
      { status: 500 }
    )
  }
}