/**
 * Session Helper
 * Manages session IDs using cookies
 */

import { cookies } from 'next/headers'
import crypto from 'crypto'

const SESSION_COOKIE_NAME = 'analytics_session_id'
const SESSION_DURATION = 7 * 24 * 60 * 60 // 7 days in seconds

/**
 * Get or create a session ID from cookies
 */
export async function getSessionId(): Promise<string> {
  const cookieStore = await cookies()
  let sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value
  
  if (!sessionId) {
    // Generate a new session ID
    sessionId = crypto.randomBytes(32).toString('hex')
    
    // Set the cookie
    cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION,
      path: '/'
    })
    
    console.log(`Created new session ID: ${sessionId.substring(0, 8)}...`)
  }
  // Don't refresh the cookie on every request - this was causing issues
  
  return sessionId
}

/**
 * Clear the session cookie
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
  console.log('Cleared session cookie')
}

/**
 * Check if a session exists
 */
export async function hasSession(): Promise<boolean> {
  const cookieStore = await cookies()
  return !!cookieStore.get(SESSION_COOKIE_NAME)?.value
}