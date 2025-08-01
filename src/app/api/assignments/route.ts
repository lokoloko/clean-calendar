import { db } from '@/lib/db-edge'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'

export async function GET() {
  try {
    const user = await requireAuth()
    const assignments = await db.getAssignments(user.id)
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