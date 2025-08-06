import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getCurrentUser } from '@/lib/auth-server';
import { addDays } from 'date-fns';

export const runtime = 'edge';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { days_to_postpone = 1 } = await request.json();
    const supabase = await createClient();

    // Get the override details
    const { data: override, error: overrideError } = await supabase
      .from('property_overrides')
      .select('*, listings!inner(name)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (overrideError || !override) {
      return NextResponse.json(
        { error: 'Override not found' },
        { status: 404 }
      );
    }

    // Get all affected cleanings
    const { data: affectedCleanings, error: cleaningsError } = await supabase
      .from('schedule_items')
      .select('*')
      .eq('listing_id', override.listing_id)
      .gte('check_out', override.start_date)
      .lte('check_out', override.end_date)
      .neq('status', 'cancelled')
      .eq('is_postponed', false);

    if (cleaningsError) {
      console.error('Error fetching affected cleanings:', cleaningsError);
      throw cleaningsError;
    }

    if (!affectedCleanings || affectedCleanings.length === 0) {
      return NextResponse.json({
        count: 0,
        message: 'No cleanings to postpone',
      });
    }

    // Postpone each cleaning
    let postponedCount = 0;
    for (const cleaning of affectedCleanings) {
      const newCheckoutDate = addDays(new Date(cleaning.check_out), days_to_postpone);
      const newCheckinDate = addDays(new Date(cleaning.check_in), days_to_postpone);

      // Create postponement record
      const { error: postponeRecordError } = await supabase
        .from('postponed_cleanings')
        .insert({
          schedule_item_id: cleaning.id,
          original_date: cleaning.check_out,
          postponed_to_date: newCheckoutDate.toISOString().split('T')[0],
          postpone_reason: `Property ${override.override_type}: ${override.reason || 'No reason provided'}`,
          postponed_by: user.id,
        });

      if (postponeRecordError) {
        console.error('Error creating postponement record:', postponeRecordError);
        continue;
      }

      // Update the schedule item
      const { error: updateError } = await supabase
        .from('schedule_items')
        .update({
          check_out: newCheckoutDate.toISOString().split('T')[0],
          check_in: newCheckinDate.toISOString().split('T')[0],
          is_postponed: true,
          override_id: override.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', cleaning.id);

      if (updateError) {
        console.error('Error updating schedule item:', updateError);
        continue;
      }

      postponedCount++;
    }

    return NextResponse.json({
      count: postponedCount,
      total: affectedCleanings.length,
      message: `Successfully postponed ${postponedCount} cleaning(s) by ${days_to_postpone} day(s)`,
    });
  } catch (error) {
    console.error('Error in POST /api/overrides/[id]/postpone:', error);
    return NextResponse.json(
      { error: 'Failed to postpone cleanings' },
      { status: 500 }
    );
  }
}