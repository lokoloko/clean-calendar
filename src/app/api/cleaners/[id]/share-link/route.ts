import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { db } from '@/lib/db-edge'

export const runtime = 'edge'

// Generate a unique share token for a cleaner
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let user
    try {
      user = await requireAuth()
    } catch (error) {
      console.error('Auth error in share-link route:', error)
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: cleanerId } = await params
    console.log('Cleaner ID from params:', cleanerId)
    console.log('User ID:', user.id)

    // Verify the cleaner belongs to this user
    const cleaner = await db.getCleaner(cleanerId, user.id)
    console.log('Cleaner data:', cleaner)
    if (!cleaner) {
      return NextResponse.json(
        { error: 'Cleaner not found' },
        { status: 404 }
      )
    }

    // Generate a unique token for this cleaner
    // Use Web Crypto API for Edge runtime compatibility
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    const shareToken = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
    
    // Store the share token in the database
    // For now, we'll store it in the cleaner_sessions table with a special type
    console.log('Creating share token for cleaner:', cleanerId)
    const tokenData = await db.createCleanerShareToken(cleanerId, shareToken)
    console.log('Token data received:', tokenData)
    
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
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    console.error('Error type:', typeof error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    
    return NextResponse.json(
      { 
        error: 'Failed to generate share link',
        details: error instanceof Error ? error.message : JSON.stringify(error),
        type: typeof error
      },
      { status: 500 }
    )
  }
}