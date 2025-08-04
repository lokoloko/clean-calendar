import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db-edge'
import { sendSMS } from '@/lib/twilio'

// Twilio sends webhooks as form-urlencoded
export async function POST(request: NextRequest) {
  try {
    // Parse form data from Twilio
    const formData = await request.formData()
    const from = formData.get('From')?.toString().replace(/^\+1/, '') // Remove +1 prefix
    const body = formData.get('Body')?.toString().trim().toUpperCase()
    
    if (!from || !body) {
      return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        status: 200,
        headers: { 'Content-Type': 'text/xml' }
      })
    }

    // Find cleaner by phone number
    // Using DEV_USER_ID for now, will need to search across all users in production
    const DEV_USER_ID = '00000000-0000-0000-0000-000000000001'
    const cleaner = await db.getCleanerByPhone(DEV_USER_ID, from)
    
    if (!cleaner) {
      // Phone number not in system
      return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        status: 200,
        headers: { 'Content-Type': 'text/xml' }
      })
    }

    // Handle opt-in/opt-out
    if (body === 'YES' || body === 'START' || body === 'UNSTOP') {
      // Opt-in
      await db.updateCleaner(cleaner.id, cleaner.user_id, {
        sms_opted_in: true,
        sms_opted_in_at: new Date().toISOString(),
        sms_opt_out_at: null
      })
      
      // Send confirmation
      const confirmMessage = `Welcome! You'll now receive cleaning schedule reminders from GoStudioM. Reply STOP at any time to unsubscribe.`
      await sendSMS(from, confirmMessage)
      
    } else if (body === 'STOP' || body === 'UNSUBSCRIBE' || body === 'CANCEL') {
      // Opt-out
      await db.updateCleaner(cleaner.id, cleaner.user_id, {
        sms_opted_in: false,
        sms_opt_out_at: new Date().toISOString()
      })
      
      // Send confirmation (required by regulations)
      const confirmMessage = `You've been unsubscribed from GoStudioM cleaning reminders. Reply START to re-subscribe.`
      await sendSMS(from, confirmMessage)
    }
    
    // Return empty TwiML response
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' }
    })
    
  } catch (error) {
    console.error('Error handling Twilio webhook:', error)
    // Return empty response even on error to prevent Twilio retries
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' }
    })
  }
}