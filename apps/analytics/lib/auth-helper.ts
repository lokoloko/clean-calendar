import { cookies } from 'next/headers'
import { headers } from 'next/headers'

export interface AuthUser {
  id: string
  email: string
  name?: string
}

/**
 * Get the current authenticated user from the auth token
 * For use in server components and API routes
 */
export function getCurrentUser(): AuthUser | null {
  try {
    // Try to get from headers first (set by middleware for API routes)
    const userId = headers().get('x-user-id')
    const userEmail = headers().get('x-user-email')
    
    if (userId && userEmail) {
      return {
        id: userId,
        email: userEmail,
        name: 'Test User' // For now, hardcoded
      }
    }

    // Fallback to cookie
    const authToken = cookies().get('auth-token')?.value
    
    if (!authToken) {
      return null
    }

    const decoded = JSON.parse(Buffer.from(authToken, 'base64').toString())
    
    // Validate token age
    const tokenAge = Date.now() - decoded.timestamp
    const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 days
    
    if (tokenAge > maxAge) {
      return null
    }

    return {
      id: decoded.userId,
      email: decoded.email,
      name: decoded.name
    }
  } catch (err) {
    console.error('Error getting current user:', err)
    return null
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getCurrentUser() !== null
}