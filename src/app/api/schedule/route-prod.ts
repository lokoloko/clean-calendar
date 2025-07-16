import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const cleanerId = searchParams.get('cleanerId')
    const listingId = searchParams.get('listingId')

    let query = supabase
      .from('schedule_items')
      .select(`
        *,
        listing:listings!inner(*),
        cleaner:cleaners!inner(*)
      `)
      .eq('listing.user_id', user.id)
      .order('check_out', { ascending: true })

    // Apply filters
    if (startDate) {
      query = query.gte('check_out', startDate)
    }
    if (endDate) {
      query = query.lte('check_out', endDate)
    }
    if (cleanerId) {
      query = query.eq('cleaner_id', cleanerId)
    }
    if (listingId) {
      query = query.eq('listing_id', listingId)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching schedule:', error)
    return NextResponse.json(
      { error: 'Failed to fetch schedule' },
      { status: 500 }
    )
  }
}