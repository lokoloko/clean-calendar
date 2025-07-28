import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'

export async function GET() {
  try {
    const user = await requireAuth()
    const listings = await db.getListings(user.id)
    return NextResponse.json(listings)
  } catch (error) {
    console.error('Error fetching listings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch listings' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { name, ics_url, cleaning_fee, timezone, is_active_on_airbnb } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // Only require ICS URL if listing is active on Airbnb
    if (is_active_on_airbnb && !ics_url) {
      return NextResponse.json(
        { error: 'Calendar URL is required for Airbnb listings' },
        { status: 400 }
      )
    }

    const listing = await db.createListing(user.id, {
      name,
      ics_url: is_active_on_airbnb ? ics_url : null,
      cleaning_fee: parseFloat(cleaning_fee) || 0,
      timezone: timezone || 'America/New_York',
      is_active_on_airbnb: is_active_on_airbnb !== false
    })

    return NextResponse.json(listing)
  } catch (error) {
    console.error('Error creating listing:', error)
    return NextResponse.json(
      { error: 'Failed to create listing' },
      { status: 500 }
    )
  }
}