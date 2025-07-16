import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // For development, we'll check a simple cookie to determine if user is "logged in"
  const isLoggedIn = request.cookies.get('dev-auth')?.value === 'true'
  
  // Protected routes
  const protectedPaths = ['/dashboard', '/listings', '/cleaners', '/assignments', '/schedule', '/stats', '/settings']
  const isProtectedPath = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))

  if (isProtectedPath && !isLoggedIn) {
    return NextResponse.redirect(new URL('/', request.url))
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
     * - api routes
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}