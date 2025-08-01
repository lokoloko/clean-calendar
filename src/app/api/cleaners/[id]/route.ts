import { db } from '@/lib/db-edge'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params;
    
    const cleaner = await db.getCleaner(id, user.id)

    if (!cleaner) {
      return NextResponse.json({ error: 'Cleaner not found' }, { status: 404 })
    }

    return NextResponse.json(cleaner)
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

    const cleaner = await db.updateCleaner(id, user.id, {
      name,
      email,
      phone
    })

    if (!cleaner) {
      return NextResponse.json({ error: 'Cleaner not found' }, { status: 404 })
    }

    return NextResponse.json(cleaner)
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
    
    await db.deleteCleaner(id, user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting cleaner:', error)
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Cleaner not found' }, { status: 404 })
    }
    return NextResponse.json(
      { error: 'Failed to delete cleaner' },
      { status: 500 }
    )
  }
}