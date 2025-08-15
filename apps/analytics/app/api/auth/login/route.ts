import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// Hardcoded test credentials
const TEST_CREDENTIALS = {
  email: 'test@gostudiom.com',
  password: 'analytics123',
  userId: '00000000-0000-0000-0000-000000000001',
  name: 'Test User'
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Simple credential check
    if (email === TEST_CREDENTIALS.email && password === TEST_CREDENTIALS.password) {
      // Create a simple auth token (in production, use JWT or similar)
      const authToken = Buffer.from(JSON.stringify({
        userId: TEST_CREDENTIALS.userId,
        email: TEST_CREDENTIALS.email,
        name: TEST_CREDENTIALS.name,
        timestamp: Date.now()
      })).toString('base64')

      // Set auth cookie (await cookies in Next.js 15)
      const cookieStore = await cookies()
      cookieStore.set('auth-token', authToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/'
      })

      return NextResponse.json({
        success: true,
        user: {
          id: TEST_CREDENTIALS.userId,
          email: TEST_CREDENTIALS.email,
          name: TEST_CREDENTIALS.name
        }
      })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid credentials' },
      { status: 401 }
    )
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    )
  }
}