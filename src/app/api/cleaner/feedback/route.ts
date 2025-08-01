import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/auth-server';

export async function GET() {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

    // Get recent cleaner feedback with related data
    const { data, error } = await supabase
      .from('cleaner_feedback')
      .select(`
        *,
        listings!inner(name, user_id),
        cleaners!inner(name),
        schedule_items!inner(check_out)
      `)
      .eq('listings.user_id', user.id)
      .order('completed_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching cleaner feedback:', error);
      throw error;
    }

    // Transform data to match expected format
    const transformedData = (data || []).map(item => ({
      ...item,
      listing_name: item.listings?.name,
      cleaner_name: item.cleaners?.name,
      check_out: item.schedule_items?.check_out
    }));

    return NextResponse.json(transformedData);
  } catch (error: any) {
    console.error('Error fetching cleaner feedback:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
  }
}