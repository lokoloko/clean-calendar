import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { sendSMS } from '@/lib/twilio'

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const { phone, message } = await request.json()
    
    if (!phone || !message) {
      return NextResponse.json({
        success: false,
        error: 'Phone and message are required'
      }, { status: 400 })
    }
    
    // Log all details for debugging
    console.log('[Test SMS] Starting test')
    console.log('[Test SMS] Phone:', phone)
    console.log('[Test SMS] Message:', message)
    console.log('[Test SMS] Twilio Config:', {
      hasAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
      accountSidPrefix: process.env.TWILIO_ACCOUNT_SID?.substring(0, 8),
      hasAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    })
    
    try {
      const result = await sendSMS(phone, message)
      console.log('[Test SMS] Success:', result)
      
      return NextResponse.json({
        success: true,
        message: 'Test SMS sent successfully',
        twilioResponse: {
          sid: result.sid,
          status: result.status,
          to: result.to,
          from: result.from,
          price: result.price,
          error_code: result.error_code,
          error_message: result.error_message
        }
      })
    } catch (error) {
      console.error('[Test SMS] Send failed:', error)
      
      if (error instanceof Error) {
        return NextResponse.json({
          success: false,
          error: error.message,
          details: error.stack
        }, { status: 500 })
      }
      
      return NextResponse.json({
        success: false,
        error: 'Unknown error occurred'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('[Test SMS] Auth failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed'
    }, { status: 401 })
  }
}