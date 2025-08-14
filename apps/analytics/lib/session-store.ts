/**
 * In-Memory Session Store
 * Stores property data in memory for the duration of the session
 * Data is automatically cleaned up after 1 hour of inactivity
 */

import type { Property } from './storage/property-store'

export interface SessionData {
  properties: Property[]
  createdAt: Date
  lastAccessed: Date
  metadata?: {
    uploadedFiles?: string[]
    csvDateRange?: { start: Date; end: Date }
    aiAnalysis?: any
  }
}

// In-memory store using Map
const sessions = new Map<string, SessionData>()

// Auto-cleanup old sessions every 10 minutes
if (typeof global !== 'undefined' && !global.sessionCleanupInterval) {
  global.sessionCleanupInterval = setInterval(() => {
    const now = Date.now()
    const oneHourAgo = now - 3600000 // 1 hour in milliseconds
    
    sessions.forEach((session, id) => {
      if (session.lastAccessed.getTime() < oneHourAgo) {
        console.log(`Cleaning up expired session: ${id}`)
        sessions.delete(id)
      }
    })
  }, 600000) // Check every 10 minutes
}

/**
 * Get or create a session
 */
export function getSession(sessionId: string): SessionData {
  let session = sessions.get(sessionId)
  
  if (!session) {
    session = {
      properties: [],
      createdAt: new Date(),
      lastAccessed: new Date(),
      metadata: {}
    }
    sessions.set(sessionId, session)
    console.log(`Created new session: ${sessionId}`)
  } else {
    // Update last accessed time
    session.lastAccessed = new Date()
  }
  
  return session
}

/**
 * Save properties to session
 */
export function saveToSession(sessionId: string, properties: Property[]): void {
  const session = getSession(sessionId)
  session.properties = properties
  session.lastAccessed = new Date()
  sessions.set(sessionId, session)
  console.log(`Saved ${properties.length} properties to session ${sessionId}`)
}

/**
 * Update a single property in session
 */
export function updatePropertyInSession(sessionId: string, propertyId: string, updates: Partial<Property>): Property | null {
  const session = getSession(sessionId)
  const propertyIndex = session.properties.findIndex(p => p.id === propertyId)
  
  if (propertyIndex === -1) {
    console.error(`Property ${propertyId} not found in session ${sessionId}`)
    return null
  }
  
  session.properties[propertyIndex] = {
    ...session.properties[propertyIndex],
    ...updates,
    updatedAt: new Date()
  }
  
  session.lastAccessed = new Date()
  sessions.set(sessionId, session)
  
  return session.properties[propertyIndex]
}

/**
 * Delete a property from session
 */
export function deletePropertyFromSession(sessionId: string, propertyId: string): boolean {
  const session = getSession(sessionId)
  const originalLength = session.properties.length
  
  session.properties = session.properties.filter(p => p.id !== propertyId)
  session.lastAccessed = new Date()
  sessions.set(sessionId, session)
  
  const deleted = session.properties.length < originalLength
  if (deleted) {
    console.log(`Deleted property ${propertyId} from session ${sessionId}`)
  }
  
  return deleted
}

/**
 * Add properties to existing session
 */
export function addPropertiesToSession(sessionId: string, newProperties: Property[]): void {
  const session = getSession(sessionId)
  session.properties = [...session.properties, ...newProperties]
  session.lastAccessed = new Date()
  sessions.set(sessionId, session)
  console.log(`Added ${newProperties.length} properties to session ${sessionId}`)
}

/**
 * Update session metadata
 */
export function updateSessionMetadata(sessionId: string, metadata: Partial<SessionData['metadata']>): void {
  const session = getSession(sessionId)
  session.metadata = {
    ...session.metadata,
    ...metadata
  }
  session.lastAccessed = new Date()
  sessions.set(sessionId, session)
}

/**
 * Clear a session
 */
export function clearSession(sessionId: string): void {
  sessions.delete(sessionId)
  console.log(`Cleared session: ${sessionId}`)
}

/**
 * Get session stats (for debugging)
 */
export function getSessionStats(): { totalSessions: number; totalProperties: number } {
  let totalProperties = 0
  sessions.forEach(session => {
    totalProperties += session.properties.length
  })
  
  return {
    totalSessions: sessions.size,
    totalProperties
  }
}