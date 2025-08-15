import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get('auth-token')?.value

    if (!authToken) {
      console.log('🚫 No auth token found')
      return NextResponse.json(
        { success: false, authenticated: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    try {
      const decoded = JSON.parse(Buffer.from(authToken, 'base64').toString())
      
      // Check token age
      const tokenAge = Date.now() - decoded.timestamp
      const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 days
      
      if (tokenAge > maxAge) {
        return NextResponse.json(
          { success: false, error: 'Token expired' },
          { status: 401 }
        )
      }

      console.log('✅ Auth check successful for user:', decoded.email)
      return NextResponse.json({
        success: true,
        authenticated: true,  // Add this field that the frontend expects
        user: {
          id: decoded.userId,
          email: decoded.email,
          name: decoded.name
        }
      })
    } catch (err) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json(
      { success: false, error: 'Auth check failed' },
      { status: 500 }
    )
  }
}