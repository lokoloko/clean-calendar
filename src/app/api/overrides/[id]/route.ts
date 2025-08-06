import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getCurrentUser } from '@/lib/auth-server';

export const runtime = 'edge';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = await createClient();

    // Verify the override belongs to the user
    const { data: override, error: fetchError } = await supabase
      .from('property_overrides')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !override) {
      return NextResponse.json(
        { error: 'Override not found' },
        { status: 404 }
      );
    }

    // Delete the override
    const { error: deleteError } = await supabase
      .from('property_overrides')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting override:', deleteError);
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/overrides/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to delete override' },
      { status: 500 }
    );
  }
}