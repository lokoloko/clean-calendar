import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getCurrentUser } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase-server'

export async function GET() {
  const debugInfo = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    authMode: process.env.NEXT_PUBLIC_USE_AUTH === 'false' ? 'development' : 'production',
    checks: {
      getCurrentUser: null as any,
      supabaseSession: null as any,
      cookies: null as any,
      environment: {
        NEXT_PUBLIC_USE_AUTH: process.env.NEXT_PUBLIC_USE_AUTH,
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'present' : 'missing',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'present' : 'missing',
      }
    }
  }

  // Check getCurrentUser
  try {
    const user = await getCurrentUser()
    debugInfo.checks.getCurrentUser = user ? {
      success: true,
      userId: user.id,
      email: user.email
    } : {
      success: false,
      message: 'No user returned'
    }
  } catch (error) {
    debugInfo.checks.getCurrentUser = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }

  // Check Supabase session
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getSession()
    
    if (error) {
      debugInfo.checks.supabaseSession = {
        success: false,
        error: error.message
      }
    } else {
      debugInfo.checks.supabaseSession = {
        success: true,
        hasSession: !!data.session,
        sessionUserId: data.session?.user?.id,
        sessionEmail: data.session?.user?.email
      }
    }
  } catch (error) {
    debugInfo.checks.supabaseSession = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }

  // Check cookies
  try {
    const cookieStore = await cookies()
    const authCookies = []
    
    // Check for Supabase auth cookies
    const possibleAuthCookies = [
      'sb-access-token',
      'sb-refresh-token',
      'sb-auth-token',
      'next-auth.session-token',
      'dev-auth-cookie'
    ]
    
    for (const cookieName of possibleAuthCookies) {
      const cookie = cookieStore.get(cookieName)
      if (cookie) {
        authCookies.push({
          name: cookieName,
          present: true,
          length: cookie.value.length
        })
      }
    }
    
    debugInfo.checks.cookies = {
      success: true,
      authCookiesFound: authCookies.length,
      cookies: authCookies
    }
  } catch (error) {
    debugInfo.checks.cookies = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }

  return NextResponse.json(debugInfo, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    }
  })
}