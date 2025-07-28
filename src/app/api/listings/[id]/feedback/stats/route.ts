import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await context.params;
    
    const result = await db.query(
      `SELECT 
        COUNT(DISTINCT s.id) as total_cleanings,
        COUNT(DISTINCT cf.id) as with_feedback,
        COUNT(CASE WHEN cf.cleanliness_rating = 5 THEN 1 END) as clean_count,
        COUNT(CASE WHEN cf.cleanliness_rating = 3 THEN 1 END) as normal_count,
        COUNT(CASE WHEN cf.cleanliness_rating = 1 THEN 1 END) as dirty_count,
        AVG(cf.cleanliness_rating)::numeric(3,1) as average_rating
      FROM public.schedule s
      LEFT JOIN public.cleaner_feedback cf ON s.id = cf.schedule_id
      WHERE s.listing_id = $1 AND s.user_id = $2`,
      [id, user.id]
    );

    const stats = result.rows[0];
    
    // Convert string counts to numbers
    return NextResponse.json({
      total_cleanings: parseInt(stats.total_cleanings),
      with_feedback: parseInt(stats.with_feedback),
      clean_count: parseInt(stats.clean_count) || 0,
      normal_count: parseInt(stats.normal_count) || 0,
      dirty_count: parseInt(stats.dirty_count) || 0,
      average_rating: parseFloat(stats.average_rating) || 0
    });
  } catch (error) {
    console.error('Error fetching feedback stats:', error);
    return NextResponse.json({ error: 'Failed to fetch feedback stats' }, { status: 500 });
  }
}