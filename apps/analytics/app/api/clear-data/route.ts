import { NextRequest, NextResponse } from 'next/server'
import { getSessionId, clearSessionCookie } from '@/lib/session-helper'
import { clearSession } from '@/lib/session-store'
import { getCurrentUser } from '@/lib/auth-helper'
import { query } from '@/lib/db/client'

export async function POST(request: NextRequest) {
  try {
    // Get the current session ID
    const sessionId = await getSessionId()
    
    // Clear the session data from memory
    clearSession(sessionId)
    
    // Clear the session cookie
    await clearSessionCookie()
    
    // Clear database data for authenticated user
    const user = await getCurrentUser()
    let databaseCleared = false
    
    if (user) {
      try {
        console.log(`Clearing database data for user: ${user.email}`)
        
        // Delete all data for this user from analytics tables
        await query(
          `DELETE FROM analytics.data_sources WHERE property_id IN (
            SELECT id FROM analytics.properties WHERE user_id = $1
          )`,
          [user.id]
        )
        
        await query(
          `DELETE FROM analytics.property_metrics WHERE property_id IN (
            SELECT id FROM analytics.properties WHERE user_id = $1
          )`,
          [user.id]
        )
        
        await query(
          `DELETE FROM analytics.properties WHERE user_id = $1`,
          [user.id]
        )
        
        console.log(`Database data cleared for user: ${user.email}`)
        databaseCleared = true
      } catch (dbError) {
        console.error('Error clearing database:', dbError)
        // Continue even if database clear fails
      }
    }
    
    console.log(`Cleared session data for session: ${sessionId.substring(0, 8)}...`)
    
    return NextResponse.json({
      success: true,
      message: 'All data cleared successfully',
      cleared: {
        session: true,
        localStorage: false, // No longer using localStorage
        database: databaseCleared,
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