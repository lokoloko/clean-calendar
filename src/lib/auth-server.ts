import { createClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'

// Mock user ID for development when auth is disabled
const DEV_USER_ID = '00000000-0000-0000-0000-000000000001'

export async function getCurrentUser() {
  const authMode = process.env.NEXT_PUBLIC_USE_AUTH
  console.log('[Auth] getCurrentUser called, auth mode:', authMode)
  
  // Check if auth is disabled for development
  if (authMode === 'false') {
    console.log('[Auth] Using dev mode authentication')
    return {
      id: DEV_USER_ID,
      email: 'dev@example.com'
    }
  }

  console.log('[Auth] Using Supabase authentication')
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) {
    console.error('[Auth] Error getting user:', error)
    return null
  }
  
  if (!user) {
    console.log('[Auth] No user found in session')
    return null
  }
  
  console.log('[Auth] User found:', user.id, user.email)
  return user
}

export async function requireAuth() {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error('Unauthorized')
  }
  
  return user
}