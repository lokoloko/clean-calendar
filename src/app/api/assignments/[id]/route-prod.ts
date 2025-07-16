import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // First check if the assignment exists and belongs to the user
    const { data: assignment } = await supabase
      .from('assignments')
      .select(`
        id,
        listing:listings!inner(user_id)
      `)
      .eq('id', params.id)
      .eq('listing.user_id', user.id)
      .single()

    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found or unauthorized' },
        { status: 404 }
      )
    }

    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', params.id)

    if (error) throw error

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error deleting assignment:', error)
    return NextResponse.json(
      { error: 'Failed to delete assignment' },
      { status: 500 }
    )
  }
}