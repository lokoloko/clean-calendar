import { db } from '@/lib/db-edge'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'

export async function POST() {
  try {
    const user = await requireAuth()
    
    // Delete orphaned manual schedule items (where the rule no longer exists)
    const result = await db.query(`
      DELETE FROM public.schedule_items si
      WHERE si.source = 'manual_recurring' 
      AND (
        si.manual_rule_id IS NULL
        OR NOT EXISTS (
          SELECT 1 FROM public.manual_schedule_rules msr 
          WHERE msr.id = si.manual_rule_id
        )
      )
      AND si.listing_id IN (
        SELECT id FROM public.listings WHERE user_id = $1
      )
      RETURNING si.id
    `, [user.id])
    
    console.log(`Cleaned up ${result.rowCount} orphaned manual schedule items`)
    
    return NextResponse.json({ 
      success: true, 
      deleted: result.rowCount,
      message: `Cleaned up ${result.rowCount} orphaned manual schedule items`
    })
  } catch (error) {
    console.error('Error cleaning up manual schedules:', error)
    return NextResponse.json(
      { error: 'Failed to clean up manual schedules' },
      { status: 500 }
    )
  }
}