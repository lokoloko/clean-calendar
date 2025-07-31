import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'crypto'
import { headers } from 'next/headers'

export async function POST(request: Request) {
  try {
    const { phoneNumber, code } = await request.json()

    if (!phoneNumber || !code) {
      return NextResponse.json(
        { error: 'Phone number and code are required' },
        { status: 400 }
      )
    }

    // Verify the code (this also marks it as used)
    const authCode = await db.verifyAuthCode(phoneNumber, code)
    
    if (!authCode) {
      return NextResponse.json(
        { error: 'Invalid or expired code' },
        { status: 401 }
      )
    }

    // Get cleaner info
    const cleaner = await db.getCleanerById(authCode.cleaner_id)
    
    if (!cleaner) {
      return NextResponse.json(
        { error: 'Cleaner not found' },
        { status: 404 }
      )
    }

    // Generate session token
    const token = crypto.randomBytes(32).toString('hex')
    
    // Session expires in 30 days
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    // Get device info from headers
    const headersList = await headers()
    const userAgent = headersList.get('user-agent') || 'Unknown'
    const deviceInfo = {
      userAgent,
      timestamp: new Date().toISOString()
    }

    // Create session
    await db.createCleanerSession(cleaner.id, token, deviceInfo, expiresAt)

    return NextResponse.json({
      success: true,
      token,
      cleaner: {
        id: cleaner.id,
        name: cleaner.name,
        phone: cleaner.phone
      }
    })
  } catch (error) {
    console.error('Error verifying auth code:', error)
    return NextResponse.json(
      { error: 'Failed to verify code' },
      { status: 500 }
    )
  }
}