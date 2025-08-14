import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const authToken = cookies().get('auth-token')?.value

    if (!authToken) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      )
    }

    try {
      // Decode the auth token
      const decoded = JSON.parse(Buffer.from(authToken, 'base64').toString())
      
      // Check if token is still valid (simple timestamp check)
      const tokenAge = Date.now() - decoded.timestamp
      const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
      
      if (tokenAge > maxAge) {
        cookies().delete('auth-token')
        return NextResponse.json(
          { authenticated: false },
          { status: 401 }
        )
      }

      return NextResponse.json({
        authenticated: true,
        user: {
          id: decoded.userId,
          email: decoded.email,
          name: decoded.name
        }
      })
    } catch (err) {
      // Invalid token
      cookies().delete('auth-token')
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json(
      { authenticated: false },
      { status: 500 }
    )
  }
}