// Server-only Twilio functionality
import twilio from 'twilio';
import { validatePhoneNumber, normalizePhoneNumber } from './phone-utils';

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

// Log Twilio configuration status (for debugging)
console.log('[Twilio Init]', {
  hasAccountSid: !!accountSid,
  hasAuthToken: !!authToken,
  hasFromNumber: !!fromNumber,
  fromNumberPreview: fromNumber ? fromNumber.substring(0, 7) + '...' : 'not set'
});

// Only initialize if we have the required environment variables
const twilioClient = accountSid && authToken ? twilio(accountSid, authToken) : null;

export async function sendSMS(phoneNumber: string, message: string): Promise<void> {
  // Normalize the phone number
  const normalizedNumber = normalizePhoneNumber(phoneNumber);
  
  // Validate the phone number
  if (!validatePhoneNumber(normalizedNumber)) {
    throw new Error('Invalid phone number. Must be 10 digits.');
  }
  
  // In development or if Twilio is not configured, just log the message
  if (!twilioClient || !fromNumber) {
    console.log(`[SMS MOCK] To: +1${normalizedNumber}`);
    console.log(`[SMS MOCK] Message: ${message}`);
    return;
  }

  try {
    // Send actual SMS via Twilio
    const result = await twilioClient.messages.create({
      body: message,
      to: `+1${normalizedNumber}`, // Add North American prefix
      from: fromNumber
    });

    console.log(`[SMS SENT] SID: ${result.sid}, To: ${result.to}`);
  } catch (error) {
    console.error('[SMS ERROR]', error);
    throw new Error('Failed to send SMS');
  }
}