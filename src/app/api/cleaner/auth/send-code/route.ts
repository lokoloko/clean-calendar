import { NextResponse } from 'next/server'
import { db } from '@/lib/db-edge'
import { sendSMS, validatePhoneNumber } from '@/lib/twilio'

// Mock user ID for development
const DEV_USER_ID = '00000000-0000-0000-0000-000000000001'

export async function POST(request: Request) {
  try {
    const { phoneNumber } = await request.json()

    if (!phoneNumber || !validatePhoneNumber(phoneNumber)) {
      return NextResponse.json(
        { error: 'Invalid phone number. Please enter a 10-digit North American phone number.' },
        { status: 400 }
      )
    }

    // Check if cleaner exists with this phone number
    const cleaner = await db.getCleanerByPhone(DEV_USER_ID, phoneNumber)
    
    if (!cleaner) {
      return NextResponse.json(
        { error: 'Phone number not registered' },
        { status: 404 }
      )
    }

    // Check for recent codes to prevent spam
    const recentCode = await db.getRecentAuthCode(cleaner.id)
    if (recentCode) {
      const timeSinceLastCode = Date.now() - new Date(recentCode.created_at).getTime()
      const oneMinute = 60 * 1000
      
      if (timeSinceLastCode < oneMinute) {
        const waitTime = Math.ceil((oneMinute - timeSinceLastCode) / 1000)
        return NextResponse.json(
          { error: `Please wait ${waitTime} seconds before requesting a new code` },
          { status: 429 }
        )
      }
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    
    // Code expires in 10 minutes
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 10)

    // Save code to database
    await db.createAuthCode(cleaner.id, phoneNumber, code, expiresAt)

    // Send SMS
    const message = `Your GoStudioM verification code is: ${code}\n\nThis code expires in 10 minutes.`
    await sendSMS(phoneNumber, message)

    return NextResponse.json({ 
      success: true,
      message: 'Verification code sent'
    })
  } catch (error) {
    console.error('Error sending auth code:', error)
    return NextResponse.json(
      { error: 'Failed to send verification code' },
      { status: 500 }
    )
  }
}