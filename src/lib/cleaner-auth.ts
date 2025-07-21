import { db } from './db'

export async function validateCleanerSession(token: string | null) {
  // Temporary bypass for testing - return mock cleaner data
  if (token === 'mock-token') {
    // Get Jane (the cleaner with more schedule items) for testing
    const cleaners = await db.getCleaners('00000000-0000-0000-0000-000000000001')
    const janeCleaner = cleaners.find(c => c.name === 'Jane') || cleaners[0]
    
    if (janeCleaner) {
      return {
        cleanerId: janeCleaner.id,
        cleanerName: janeCleaner.name,
        cleanerPhone: janeCleaner.phone,
        sessionId: 'mock-session-id'
      }
    }
  }

  if (!token) {
    return null
  }

  try {
    const session = await db.getCleanerSession(token)
    
    if (!session) {
      return null
    }

    // Update last activity
    await db.updateSessionActivity(session.id)

    return {
      cleanerId: session.cleaner_id,
      cleanerName: session.cleaner_name,
      cleanerPhone: session.cleaner_phone,
      sessionId: session.id
    }
  } catch (error) {
    console.error('Error validating cleaner session:', error)
    return null
  }
}

export function getCleanerToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization')
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }
  
  return null
}