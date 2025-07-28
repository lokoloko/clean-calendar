import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params;
    const result = await db.query(
      'SELECT * FROM public.listings WHERE id = $1 AND user_id = $2',
      [id, user.id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching listing:', error)
    return NextResponse.json(
      { error: 'Failed to fetch listing' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params;
    const body = await request.json()
    const { name, ics_url, cleaning_fee, timezone, is_active_on_airbnb } = body

    const result = await db.query(
      `UPDATE public.listings 
       SET name = $1, ics_url = $2, cleaning_fee = $3, timezone = $4, is_active_on_airbnb = $5, updated_at = NOW()
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [name, ics_url || null, cleaning_fee, timezone || 'America/New_York', is_active_on_airbnb !== false, id, user.id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error updating listing:', error)
    return NextResponse.json(
      { error: 'Failed to update listing' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params;
    const result = await db.query(
      'DELETE FROM public.listings WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, user.id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting listing:', error)
    return NextResponse.json(
      { error: 'Failed to delete listing' },
      { status: 500 }
    )
  }
}