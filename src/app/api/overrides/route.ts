import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getCurrentUser } from '@/lib/auth-server';

export const runtime = 'edge';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    
    // Get all overrides with listing details and affected cleanings count
    const { data: overrides, error } = await supabase
      .from('property_overrides')
      .select(`
        *,
        listings!inner(name, address)
      `)
      .eq('user_id', user.id)
      .order('start_date', { ascending: false });

    if (error) {
      console.error('Error fetching overrides:', error);
      throw error;
    }

    // For each override, count affected cleanings
    const overridesWithCounts = await Promise.all(
      (overrides || []).map(async (override) => {
        const { count } = await supabase
          .from('schedule_items')
          .select('*', { count: 'exact', head: true })
          .eq('listing_id', override.listing_id)
          .gte('check_out', override.start_date)
          .lte('check_out', override.end_date)
          .neq('status', 'cancelled')
          .eq('is_postponed', false);

        return {
          ...override,
          listing_name: override.listings?.name,
          listing_address: override.listings?.address,
          affected_cleanings_count: count || 0,
        };
      })
    );

    return NextResponse.json(overridesWithCounts);
  } catch (error) {
    console.error('Error in GET /api/overrides:', error);
    return NextResponse.json(
      { error: 'Failed to fetch overrides' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { listing_id, override_type, start_date, end_date, reason, affects_cleanings = true } = body;

    if (!listing_id || !override_type || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify the listing belongs to the user
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, name')
      .eq('id', listing_id)
      .eq('user_id', user.id)
      .single();

    if (listingError || !listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      );
    }

    // Create the override
    const { data: override, error: overrideError } = await supabase
      .from('property_overrides')
      .insert({
        listing_id,
        user_id: user.id,
        override_type,
        start_date,
        end_date,
        reason,
        affects_cleanings,
      })
      .select()
      .single();

    if (overrideError) {
      console.error('Error creating override:', overrideError);
      throw overrideError;
    }

    // Count affected cleanings
    const { count } = await supabase
      .from('schedule_items')
      .select('*', { count: 'exact', head: true })
      .eq('listing_id', listing_id)
      .gte('check_out', start_date)
      .lte('check_out', end_date)
      .neq('status', 'cancelled')
      .eq('is_postponed', false);

    return NextResponse.json({
      ...override,
      listing_name: listing.name,
      affected_cleanings_count: count || 0,
    });
  } catch (error) {
    console.error('Error in POST /api/overrides:', error);
    return NextResponse.json(
      { error: 'Failed to create override' },
      { status: 500 }
    );
  }
}