import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'
  const origin = requestUrl.origin
  
  console.log('[Auth Callback] Received request:', {
    url: request.url,
    origin: origin,
    code: code ? 'present' : 'absent',
    error: error,
    next: next,
    searchParams: requestUrl.searchParams.toString(),
    headers: {
      host: request.headers.get('host'),
      referer: request.headers.get('referer'),
    }
  })

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error)
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  // Handle authorization code flow
  if (code) {
    const supabase = await createClient()
    
    try {
      console.log('[Auth Callback] Attempting to exchange code for session')
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('[Auth Callback] Error exchanging code:', error)
        return NextResponse.redirect(`${origin}/login?error=auth_failed&details=${encodeURIComponent(error.message)}`)
      }
      
      if (!data?.session) {
        console.error('[Auth Callback] No session returned from code exchange')
        return NextResponse.redirect(`${origin}/login?error=no_session`)
      }
      
      // Successful authentication
      console.log('[Auth Callback] Authentication successful:', {
        userId: data.session.user.id,
        email: data.session.user.email,
        provider: data.session.user.app_metadata?.provider,
        hasAccessToken: !!data.session.access_token,
        hasRefreshToken: !!data.session.refresh_token,
        expiresAt: data.session.expires_at,
      })
      
      // Verify session was set
      const { data: { session: verifySession } } = await supabase.auth.getSession()
      console.log('[Auth Callback] Session verification:', {
        hasSession: !!verifySession,
        sessionUserId: verifySession?.user?.id,
      })
      
      // Create or update user profile
      try {
        const { db } = await import('@/lib/db')
        await db.createOrUpdateProfile(data.session.user.id, {
          email: data.session.user.email,
          name: data.session.user.user_metadata?.full_name || data.session.user.user_metadata?.name,
          avatar_url: data.session.user.user_metadata?.avatar_url
        })
        console.log('[Auth Callback] Profile created/updated successfully')
      } catch (profileError) {
        console.error('[Auth Callback] Error creating/updating profile:', profileError)
        // Continue anyway - the profile will be created on next login
      }
      
      console.log('[Auth Callback] Redirecting to:', `${origin}${next}`)
      // Use absolute URL for redirect
      return NextResponse.redirect(`${origin}${next}`)
    } catch (err) {
      console.error('Exception during code exchange:', err)
      return NextResponse.redirect(`${origin}/login?error=auth_failed`)
    }
  }

  // Handle implicit flow (tokens in hash fragment)
  // Since hash fragments aren't sent to the server, we need to handle this client-side
  console.log('No code or error in query params, returning client-side handler')
  return new Response(`
    <html>
      <head>
        <script>
          // Check if there's an access token in the hash
          const hash = window.location.hash;
          if (hash && hash.includes('access_token')) {
            // Redirect to dashboard - the client will handle the token
            window.location.href = '/dashboard';
          } else {
            // No code or token found
            window.location.href = '/login?error=no_code';
          }
        </script>
      </head>
      <body>
        <p>Completing authentication...</p>
      </body>
    </html>
  `, {
    headers: { 'Content-Type': 'text/html' }
  })
}