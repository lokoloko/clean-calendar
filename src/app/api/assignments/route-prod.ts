import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get assignments with listing and cleaner details
    const { data, error } = await supabase
      .from('assignments')
      .select(`
        *,
        listing:listings!inner(*),
        cleaner:cleaners!inner(*)
      `)
      .eq('listing.user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching assignments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assignments' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { listing_id, cleaner_id } = body

    if (!listing_id || !cleaner_id) {
      return NextResponse.json(
        { error: 'Listing ID and Cleaner ID are required' },
        { status: 400 }
      )
    }

    // Verify the listing belongs to the user
    const { data: listing } = await supabase
      .from('listings')
      .select('id')
      .eq('id', listing_id)
      .eq('user_id', user.id)
      .single()

    if (!listing) {
      return NextResponse.json(
        { error: 'Listing not found or unauthorized' },
        { status: 404 }
      )
    }

    // Verify the cleaner belongs to the user
    const { data: cleaner } = await supabase
      .from('cleaners')
      .select('id')
      .eq('id', cleaner_id)
      .eq('user_id', user.id)
      .single()

    if (!cleaner) {
      return NextResponse.json(
        { error: 'Cleaner not found or unauthorized' },
        { status: 404 }
      )
    }

    const { data, error } = await supabase
      .from('assignments')
      .insert({
        listing_id,
        cleaner_id,
      })
      .select(`
        *,
        listing:listings(*),
        cleaner:cleaners(*)
      `)
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Assignment already exists' },
          { status: 409 }
        )
      }
      throw error
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating assignment:', error)
    return NextResponse.json(
      { error: 'Failed to create assignment' },
      { status: 500 }
    )
  }
}