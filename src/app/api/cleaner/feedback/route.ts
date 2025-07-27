import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get recent cleaner feedback with related data
    const result = await db.query(`
      SELECT 
        cf.*,
        l.name as listing_name,
        c.name as cleaner_name,
        s.check_out
      FROM public.cleaner_feedback cf
      JOIN public.schedule_items s ON cf.schedule_item_id = s.id
      JOIN public.listings l ON cf.listing_id = l.id
      JOIN public.cleaners c ON cf.cleaner_id = c.id
      WHERE l.user_id = $1
      ORDER BY cf.completed_at DESC
      LIMIT 10
    `, [userId]);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching cleaner feedback:', error);
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
  }
}