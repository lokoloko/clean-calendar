import { NextRequest, NextResponse } from 'next/server'
import { getSessionId, clearSessionCookie } from '@/lib/session-helper'
import { clearSession } from '@/lib/session-store'

export async function POST(request: NextRequest) {
  try {
    // Get the current session ID
    const sessionId = await getSessionId()
    
    // Clear the session data from memory
    clearSession(sessionId)
    
    // Clear the session cookie
    await clearSessionCookie()
    
    console.log(`Cleared session data for session: ${sessionId.substring(0, 8)}...`)
    
    return NextResponse.json({
      success: true,
      message: 'All data cleared successfully',
      cleared: {
        session: true,
        localStorage: false, // No longer using localStorage
        database: false, // No database yet
      }
    })
  } catch (error) {
    console.error('Error clearing data:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to clear data',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Use POST to clear all data',
    warning: 'This will remove all stored properties and data'
  })
}