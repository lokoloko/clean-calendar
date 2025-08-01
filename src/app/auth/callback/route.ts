import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'
  const origin = requestUrl.origin
  
  console.log('Auth callback received:', {
    url: request.url,
    origin: origin,
    code: code ? 'present' : 'absent',
    error: error,
    searchParams: requestUrl.searchParams.toString()
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
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (!error && data?.session) {
        // Successful authentication
        console.log('Authentication successful, creating/updating profile')
        
        // Create or update user profile
        try {
          const { db } = await import('@/lib/db')
          await db.createOrUpdateProfile(data.session.user.id, {
            email: data.session.user.email,
            name: data.session.user.user_metadata?.full_name || data.session.user.user_metadata?.name,
            avatar_url: data.session.user.user_metadata?.avatar_url
          })
          console.log('Profile created/updated successfully')
        } catch (profileError) {
          console.error('Error creating/updating profile:', profileError)
          // Continue anyway - the profile will be created on next login
        }
        
        // Use absolute URL for redirect
        return NextResponse.redirect(`${origin}${next}`)
      } else {
        console.error('Error exchanging code for session:', error)
        return NextResponse.redirect(`${origin}/login?error=auth_failed`)
      }
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