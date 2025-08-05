import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'

export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    
    // Check Twilio configuration
    const config = {
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV,
      },
      twilio: {
        accountSid: {
          present: !!process.env.TWILIO_ACCOUNT_SID,
          prefix: process.env.TWILIO_ACCOUNT_SID?.substring(0, 8) + '...',
          length: process.env.TWILIO_ACCOUNT_SID?.length
        },
        authToken: {
          present: !!process.env.TWILIO_AUTH_TOKEN,
          length: process.env.TWILIO_AUTH_TOKEN?.length
        },
        phoneNumber: {
          present: !!process.env.TWILIO_PHONE_NUMBER,
          value: process.env.TWILIO_PHONE_NUMBER,
          format: process.env.TWILIO_PHONE_NUMBER?.match(/^\+1\d{10}$/) ? 'valid' : 'invalid'
        }
      },
      webhookUrl: 'https://gostudiom.com/api/twilio/incoming',
      testInstructions: [
        '1. Verify all Twilio env vars are present',
        '2. Check phone number format is +1XXXXXXXXXX',
        '3. Test with /test-sms page',
        '4. Check Vercel function logs for errors',
        '5. Verify Twilio account is active and has credits'
      ]
    }
    
    return NextResponse.json({
      success: true,
      config,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}