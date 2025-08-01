import { db } from '@/lib/db-edge'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params;
    
    await db.deleteAssignment(id, user.id)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting assignment:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to delete assignment' },
      { status: 500 }
    )
  }
}