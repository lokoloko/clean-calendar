import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/auth-server';

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    
    // Get query parameters
    const listingId = searchParams.get('listing_id');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const cleanerId = searchParams.get('cleaner_id');
    const rating = searchParams.get('rating');
    
    const supabase = await createClient();
    
    // Build query with filters
    let query = supabase
      .from('cleaner_feedback')
      .select(`
        *,
        listings!inner(name, user_id),
        cleaners!inner(name),
        schedule_items!inner(check_out)
      `)
      .eq('listings.user_id', user.id)
      .order('completed_at', { ascending: false });
    
    // Apply filters
    if (listingId && listingId !== 'all') {
      query = query.eq('listing_id', listingId);
    }
    
    if (dateFrom) {
      query = query.gte('completed_at', dateFrom);
    }
    
    if (dateTo) {
      // Add one day to include the entire end date
      const endDate = new Date(dateTo);
      endDate.setDate(endDate.getDate() + 1);
      query = query.lt('completed_at', endDate.toISOString().split('T')[0]);
    }
    
    if (cleanerId && cleanerId !== 'all') {
      query = query.eq('cleaner_id', cleanerId);
    }
    
    if (rating && rating !== 'all') {
      query = query.eq('cleanliness_rating', rating);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching feedback:', error);
      throw error;
    }
    
    // Transform the data to match expected format
    const transformedData = (data || []).map((item: any) => ({
      ...item,
      listing_name: item.listings?.name,
      cleaner_name: item.cleaners?.name,
      check_out: item.schedule_items?.check_out
    }));
    
    return NextResponse.json(transformedData);
  } catch (error: any) {
    console.error('Error in feedback API:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
  }
}