import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // Check if we're using Supabase auth or dev mode
  const useAuth = process.env.NEXT_PUBLIC_USE_AUTH === 'true'
  
  // Protected routes
  const protectedPaths = ['/dashboard', '/listings', '/cleaners', '/assignments', '/schedule', '/stats', '/settings']
  const protectedApiPaths = ['/api/dashboard', '/api/listings', '/api/cleaners', '/api/assignments', '/api/schedule', '/api/subscription', '/api/stats']
  const isProtectedPath = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))
  const isProtectedApiPath = protectedApiPaths.some(path => request.nextUrl.pathname.startsWith(path))
  
  // Auth routes that should redirect if already logged in
  const authPaths = ['/login', '/signup']
  const isAuthPath = authPaths.some(path => request.nextUrl.pathname.startsWith(path))
  
  if (useAuth) {
    // Create a Supabase client with the request cookies
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            request.cookies.set({
              name,
              value,
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.set({
              name,
              value: '',
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    
    // Redirect to login if accessing protected route without auth
    if (isProtectedPath && !user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    // Return 401 for protected API routes without auth
    if (isProtectedApiPath && !user) {
      return NextResponse.json(
        { error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
        { status: 401 }
      )
    }
    
    // Redirect to dashboard if accessing auth routes while logged in
    if (isAuthPath && user) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    
    return response
  } else {
    // Dev mode - use simple cookie auth
    const isLoggedIn = request.cookies.get('dev-auth')?.value === 'true'
    
    if (isProtectedPath && !isLoggedIn) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    
    // Return 401 for protected API routes without auth in dev mode
    if (isProtectedApiPath && !isLoggedIn) {
      return NextResponse.json(
        { error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
        { status: 401 }
      )
    }
    
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - files with image extensions
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}