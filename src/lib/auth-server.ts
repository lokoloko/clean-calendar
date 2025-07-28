import { createClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'

// Mock user ID for development when auth is disabled
const DEV_USER_ID = '00000000-0000-0000-0000-000000000001'

export async function getCurrentUser() {
  // Check if auth is disabled for development
  if (process.env.NEXT_PUBLIC_USE_AUTH === 'false') {
    return {
      id: DEV_USER_ID,
      email: 'dev@example.com'
    }
  }

  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return null
  }
  
  return user
}

export async function requireAuth() {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error('Unauthorized')
  }
  
  return user
}