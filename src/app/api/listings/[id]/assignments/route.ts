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
        a.cleaner_id,
        c.name as cleaner_name
      FROM public.assignments a
      JOIN public.cleaners c ON a.cleaner_id = c.id
      WHERE a.listing_id = $1 AND a.user_id = $2`,
      [id, user.id]
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
  }
}