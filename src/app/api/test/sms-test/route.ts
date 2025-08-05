import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'

export async function GET(request: Request) {
  try {
    // Test 1: Authentication
    const user = await requireAuth()
    
    // Test 2: Can we import Twilio?
    let twilioImportTest = 'not tested'
    try {
      const twilio = await import('@/lib/twilio')
      twilioImportTest = 'success'
    } catch (error) {
      twilioImportTest = `failed: ${error instanceof Error ? error.message : 'unknown'}`
    }
    
    // Test 3: Phone utils
    let phoneUtilsTest = 'not tested'
    try {
      const { validatePhoneNumber, normalizePhoneNumber } = await import('@/lib/phone-utils')
      const testPhone = '(555) 123-4567'
      const normalized = normalizePhoneNumber(testPhone)
      const isValid = validatePhoneNumber(normalized)
      phoneUtilsTest = `success - normalized: ${normalized}, valid: ${isValid}`
    } catch (error) {
      phoneUtilsTest = `failed: ${error instanceof Error ? error.message : 'unknown'}`
    }
    
    return NextResponse.json({
      success: true,
      tests: {
        auth: 'passed',
        userId: user.id,
        twilioImport: twilioImportTest,
        phoneUtils: phoneUtilsTest,
        env: {
          hasTwilioSid: !!process.env.TWILIO_ACCOUNT_SID,
          hasTwilioToken: !!process.env.TWILIO_AUTH_TOKEN,
          hasTwilioPhone: !!process.env.TWILIO_PHONE_NUMBER,
        }
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}