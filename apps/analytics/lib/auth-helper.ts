import { cookies, headers } from 'next/headers'

export interface AuthUser {
  id: string
  email: string
  name?: string
}

/**
 * Get the current authenticated user from the auth token
 * For use in server components and API routes
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    // Try to get from headers first (set by middleware for API routes)
    const headersList = await headers()
    const userId = headersList.get('x-user-id')
    const userEmail = headersList.get('x-user-email')
    
    if (userId && userEmail) {
      return {
        id: userId,
        email: userEmail,
        name: 'Test User' // For now, hardcoded
      }
    }

    // Fallback to cookie
    const cookieStore = await cookies()
    const authToken = cookieStore.get('auth-token')?.value
    
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
export async function isAuthenticated(): Promise<boolean> {
  return (await getCurrentUser()) !== null
}