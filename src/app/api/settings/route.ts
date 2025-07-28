import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'

export async function GET() {
  try {
    const user = await requireAuth()
    
    // Get user settings
    const result = await db.query(
      `SELECT * FROM public.user_settings WHERE user_id = $1`,
      [user.id]
    )
    
    // If no settings exist, create default settings
    if (result.rows.length === 0) {
      const createResult = await db.query(
        `INSERT INTO public.user_settings (user_id) 
         VALUES ($1) 
         RETURNING *`,
        [user.id]
      )
      return NextResponse.json(createResult.rows[0])
    }
    
    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const {
      auto_sync_enabled,
      auto_sync_time,
      sms_provider,
      send_weekly_schedule,
      send_daily_reminders,
      weekly_schedule_day,
      daily_reminder_time,
      require_confirmation
    } = body
    
    // Update settings
    const result = await db.query(
      `UPDATE public.user_settings 
       SET auto_sync_enabled = $1,
           auto_sync_time = $2,
           sms_provider = $3,
           send_weekly_schedule = $4,
           send_daily_reminders = $5,
           weekly_schedule_day = $6,
           daily_reminder_time = $7,
           require_confirmation = $8,
           updated_at = NOW()
       WHERE user_id = $9
       RETURNING *`,
      [
        auto_sync_enabled,
        auto_sync_time,
        sms_provider,
        send_weekly_schedule,
        send_daily_reminders,
        weekly_schedule_day,
        daily_reminder_time,
        require_confirmation,
        user.id
      ]
    )
    
    // If no rows updated, create new settings
    if (result.rows.length === 0) {
      const createResult = await db.query(
        `INSERT INTO public.user_settings 
         (user_id, auto_sync_enabled, auto_sync_time, sms_provider, 
          send_weekly_schedule, send_daily_reminders, weekly_schedule_day, 
          daily_reminder_time, require_confirmation)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          user.id,
          auto_sync_enabled,
          auto_sync_time,
          sms_provider,
          send_weekly_schedule,
          send_daily_reminders,
          weekly_schedule_day,
          daily_reminder_time,
          require_confirmation
        ]
      )
      return NextResponse.json(createResult.rows[0])
    }
    
    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}