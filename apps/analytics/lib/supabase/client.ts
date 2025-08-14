import { createBrowserClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Create a single supabase client for interacting with your database
export const supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
)

// Helper to check if we're in development mode without auth
export const isDevelopmentMode = process.env.NEXT_PUBLIC_USE_AUTH === 'false'

// Helper to get a mock user ID for development
export const getDevUserId = () => {
  if (isDevelopmentMode) {
    // Use a consistent mock user ID for development
    return '00000000-0000-0000-0000-000000000000'
  }
  return null
}

// Helper to get the current user
export const getCurrentUser = async () => {
  if (isDevelopmentMode) {
    // Return mock user for development
    return {
      id: getDevUserId()!,
      email: 'dev@example.com',
      user_metadata: {
        name: 'Development User'
      }
    }
  }
  
  const { data: { user } } = await supabase.auth.getUser()
  return user
}