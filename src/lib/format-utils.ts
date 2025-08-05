/**
 * Format a phone number for display
 * @param phone - Phone number (assumed to be 10 digits)
 * @returns Formatted phone number (###) ###-####
 */
export function formatPhoneForDisplay(phone: string | null | undefined): string {
  if (!phone) return ''
  
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '')
  
  // If not 10 digits, return as-is
  if (cleaned.length !== 10) return phone
  
  // Format as (###) ###-####
  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
}

/**
 * Format a time string to 12-hour format with AM/PM
 * @param time - Time string (e.g., "10:00:00", "10:00", "10:00 AM")
 * @returns Formatted time (e.g., "10:00 AM")
 */
export function formatTimeDisplay(time: string | null | undefined): string {
  if (!time) return ''
  
  // If already formatted with AM/PM, return as-is
  if (time.includes('AM') || time.includes('PM')) {
    return time
  }
  
  // Parse time parts
  const parts = time.split(':')
  if (parts.length < 2) return time
  
  let hours = parseInt(parts[0], 10)
  const minutes = parts[1]
  
  // Determine AM/PM
  const ampm = hours >= 12 ? 'PM' : 'AM'
  
  // Convert to 12-hour format
  if (hours > 12) {
    hours -= 12
  } else if (hours === 0) {
    hours = 12
  }
  
  return `${hours}:${minutes} ${ampm}`
}