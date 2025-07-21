import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// Mock user ID for development
const DEV_USER_ID = '00000000-0000-0000-0000-000000000001'

export async function GET() {
  try {
    // Get cancellation stats
    const cancellationStats = await db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'cancelled') as total_cancellations,
        COUNT(*) FILTER (WHERE status = 'cancelled' AND cancelled_at >= CURRENT_DATE - INTERVAL '30 days') as recent_cancellations,
        COUNT(*) FILTER (WHERE is_extended = true) as total_extensions,
        COUNT(*) FILTER (WHERE is_extended = true AND updated_at >= CURRENT_DATE - INTERVAL '30 days') as recent_extensions,
        l.name as listing_name,
        l.id as listing_id
      FROM public.schedule_items s
      JOIN public.listings l ON s.listing_id = l.id
      WHERE l.user_id = $1
      GROUP BY l.id, l.name
      ORDER BY total_cancellations DESC
    `, [DEV_USER_ID])

    // Get cleaner-specific cancellation impact
    const cleanerImpact = await db.query(`
      SELECT 
        c.name as cleaner_name,
        c.id as cleaner_id,
        COUNT(*) FILTER (WHERE s.status = 'cancelled') as cancellations_affected,
        COUNT(*) FILTER (WHERE s.is_extended = true) as extensions_affected
      FROM public.schedule_items s
      JOIN public.cleaners c ON s.cleaner_id = c.id
      JOIN public.listings l ON s.listing_id = l.id
      WHERE l.user_id = $1 AND (s.status = 'cancelled' OR s.is_extended = true)
      GROUP BY c.id, c.name
      ORDER BY cancellations_affected DESC
    `, [DEV_USER_ID])

    return NextResponse.json({
      byListing: cancellationStats.rows,
      byCleaner: cleanerImpact.rows
    })
  } catch (error) {
    console.error('Error fetching cancellation stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cancellation statistics' },
      { status: 500 }
    )
  }
}