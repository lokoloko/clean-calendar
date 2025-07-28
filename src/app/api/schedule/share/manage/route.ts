import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'

// GET: List all share tokens for the user
export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    const shareTokens = await db.getShareTokens(user.id)
    
    // Add share URLs to each token
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3001}`
    const tokensWithUrls = shareTokens.map(token => ({
      ...token,
      shareUrl: `${baseUrl}/shared/${token.token}`,
      isExpired: new Date(token.expires_at) < new Date(),
      cleanerId: token.cleaner_id,
      listingIds: token.listing_ids,
      dateFrom: token.date_from,
      dateTo: token.date_to,
      expiresAt: token.expires_at,
      viewCount: token.view_count,
      lastViewedAt: token.last_viewed_at,
      isActive: token.is_active,
      createdAt: token.created_at
    }))
    
    return NextResponse.json(tokensWithUrls)
  } catch (error) {
    console.error('Error fetching share tokens:', error)
    return NextResponse.json(
      { error: 'Failed to fetch share tokens' },
      { status: 500 }
    )
  }
}

// DELETE: Delete a share token
export async function DELETE(request: Request) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const tokenId = searchParams.get('id')
    
    if (!tokenId) {
      return NextResponse.json(
        { error: 'Token ID is required' },
        { status: 400 }
      )
    }
    
    const deletedToken = await db.deleteShareToken(tokenId, user.id)
    
    if (!deletedToken) {
      return NextResponse.json(
        { error: 'Token not found or unauthorized' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ success: true, deletedToken })
  } catch (error) {
    console.error('Error deleting share token:', error)
    return NextResponse.json(
      { error: 'Failed to delete share token' },
      { status: 500 }
    )
  }
}