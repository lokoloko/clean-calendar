import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db-edge'
import { requireAuth } from '@/lib/auth-server'
import { sendSMS } from '@/lib/twilio'
import { withApiHandler } from '@/lib/api-wrapper'
import { ApiError } from '@/lib/api-errors'

export const POST = withApiHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireAuth()
  const { id: cleanerId } = await params

  // Get cleaner
  const cleaner = await db.getCleaner(cleanerId)
  if (!cleaner || cleaner.user_id !== user.id) {
    throw new ApiError(404, 'Cleaner not found')
  }

  // Check if cleaner has a phone number
  if (!cleaner.phone) {
    throw new ApiError(400, 'Cleaner does not have a phone number')
  }

  // Check if already opted in
  if (cleaner.sms_opted_in) {
    throw new ApiError(400, 'Cleaner has already opted in to SMS notifications')
  }

  // Check rate limiting - one invite per 48 hours
  if (cleaner.sms_invite_sent_at) {
    const hoursSinceLastInvite = (Date.now() - new Date(cleaner.sms_invite_sent_at).getTime()) / (1000 * 60 * 60)
    if (hoursSinceLastInvite < 48) {
      const hoursRemaining = Math.ceil(48 - hoursSinceLastInvite)
      throw new ApiError(429, `Please wait ${hoursRemaining} hours before sending another invite`)
    }
  }

  // Generate unique token using Web Crypto API (Edge Runtime compatible)
  const tokenBytes = new Uint8Array(16)
  crypto.getRandomValues(tokenBytes)
  const token = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('')
  
  // Update cleaner with invite info
  await db.updateCleaner(cleanerId, user.id, {
    sms_invite_token: token,
    sms_invite_sent_at: new Date().toISOString()
  })

  // Get user info for the SMS
  const userProfile = await db.getUserProfile(user.id)
  const hostName = userProfile?.name || user.email?.split('@')[0] || 'Your host'

  // Send SMS invite
  const message = `Hi ${cleaner.name}! ${hostName} wants to send you cleaning schedule reminders via GoStudioM. Reply YES to opt-in or STOP to decline.`
  
  try {
    await sendSMS(cleaner.phone, message)
    
    return NextResponse.json({ 
      success: true,
      message: 'SMS invite sent successfully'
    })
  } catch (error) {
    console.error('Failed to send SMS invite:', error)
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('Invalid phone number')) {
        throw new ApiError(400, 'Invalid phone number format. Please ensure the phone number is 10 digits.')
      }
      throw new ApiError(500, `Failed to send SMS: ${error.message}`)
    }
    
    throw new ApiError(500, 'Failed to send SMS invite')
  }
})