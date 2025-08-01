import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import { headers } from 'next/headers'

export async function GET() {
  try {
    // Get all cookies
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    
    // Get headers
    const headersList = await headers()
    const host = headersList.get('host')
    const userAgent = headersList.get('user-agent')
    const referer = headersList.get('referer')
    
    // Create Supabase client
    const supabase = await createClient()
    
    // Try multiple auth methods
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    const { data: userData, error: userError } = await supabase.auth.getUser()
    
    // Check for specific Supabase cookies
    const supabaseCookies = allCookies.filter(c => 
      c.name.includes('supabase') || 
      c.name.includes('sb-') ||
      c.name.includes('auth')
    )
    
    // Check auth configuration
    const authConfig = {
      NEXT_PUBLIC_USE_AUTH: process.env.NEXT_PUBLIC_USE_AUTH,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 
        `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20)}...` : 'missing',
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
    }
    
    // Test auth flow
    let authFlowTest = {
      canCreateClient: false,
      canGetSession: false,
      canGetUser: false,
      sessionValid: false,
      userValid: false,
    }
    
    try {
      authFlowTest.canCreateClient = !!supabase
      authFlowTest.canGetSession = !sessionError
      authFlowTest.canGetUser = !userError
      authFlowTest.sessionValid = !!sessionData?.session
      authFlowTest.userValid = !!userData?.user
    } catch (e) {
      // Ignore errors in test
    }
    
    // Detailed session info
    const sessionInfo = {
      hasSession: !!sessionData?.session,
      sessionError: sessionError?.message || null,
      accessToken: sessionData?.session?.access_token ? 
        `${sessionData.session.access_token.substring(0, 20)}...` : null,
      refreshToken: sessionData?.session?.refresh_token ? 'present' : 'missing',
      expiresAt: sessionData?.session?.expires_at,
      expiresIn: sessionData?.session?.expires_in,
      tokenType: sessionData?.session?.token_type,
      user: sessionData?.session?.user ? {
        id: sessionData.session.user.id,
        email: sessionData.session.user.email,
        role: sessionData.session.user.role,
        lastSignInAt: sessionData.session.user.last_sign_in_at,
      } : null,
    }
    
    // User info
    const userInfo = {
      hasUser: !!userData?.user,
      userError: userError?.message || null,
      user: userData?.user ? {
        id: userData.user.id,
        email: userData.user.email,
        phone: userData.user.phone,
        emailConfirmedAt: userData.user.email_confirmed_at,
        lastSignInAt: userData.user.last_sign_in_at,
        appMetadata: userData.user.app_metadata,
        userMetadata: userData.user.user_metadata,
        identities: userData.user.identities?.map(i => ({
          provider: i.provider,
          createdAt: i.created_at,
          lastSignInAt: i.last_sign_in_at,
        })),
      } : null,
    }
    
    // Cookie analysis
    const cookieAnalysis = {
      totalCookies: allCookies.length,
      supabaseCookies: supabaseCookies.map(c => ({
        name: c.name,
        hasValue: !!c.value,
        length: c.value?.length || 0,
      })),
      authTokenCookie: allCookies.find(c => c.name.includes('auth-token')),
      devAuthCookie: allCookies.find(c => c.name === 'dev-auth'),
    }
    
    // Request context
    const requestContext = {
      host,
      userAgent,
      referer,
      isProduction: process.env.NODE_ENV === 'production',
      isVercel: !!process.env.VERCEL,
      timestamp: new Date().toISOString(),
    }
    
    return NextResponse.json({
      status: 'detailed_auth_debug',
      authConfig,
      authFlowTest,
      sessionInfo,
      userInfo,
      cookieAnalysis,
      requestContext,
      recommendations: generateRecommendations(authFlowTest, sessionInfo, cookieAnalysis, authConfig),
    }, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 })
  }
}

function generateRecommendations(
  authFlowTest: any, 
  sessionInfo: any, 
  cookieAnalysis: any, 
  authConfig: any
): string[] {
  const recommendations = []
  
  // Check auth mode
  if (authConfig.NEXT_PUBLIC_USE_AUTH !== 'true') {
    recommendations.push('🚨 NEXT_PUBLIC_USE_AUTH is not set to "true" - authentication is disabled!')
  }
  
  // Check Supabase config
  if (!authConfig.NEXT_PUBLIC_SUPABASE_URL || authConfig.NEXT_PUBLIC_SUPABASE_URL === 'missing') {
    recommendations.push('🚨 NEXT_PUBLIC_SUPABASE_URL is missing')
  }
  
  if (!authConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY || authConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY === 'missing') {
    recommendations.push('🚨 NEXT_PUBLIC_SUPABASE_ANON_KEY is missing')
  }
  
  // Check session
  if (!sessionInfo.hasSession) {
    recommendations.push('⚠️ No active session found - user needs to log in')
  } else if (sessionInfo.expiresAt) {
    const expiresAt = new Date(sessionInfo.expiresAt * 1000)
    if (expiresAt < new Date()) {
      recommendations.push('⚠️ Session has expired - user needs to log in again')
    }
  }
  
  // Check cookies
  if (cookieAnalysis.supabaseCookies.length === 0) {
    recommendations.push('⚠️ No Supabase cookies found - authentication may not be working')
  }
  
  // Check auth flow
  if (!authFlowTest.canCreateClient) {
    recommendations.push('🚨 Cannot create Supabase client - check configuration')
  }
  
  if (authFlowTest.canCreateClient && !authFlowTest.canGetSession) {
    recommendations.push('⚠️ Client created but cannot get session - check cookies')
  }
  
  return recommendations
}