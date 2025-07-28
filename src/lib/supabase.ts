import { createClient } from '@supabase/supabase-js'

// Default client for backwards compatibility
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// For client-side usage - use @/lib/supabase-browser instead
export function createBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// For server-side usage (with service role key)
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Helper to check if we're using Supabase auth
export const useSupabaseAuth = () => {
  return process.env.NEXT_PUBLIC_USE_AUTH === 'true'
}

// Dev user ID for backwards compatibility
export const DEV_USER_ID = '00000000-0000-0000-0000-000000000001'