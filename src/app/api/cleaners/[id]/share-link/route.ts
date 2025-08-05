import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { db } from '@/lib/db'
import crypto from 'crypto'

// Generate a unique share token for a cleaner
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: cleanerId } = await params

    // Verify the cleaner belongs to this user
    const cleaner = await db.getCleaner(cleanerId, user.id)
    if (!cleaner) {
      return NextResponse.json(
        { error: 'Cleaner not found' },
        { status: 404 }
      )
    }

    // Generate a unique token for this cleaner
    const shareToken = crypto.randomBytes(32).toString('hex')
    
    // Store the share token in the database
    // For now, we'll store it in the cleaner_sessions table with a special type
    await db.createCleanerShareToken(cleanerId, shareToken)

    // Return the share link
    const shareLink = `${process.env.NEXT_PUBLIC_BASE_URL || ''}/cleaner/schedule/${shareToken}`

    return NextResponse.json({
      shareLink,
      shareToken,
      cleanerId,
      cleanerName: cleaner.name
    })
  } catch (error) {
    console.error('Error generating share link:', error)
    return NextResponse.json(
      { error: 'Failed to generate share link' },
      { status: 500 }
    )
  }
}