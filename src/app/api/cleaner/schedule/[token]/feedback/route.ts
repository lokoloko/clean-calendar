import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const runtime = 'edge';

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const { scheduleItemId, cleanlinessRating, notes } = await request.json();

    // Validate the cleanliness rating
    if (!cleanlinessRating || !['clean', 'normal', 'dirty'].includes(cleanlinessRating)) {
      return NextResponse.json(
        { error: 'Invalid cleanliness rating' },
        { status: 400 }
      );
    }

    if (!scheduleItemId) {
      return NextResponse.json(
        { error: 'Schedule item ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get cleaner info by share token to verify it's valid
    const { data: cleanerData, error: cleanerError } = await supabase
      .rpc('get_cleaner_by_token', { share_token: token })
      .single() as { data: { id: string; name: string } | null; error: any };
    
    if (cleanerError || !cleanerData) {
      return NextResponse.json(
        { error: 'Invalid or expired share link' },
        { status: 404 }
      );
    }

    // Get the schedule to verify the item belongs to this cleaner
    const { data: schedule, error: scheduleError } = await supabase
      .rpc('get_cleaner_schedule_by_token', { share_token: token });

    if (scheduleError) {
      console.error('Error getting cleaner schedule:', scheduleError);
      return NextResponse.json(
        { error: 'Failed to get schedule' },
        { status: 500 }
      );
    }

    const cleaning = schedule?.find((item: any) => item.id === scheduleItemId);

    if (!cleaning) {
      return NextResponse.json(
        { error: 'Cleaning not found or not assigned to this cleaner' },
        { status: 404 }
      );
    }

    // Create or update the feedback
    const { data: existingFeedback } = await supabase
      .from('cleaner_feedback')
      .select('id')
      .eq('schedule_item_id', scheduleItemId)
      .single();

    let feedback;
    if (existingFeedback) {
      // Update existing feedback
      const { data, error } = await supabase
        .from('cleaner_feedback')
        .update({
          cleanliness_rating: cleanlinessRating,
          notes,
          completed_at: new Date().toISOString()
        })
        .eq('id', existingFeedback.id)
        .select()
        .single();
      
      if (error) throw error;
      feedback = data;
    } else {
      // Create new feedback
      const { data, error } = await supabase
        .from('cleaner_feedback')
        .insert({
          schedule_item_id: scheduleItemId,
          cleaner_id: cleanerData.id,
          listing_id: cleaning.listing_id,
          cleanliness_rating: cleanlinessRating,
          notes,
          completed_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      feedback = data;
    }

    return NextResponse.json({
      success: true,
      feedback
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}