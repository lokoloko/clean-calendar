import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { createClient } from '@/lib/supabase-server';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const supabase = await createClient();
    
    // Verify ownership
    const { data: schedule } = await supabase
      .from('manual_schedules')
      .select('*, listings!inner(user_id)')
      .eq('id', id)
      .single();
    
    if (!schedule || schedule.listings?.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    
    // Update schedule
    const { data, error } = await supabase
      .from('manual_schedules')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Manual schedule update error:', error);
    return NextResponse.json(
      { error: 'Failed to update schedule' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const supabase = await createClient();
    
    // Verify ownership
    const { data: schedule } = await supabase
      .from('manual_schedules')
      .select('*, listings!inner(user_id)')
      .eq('id', id)
      .single();
    
    if (!schedule || schedule.listings?.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    
    // Delete associated schedule items
    await supabase
      .from('schedule_items')
      .delete()
      .eq('manual_schedule_id', id);
    
    // Delete the schedule
    const { error } = await supabase
      .from('manual_schedules')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Manual schedule delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete schedule' },
      { status: 500 }
    );
  }
}