import ICAL from 'ical'
import { format, parseISO } from 'date-fns'

export interface ParsedBooking {
  uid: string
  summary: string
  guestName?: string
  checkIn: Date
  checkOut: Date
  description?: string
}

export async function parseICSFromURL(icsUrl: string): Promise<ParsedBooking[]> {
  try {
    const response = await fetch(icsUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch ICS file: ${response.statusText}`)
    }
    
    const icsData = await response.text()
    return parseICSData(icsData)
  } catch (error) {
    console.error('Error fetching ICS file:', error)
    throw new Error('Failed to fetch calendar data')
  }
}

export function parseICSData(icsData: string): ParsedBooking[] {
  const parsedData = ICAL.parseICS(icsData)
  const bookings: ParsedBooking[] = []

  for (const key in parsedData) {
    const event = parsedData[key]
    
    // Only process VEVENT components
    if (event.type !== 'VEVENT') continue
    
    // Skip cancelled events
    if (event.status === 'CANCELLED') {
      console.log(`Skipping cancelled event: ${event.summary} (UID: ${event.uid})`)
      continue
    }
    
    // Skip blocked dates or non-booking events
    if (event.summary?.toLowerCase().includes('blocked') || 
        event.summary?.toLowerCase().includes('not available')) {
      continue
    }

    if (!event.start || !event.end) {
      continue
    }

    const booking: ParsedBooking = {
      uid: event.uid || key,
      summary: event.summary || 'Booking',
      checkIn: new Date(event.start),
      checkOut: new Date(event.end),
      description: event.description,
    }

    // Try to extract guest name from summary
    // Airbnb format is usually "Guest Name (CONFIRMATION_CODE)"
    const guestMatch = event.summary?.match(/^([^(]+)\s*\(/)
    if (guestMatch) {
      booking.guestName = guestMatch[1].trim()
    }

    bookings.push(booking)
  }

  // Sort bookings by check-in date
  return bookings.sort((a, b) => a.checkIn.getTime() - b.checkIn.getTime())
}

export function getCheckoutTime(checkOut: Date): string {
  // Default checkout time is 11:00 AM
  return '11:00'
}