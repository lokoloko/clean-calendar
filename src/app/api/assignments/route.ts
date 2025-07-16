import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// Mock user ID for development
const DEV_USER_ID = '00000000-0000-0000-0000-000000000001'

export async function GET() {
  try {
    const assignments = await db.getAssignments(DEV_USER_ID)
    return NextResponse.json(assignments)
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
    const body = await request.json()
    const { listing_id, cleaner_id } = body

    if (!listing_id || !cleaner_id) {
      return NextResponse.json(
        { error: 'Listing ID and Cleaner ID are required' },
        { status: 400 }
      )
    }

    const result = await db.query(
      'INSERT INTO public.assignments (listing_id, cleaner_id) VALUES ($1, $2) RETURNING *',
      [listing_id, cleaner_id]
    )

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error creating assignment:', error)
    return NextResponse.json(
      { error: 'Failed to create assignment' },
      { status: 500 }
    )
  }
}