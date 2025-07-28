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
      'SELECT * FROM public.cleaners WHERE id = $1 AND user_id = $2',
      [id, user.id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Cleaner not found' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching cleaner:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cleaner' },
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
    const { name, email, phone } = body

    const result = await db.query(
      `UPDATE public.cleaners 
       SET name = $1, email = $2, phone = $3, updated_at = NOW()
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [name, email, phone, id, user.id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Cleaner not found' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error updating cleaner:', error)
    return NextResponse.json(
      { error: 'Failed to update cleaner' },
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
      'DELETE FROM public.cleaners WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, user.id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Cleaner not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting cleaner:', error)
    return NextResponse.json(
      { error: 'Failed to delete cleaner' },
      { status: 500 }
    )
  }
}