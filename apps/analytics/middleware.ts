import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Public routes that don't require authentication
const publicRoutes = [
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/check',
  '/', // Landing/upload page
  '/api/upload', // Allow public uploads
  '/mapping', // Property selection/mapping page
  '/api/properties', // Allow properties API access without auth
  '/properties', // Properties page handles its own auth
  '/property', // Property detail pages handle their own auth
]

export function middleware(request: NextRequest) {
  const authToken = request.cookies.get('auth-token')?.value
  const pathname = request.nextUrl.pathname

  // Check if the route is public - handle both exact matches and path prefixes
  const isPublicRoute = publicRoutes.some(route => {
    if (pathname === route) return true
    // For routes like /property and /api/properties, match any sub-paths
    if (route === '/property' && pathname.startsWith('/property/')) return true
    if (route === '/api/properties' && pathname.startsWith('/api/properties')) return true
    return pathname.startsWith(`${route}/`)
  })
  
  // API routes should return JSON errors, not redirect to login
  const isApiRoute = pathname.startsWith('/api/')

  // If no auth token and trying to access protected route
  if (!authToken && !isPublicRoute) {
    // For API routes, return 401 instead of redirecting
    if (isApiRoute) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // For pages, redirect to login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // If has auth token and trying to access login, redirect to dashboard
  if (authToken && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Validate auth token structure
  if (authToken && !isPublicRoute) {
    try {
      const decoded = JSON.parse(Buffer.from(authToken, 'base64').toString())
      
      // Check if token has required fields
      if (!decoded.userId || !decoded.email || !decoded.timestamp) {
        // Invalid token structure
        if (isApiRoute) {
          return NextResponse.json(
            { success: false, error: 'Invalid authentication token' },
            { status: 401 }
          )
        }
        const response = NextResponse.redirect(new URL('/login', request.url))
        response.cookies.delete('auth-token')
        return response
      }

      // Check token age
      const tokenAge = Date.now() - decoded.timestamp
      const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 days

      if (tokenAge > maxAge) {
        // Token expired
        if (isApiRoute) {
          return NextResponse.json(
            { success: false, error: 'Authentication token expired' },
            { status: 401 }
          )
        }
        const response = NextResponse.redirect(new URL('/login', request.url))
        response.cookies.delete('auth-token')
        return response
      }

      // Add user info to headers for API routes
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set('x-user-id', decoded.userId)
      requestHeaders.set('x-user-email', decoded.email)

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
    } catch (err) {
      // Invalid token
      if (isApiRoute) {
        return NextResponse.json(
          { success: false, error: 'Invalid authentication' },
          { status: 401 }
        )
      }
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('auth-token')
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}