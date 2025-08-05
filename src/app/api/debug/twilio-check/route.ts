import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'

export async function GET(request: Request) {
  try {
    // Check if user is authenticated
    await requireAuth()
    
    // Check Twilio environment variables
    const twilioConfig = {
      hasAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
      hasAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
      hasPhoneNumber: !!process.env.TWILIO_PHONE_NUMBER,
      phoneNumberFormat: process.env.TWILIO_PHONE_NUMBER ? 
        process.env.TWILIO_PHONE_NUMBER.replace(/\d(?=\d{4})/g, '*') : 
        'not set',
      accountSidPrefix: process.env.TWILIO_ACCOUNT_SID?.substring(0, 6) || 'not set'
    }
    
    // Test Twilio initialization (without actually sending)
    let twilioStatus = 'not tested'
    try {
      const twilio = require('twilio')
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
      twilioStatus = client ? 'initialized' : 'failed to initialize'
    } catch (error) {
      twilioStatus = `error: ${error instanceof Error ? error.message : 'unknown'}`
    }
    
    return NextResponse.json({
      authenticated: true,
      twilioConfig,
      twilioStatus,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      authenticated: false,
      error: error instanceof Error ? error.message : 'Authentication failed'
    }, { status: 401 })
  }
}