import { NextRequest, NextResponse } from 'next/server'
import { getSessionId } from '@/lib/session-helper'
import { getSession, updateSessionMetadata } from '@/lib/session-store'

export async function GET(request: NextRequest) {
  try {
    const sessionId = await getSessionId()
    const session = getSession(sessionId)
    
    return NextResponse.json({
      metadata: session.metadata || {}
    })
  } catch (error) {
    console.error('Error getting session metadata:', error)
    return NextResponse.json(
      { error: 'Failed to get session metadata' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionId = await getSessionId()
    const metadata = await request.json()
    
    updateSessionMetadata(sessionId, metadata)
    
    return NextResponse.json({
      success: true,
      message: 'Metadata updated'
    })
  } catch (error) {
    console.error('Error updating session metadata:', error)
    return NextResponse.json(
      { error: 'Failed to update session metadata' },
      { status: 500 }
    )
  }
}