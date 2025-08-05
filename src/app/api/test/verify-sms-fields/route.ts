import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { db } from '@/lib/db-edge'

export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    
    // Get all cleaners for this user
    const cleaners = await db.getCleaners(user.id)
    
    // Check SMS fields on each cleaner
    const cleanerFieldCheck = cleaners.map(cleaner => ({
      id: cleaner.id,
      name: cleaner.name,
      phone: cleaner.phone,
      hasSmsFields: {
        sms_opted_in: 'sms_opted_in' in cleaner,
        sms_opted_in_at: 'sms_opted_in_at' in cleaner,
        sms_opt_out_at: 'sms_opt_out_at' in cleaner,
        sms_invite_sent_at: 'sms_invite_sent_at' in cleaner,
        sms_invite_token: 'sms_invite_token' in cleaner,
      },
      smsValues: {
        sms_opted_in: cleaner.sms_opted_in ?? 'field missing',
        sms_opted_in_at: cleaner.sms_opted_in_at ?? 'field missing',
        sms_opt_out_at: cleaner.sms_opt_out_at ?? 'field missing',
        sms_invite_sent_at: cleaner.sms_invite_sent_at ?? 'field missing',
        sms_invite_token: cleaner.sms_invite_token ?? 'field missing',
      }
    }))
    
    // Get the first cleaner with a phone number for testing
    const testCleaner = cleaners.find(c => c.phone)
    
    return NextResponse.json({
      success: true,
      totalCleaners: cleaners.length,
      cleanersWithPhone: cleaners.filter(c => c.phone).length,
      cleanerFieldCheck,
      testCleanerId: testCleaner?.id,
      allHaveSmsFields: cleanerFieldCheck.every(c => 
        Object.values(c.hasSmsFields).every(has => has === true)
      ),
      recommendation: cleanerFieldCheck.some(c => 
        Object.values(c.hasSmsFields).some(has => has === false)
      ) ? 'Run the SMS migration script in Supabase SQL Editor' : 'All SMS fields present - ready to send invites!'
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}