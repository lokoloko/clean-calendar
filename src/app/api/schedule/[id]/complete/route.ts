import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase-server'

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    // First get user's listings
    const { data: userListings } = await supabase
      .from('listings')
      .select('id')
      .eq('user_id', user.id)
    
    const listingIds = userListings?.map(l => l.id) || []
    
    // Update the schedule item to mark it as completed
    const { error } = await supabase
      .from('schedule_items')
      .update({ 
        is_completed: true,
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .in('listing_id', listingIds)
    
    if (error) {
      console.error('Error marking cleaning as completed:', error)
      return NextResponse.json(
        { error: 'Failed to mark cleaning as completed' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in complete schedule item:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    // First get user's listings
    const { data: userListings } = await supabase
      .from('listings')
      .select('id')
      .eq('user_id', user.id)
    
    const listingIds = userListings?.map(l => l.id) || []
    
    // Mark as not completed (undo)
    const { error } = await supabase
      .from('schedule_items')
      .update({ 
        is_completed: false,
        status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .in('listing_id', listingIds)
    
    if (error) {
      console.error('Error unmarking cleaning as completed:', error)
      return NextResponse.json(
        { error: 'Failed to unmark cleaning as completed' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in uncomplete schedule item:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}