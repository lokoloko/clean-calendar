import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    // Get all cookies
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    
    // Create Supabase client
    const supabase = await createClient()
    
    // Try to get session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    
    // Try to get user
    const { data: userData, error: userError } = await supabase.auth.getUser()
    
    // Check for specific Supabase cookies
    const supabaseCookies = allCookies.filter(c => 
      c.name.includes('supabase') || 
      c.name.includes('sb-') ||
      c.name.includes('auth')
    )
    
    return NextResponse.json({
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        NEXT_PUBLIC_USE_AUTH: process.env.NEXT_PUBLIC_USE_AUTH,
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'present' : 'missing',
      },
      cookies: {
        total: allCookies.length,
        supabaseRelated: supabaseCookies.map(c => ({
          name: c.name,
          hasValue: \!\!c.value,
          length: c.value?.length || 0
        }))
      },
      session: {
        data: sessionData,
        error: sessionError,
        hasSession: \!\!sessionData?.session,
        userId: sessionData?.session?.user?.id,
        email: sessionData?.session?.user?.email,
      },
      user: {
        data: userData?.user ? { id: userData.user.id, email: userData.user.email } : null,
        error: userError,
        hasUser: \!\!userData?.user,
      }
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
EOF < /dev/null