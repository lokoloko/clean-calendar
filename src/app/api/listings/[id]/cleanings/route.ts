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
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    
    const result = await db.query(
      `SELECT 
        s.id,
        s.check_out,
        s.checkout_time,
        c.name as cleaner_name,
        s.status,
        s.guest_name,
        cf.id as feedback_id,
        cf.cleanliness_rating,
        cf.notes as feedback_notes,
        cf.completed_at as feedback_completed_at
      FROM public.schedule s
      LEFT JOIN public.cleaners c ON s.cleaner_id = c.id
      LEFT JOIN public.cleaner_feedback cf ON s.id = cf.schedule_id
      WHERE s.listing_id = $1 AND s.user_id = $2
      ORDER BY s.check_out DESC
      LIMIT $3`,
      [id, user.id, limit]
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching cleanings:', error);
    return NextResponse.json({ error: 'Failed to fetch cleanings' }, { status: 500 });
  }
}