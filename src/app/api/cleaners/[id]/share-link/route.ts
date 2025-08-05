import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { db } from '@/lib/db-edge'
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
    const tokenData = await db.createCleanerShareToken(cleanerId, shareToken)
    
    // Use the token from the database (might be existing or new)
    const actualToken = tokenData.token || shareToken

    // Return the share link
    // Get the base URL from the request headers if env var not set
    const host = request.headers.get('host')
    const protocol = request.headers.get('x-forwarded-proto') || 'https'
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`
    const shareLink = `${baseUrl}/cleaner/schedule/${actualToken}`

    return NextResponse.json({
      shareLink,
      shareToken: actualToken,
      cleanerId,
      cleanerName: cleaner.name
    })
  } catch (error) {
    console.error('Error generating share link:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate share link',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}