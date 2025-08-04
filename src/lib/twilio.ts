import twilio from 'twilio';

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

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

// Validate phone number format (North American 10-digit)
export function validatePhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10 && cleaned[0] !== '0' && cleaned[0] !== '1';
}

// Format phone number for display
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  // Handle various lengths
  if (cleaned.length === 11 && cleaned[0] === '1') {
    // Remove country code 1
    return formatPhoneNumber(cleaned.slice(1));
  }
  
  if (cleaned.length !== 10) return phone;
  
  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
}

// Normalize phone number for storage/comparison
export function normalizePhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  // Remove country code if present
  if (cleaned.length === 11 && cleaned[0] === '1') {
    return cleaned.slice(1);
  }
  
  return cleaned;
}