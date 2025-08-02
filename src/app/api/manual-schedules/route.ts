import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { createClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const user = await requireAuth();
    const supabase = await createClient();
    
    // Get manual schedules with related data
    const { data, error } = await supabase
      .from('manual_schedule_rules')
      .select(`
        *,
        listings!inner(name, user_id),
        cleaners!inner(name)
      `)
      .eq('listings.user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching manual schedules:', error);
      throw error;
    }
    
    // Transform data to match expected format
    const transformedData = (data || []).map(item => ({
      ...item,
      listing_name: item.listings?.name,
      cleaner_name: item.cleaners?.name
    }));
    
    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Manual schedules API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch manual schedules' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const supabase = await createClient();
    
    // Verify the listing belongs to the user
    const { data: listing } = await supabase
      .from('listings')
      .select('user_id')
      .eq('id', body.listing_id)
      .single();
    
    if (!listing || listing.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // Create manual schedule
    const { data, error } = await supabase
      .from('manual_schedule_rules')
      .insert({
        listing_id: body.listing_id,
        cleaner_id: body.cleaner_id,
        schedule_type: body.schedule_type || 'recurring',
        frequency: body.frequency,
        days_of_week: body.days_of_week || (body.day_of_week ? [body.day_of_week] : null),
        day_of_month: body.day_of_month || null,
        cleaning_time: body.time || '11:00',
        start_date: body.start_date || new Date().toISOString().split('T')[0],
        end_date: body.end_date || null,
        notes: body.notes || null
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating manual schedule:', error);
      throw error;
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Manual schedule creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create manual schedule' },
      { status: 500 }
    );
  }
}