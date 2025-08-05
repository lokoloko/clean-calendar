import { NextResponse } from 'next/server'

export async function GET() {
  // Check all auth-related environment variables
  const envVars = {
    NEXT_PUBLIC_USE_AUTH: process.env.NEXT_PUBLIC_USE_AUTH,
    NEXT_PUBLIC_USE_AUTH_type: typeof process.env.NEXT_PUBLIC_USE_AUTH,
    NEXT_PUBLIC_USE_AUTH_equals_true: process.env.NEXT_PUBLIC_USE_AUTH === 'true',
    NEXT_PUBLIC_USE_AUTH_equals_false: process.env.NEXT_PUBLIC_USE_AUTH === 'false',
    NEXT_PUBLIC_USE_AUTH_truthy: !!process.env.NEXT_PUBLIC_USE_AUTH,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'present' : 'missing',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'present' : 'missing',
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    // Twilio env vars
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ? 'present' : 'missing',
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ? 'present' : 'missing',
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER ? 'present' : 'missing',
  }
  
  // Test auth flow
  const authTest = {
    shouldUseSupabase: process.env.NEXT_PUBLIC_USE_AUTH === 'true',
    isDevMode: process.env.NEXT_PUBLIC_USE_AUTH === 'false',
    authModeDetected: process.env.NEXT_PUBLIC_USE_AUTH === 'true' ? 'supabase' : 
                      process.env.NEXT_PUBLIC_USE_AUTH === 'false' ? 'dev' : 'unknown',
  }
  
  return NextResponse.json({
    envVars,
    authTest,
    timestamp: new Date().toISOString(),
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    }
  })
}