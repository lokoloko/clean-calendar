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
  console.log('[SMS Invite] Starting request')
  
  const user = await requireAuth()
  console.log('[SMS Invite] User authenticated:', user.id)
  
  const { id: cleanerId } = await params
  console.log('[SMS Invite] Cleaner ID:', cleanerId)

  // Get cleaner
  const cleaner = await db.getCleaner(cleanerId)
  console.log('[SMS Invite] Cleaner found:', !!cleaner, cleaner?.phone)
  
  if (!cleaner || cleaner.user_id !== user.id) {
    throw new ApiError(404, 'Cleaner not found')
  }

  // Check if cleaner has a phone number
  if (!cleaner.phone) {
    throw new ApiError(400, 'Cleaner does not have a phone number')
  }

  // Check if SMS fields exist (migration might not have run yet)
  if (!('sms_opted_in' in cleaner)) {
    console.error('[SMS Invite] SMS fields missing from cleaner record. Migration may not have run.')
    throw new ApiError(500, 'SMS feature not properly configured. Please contact support.')
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
  console.log('[SMS Invite] Updating cleaner with token')
  try {
    await db.updateCleaner(cleanerId, user.id, {
      sms_invite_token: token,
      sms_invite_sent_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('[SMS Invite] Failed to update cleaner:', error)
    throw new ApiError(500, `Database update failed: ${error instanceof Error ? error.message : 'unknown'}`)
  }

  // Get user info for the SMS
  console.log('[SMS Invite] Getting user profile')
  let hostName = 'Your host'
  try {
    const userProfile = await db.getUserProfile(user.id)
    hostName = userProfile?.name || user.email?.split('@')[0] || 'Your host'
    console.log('[SMS Invite] Host name:', hostName)
  } catch (error) {
    console.error('[SMS Invite] Failed to get user profile:', error)
    // Continue with default host name
  }

  // Send SMS invite
  const message = `Hi ${cleaner.name}! ${hostName} wants to send you cleaning schedule reminders via GoStudioM. Reply YES to opt-in or STOP to decline.`
  console.log('[SMS Invite] Sending SMS to:', cleaner.phone)
  
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