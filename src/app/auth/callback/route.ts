import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  
  // If there's an error from the OAuth provider
  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${error}`, request.url))
  }

  if (code) {
    const supabase = await createClient()
    
    const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!sessionError) {
      // Successful authentication, redirect to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    
    console.error('Session exchange error:', sessionError)
    return NextResponse.redirect(new URL('/login?error=auth_failed', request.url))
  }

  // If no code is present, check if we're in implicit flow (token in hash)
  // For implicit flow, we need to handle it client-side
  // Create a page that will handle the hash fragment
  return new Response(`
    <html>
      <head>
        <script>
          // Check if there's a hash with access_token
          const hash = window.location.hash;
          if (hash && hash.includes('access_token')) {
            // Redirect to dashboard - the client-side auth will pick up the token
            window.location.href = '/dashboard';
          } else {
            // No token found, redirect to login
            window.location.href = '/login?error=no_code';
          }
        </script>
      </head>
      <body>
        <p>Completing authentication...</p>
      </body>
    </html>
  `, {
    headers: { 'Content-Type': 'text/html' },
  })
}