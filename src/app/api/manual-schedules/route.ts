import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// Mock user ID for development
const DEV_USER_ID = '00000000-0000-0000-0000-000000000001'

export async function GET() {
  try {
    const result = await db.query(`
      SELECT 
        msr.*,
        l.name as listing_name,
        c.name as cleaner_name
      FROM public.manual_schedule_rules msr
      JOIN public.listings l ON msr.listing_id = l.id
      JOIN public.cleaners c ON msr.cleaner_id = c.id
      WHERE l.user_id = $1
      ORDER BY msr.created_at DESC
    `, [DEV_USER_ID])
    
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching manual schedules:', error)
    return NextResponse.json(
      { error: 'Failed to fetch manual schedules' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
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
      notes
    } = body

    // Validate required fields
    if (!listing_id || !cleaner_id || !schedule_type || !start_date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create the manual schedule rule
    const result = await db.query(
      `INSERT INTO public.manual_schedule_rules 
      (listing_id, cleaner_id, schedule_type, frequency, days_of_week, 
       day_of_month, custom_interval_days, cleaning_time, start_date, 
       end_date, notes, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        listing_id,
        cleaner_id,
        schedule_type,
        frequency,
        days_of_week ? `{${days_of_week.join(',')}}` : null,
        day_of_month,
        custom_interval_days,
        cleaning_time || '11:00',
        start_date,
        end_date || null,
        notes || null,
        true
      ]
    )

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error creating manual schedule:', error)
    return NextResponse.json(
      { error: 'Failed to create manual schedule' },
      { status: 500 }
    )
  }
}