// Client-safe phone number utilities

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