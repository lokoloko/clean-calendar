import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import twilio from 'twilio'

export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    
    if (!accountSid || !authToken) {
      return NextResponse.json({
        success: false,
        error: 'Twilio credentials not configured'
      })
    }
    
    const client = twilio(accountSid, authToken)
    
    // Get message details
    const messageId = 'SM62c55f101b801440ca29dc1c4a117886'
    let messageDetails = null
    let messageError = null
    
    try {
      messageDetails = await client.messages(messageId).fetch()
    } catch (error) {
      messageError = error instanceof Error ? error.message : 'Failed to fetch message'
    }
    
    // Get today's message count
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    let todayMessages = []
    try {
      todayMessages = await client.messages.list({
        from: process.env.TWILIO_PHONE_NUMBER,
        dateSentAfter: today,
        limit: 20
      })
    } catch (error) {
      console.error('Failed to fetch today messages:', error)
    }
    
    // Get phone number details
    let phoneNumberDetails = null
    try {
      const phoneNumbers = await client.incomingPhoneNumbers.list({
        phoneNumber: process.env.TWILIO_PHONE_NUMBER,
        limit: 1
      })
      phoneNumberDetails = phoneNumbers[0]
    } catch (error) {
      console.error('Failed to fetch phone number details:', error)
    }
    
    return NextResponse.json({
      success: true,
      diagnostic: {
        failedMessage: {
          sid: messageId,
          details: messageDetails,
          error: messageError
        },
        todayStats: {
          messagesSentToday: todayMessages.length,
          dailyLimit: 15,
          remainingToday: Math.max(0, 15 - todayMessages.length),
          messages: todayMessages.map(m => ({
            sid: m.sid,
            to: m.to,
            status: m.status,
            errorCode: m.errorCode,
            errorMessage: m.errorMessage,
            dateSent: m.dateSent
          }))
        },
        phoneNumber: {
          number: process.env.TWILIO_PHONE_NUMBER,
          details: phoneNumberDetails ? {
            friendlyName: phoneNumberDetails.friendlyName,
            capabilities: phoneNumberDetails.capabilities,
            bundleSid: phoneNumberDetails.bundleSid,
            status: phoneNumberDetails.status
          } : null
        },
        recommendations: [
          'If daily limit reached (15 msgs), wait until tomorrow',
          'Try sending to a different phone number/carrier',
          'Consider getting a Toll-Free number for better deliverability',
          'For production: Complete A2P 10DLC registration'
        ]
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}