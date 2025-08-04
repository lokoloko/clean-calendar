import twilio from 'twilio';

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

// Only initialize if we have the required environment variables
const twilioClient = accountSid && authToken ? twilio(accountSid, authToken) : null;

export async function sendSMS(phoneNumber: string, message: string): Promise<void> {
  // In development or if Twilio is not configured, just log the message
  if (!twilioClient || !fromNumber) {
    console.log(`[SMS MOCK] To: +1${phoneNumber}`);
    console.log(`[SMS MOCK] Message: ${message}`);
    return;
  }

  try {
    // Send actual SMS via Twilio
    const result = await twilioClient.messages.create({
      body: message,
      to: `+1${phoneNumber}`, // Assumes US numbers
      from: fromNumber
    });

    console.log(`[SMS SENT] SID: ${result.sid}, To: ${result.to}`);
  } catch (error) {
    console.error('[SMS ERROR]', error);
    throw new Error('Failed to send SMS');
  }
}

// Validate phone number format (US 10-digit)
export function validatePhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10 && cleaned[0] !== '0' && cleaned[0] !== '1';
}

// Format phone number for display
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length !== 10) return phone;
  
  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
}