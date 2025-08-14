/**
 * Persistent Session Store for Development
 * Uses file system to persist sessions during development
 * Falls back to in-memory storage in production
 */

import type { Property } from './storage/property-store'
import fs from 'fs'
import path from 'path'

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

// Session storage directory
const SESSION_DIR = path.join(process.cwd(), '.sessions')

// Ensure session directory exists
if (process.env.NODE_ENV === 'development') {
  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true })
  }
}

// In-memory cache for faster access
const sessionCache = new Map<string, SessionData>()

/**
 * Get session file path
 */
function getSessionPath(sessionId: string): string {
  return path.join(SESSION_DIR, `${sessionId}.json`)
}

/**
 * Load session from file
 */
function loadSessionFromFile(sessionId: string): SessionData | null {
  if (process.env.NODE_ENV !== 'development') return null
  
  try {
    const filePath = getSessionPath(sessionId)
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8')
      const session = JSON.parse(data, (key, value) => {
        // Convert date strings back to Date objects
        if (key === 'createdAt' || key === 'lastAccessed' || key === 'updatedAt') {
          return new Date(value)
        }
        return value
      })
      console.log(`Loaded session ${sessionId.substring(0, 8)}... from file`)
      return session
    }
  } catch (error) {
    console.error(`Error loading session ${sessionId}:`, error)
  }
  return null
}

/**
 * Save session to file
 */
function saveSessionToFile(sessionId: string, session: SessionData): void {
  if (process.env.NODE_ENV !== 'development') return
  
  try {
    const filePath = getSessionPath(sessionId)
    fs.writeFileSync(filePath, JSON.stringify(session, null, 2))
    console.log(`Persisted session ${sessionId.substring(0, 8)}... to file`)
  } catch (error) {
    console.error(`Error saving session ${sessionId}:`, error)
  }
}

/**
 * Get or create a session
 */
export function getSession(sessionId: string): SessionData {
  // Check cache first
  let session = sessionCache.get(sessionId)
  
  if (!session) {
    // Try to load from file in development
    session = loadSessionFromFile(sessionId)
    
    if (!session) {
      // Create new session
      session = {
        properties: [],
        createdAt: new Date(),
        lastAccessed: new Date(),
        metadata: {}
      }
      console.log(`Created new session: ${sessionId.substring(0, 8)}...`)
    }
    
    // Cache the session
    sessionCache.set(sessionId, session)
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
  
  // Update cache
  sessionCache.set(sessionId, session)
  
  // Persist to file in development
  saveSessionToFile(sessionId, session)
  
  console.log(`Saved ${properties.length} properties to session ${sessionId.substring(0, 8)}...`)
}

/**
 * Add properties to existing session
 */
export function addPropertiesToSession(sessionId: string, properties: Property[]): void {
  const session = getSession(sessionId)
  session.properties = [...session.properties, ...properties]
  session.lastAccessed = new Date()
  
  // Update cache
  sessionCache.set(sessionId, session)
  
  // Persist to file in development
  saveSessionToFile(sessionId, session)
  
  console.log(`Added ${properties.length} properties to session ${sessionId.substring(0, 8)}...`)
}

/**
 * Update a single property in session
 */
export function updatePropertyInSession(sessionId: string, propertyId: string, updates: Partial<Property>): Property | null {
  const session = getSession(sessionId)
  const propertyIndex = session.properties.findIndex(p => p.id === propertyId)
  
  if (propertyIndex === -1) {
    console.error(`Property ${propertyId} not found in session ${sessionId.substring(0, 8)}...`)
    return null
  }
  
  session.properties[propertyIndex] = {
    ...session.properties[propertyIndex],
    ...updates,
    updatedAt: new Date()
  }
  
  session.lastAccessed = new Date()
  
  // Update cache
  sessionCache.set(sessionId, session)
  
  // Persist to file in development
  saveSessionToFile(sessionId, session)
  
  return session.properties[propertyIndex]
}

/**
 * Delete a property from session
 */
export function deletePropertyFromSession(sessionId: string, propertyId: string): boolean {
  const session = getSession(sessionId)
  const initialLength = session.properties.length
  
  session.properties = session.properties.filter(p => p.id !== propertyId)
  
  if (session.properties.length < initialLength) {
    session.lastAccessed = new Date()
    
    // Update cache
    sessionCache.set(sessionId, session)
    
    // Persist to file in development
    saveSessionToFile(sessionId, session)
    
    console.log(`Deleted property ${propertyId} from session ${sessionId.substring(0, 8)}...`)
    return true
  }
  
  return false
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
  
  // Update cache
  sessionCache.set(sessionId, session)
  
  // Persist to file in development
  saveSessionToFile(sessionId, session)
  
  console.log(`Updated metadata for session ${sessionId.substring(0, 8)}...`)
}

/**
 * Clean up old sessions (for production)
 */
export function cleanupOldSessions(): void {
  const now = Date.now()
  const oneHourAgo = now - 3600000 // 1 hour in milliseconds
  
  sessionCache.forEach((session, id) => {
    if (session.lastAccessed.getTime() < oneHourAgo) {
      console.log(`Cleaning up expired session: ${id.substring(0, 8)}...`)
      sessionCache.delete(id)
      
      // Delete file in development
      if (process.env.NODE_ENV === 'development') {
        try {
          const filePath = getSessionPath(id)
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
          }
        } catch (error) {
          console.error(`Error deleting session file ${id}:`, error)
        }
      }
    }
  })
}

// Auto-cleanup old sessions every 10 minutes
if (typeof global !== 'undefined' && !global.sessionCleanupInterval) {
  global.sessionCleanupInterval = setInterval(cleanupOldSessions, 600000)
}