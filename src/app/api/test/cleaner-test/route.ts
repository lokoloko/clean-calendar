import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { db } from '@/lib/db-edge'

export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    
    // Test getting a specific cleaner
    const cleanerId = '3ba70f5e-983a-43d3-8c14-e567d480b76c'
    
    let cleanerData = null
    let error = null
    
    try {
      cleanerData = await db.getCleaner(cleanerId)
    } catch (e) {
      error = e instanceof Error ? e.message : 'Unknown error'
    }
    
    return NextResponse.json({
      success: !error,
      cleanerId,
      cleaner: cleanerData,
      error,
      cleanerFields: cleanerData ? Object.keys(cleanerData) : null,
      smsFields: cleanerData ? {
        sms_opted_in: cleanerData.sms_opted_in,
        sms_invite_sent_at: cleanerData.sms_invite_sent_at,
        sms_invite_token: cleanerData.sms_invite_token,
        sms_opted_in_at: cleanerData.sms_opted_in_at,
        sms_opt_out_at: cleanerData.sms_opt_out_at
      } : null
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}