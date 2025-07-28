import { NextResponse } from 'next/server';
import { parseICSFromURL } from '@/lib/ics-parser';
import { differenceInDays, addDays, format } from 'date-fns';

// Rate limiting - simple in-memory store (in production, use Redis)
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // 10 requests per hour per IP
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(ip);
  
  if (!record || record.resetTime < now) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }
  
  if (record.count >= RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
}

export async function POST(request: Request) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const { calendarUrl } = await request.json();

    if (!calendarUrl) {
      return NextResponse.json(
        { error: 'Calendar URL is required' },
        { status: 400 }
      );
    }

    // Validate Airbnb URL format
    const airbnbRegex = /^https:\/\/(www\.)?airbnb\.(com|[a-z]{2})\/calendar\/ical\/.+\.ics(\?.*)?$/i;
    if (!airbnbRegex.test(calendarUrl)) {
      return NextResponse.json(
        { error: 'Please provide a valid Airbnb calendar URL ending in .ics' },
        { status: 400 }
      );
    }

    // Parse the calendar
    const bookings = await parseICSFromURL(calendarUrl);
    
    // Filter to only future bookings
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const futureBookings = bookings.filter(booking => booking.checkOut >= today);
    
    // Limit to next 30 days
    const thirtyDaysFromNow = addDays(today, 30);
    const next30DaysBookings = futureBookings.filter(
      booking => booking.checkOut <= thirtyDaysFromNow
    );

    // Calculate metrics
    const sameDayTurnovers = next30DaysBookings.filter((booking, index) => {
      if (index === next30DaysBookings.length - 1) return false;
      const nextBooking = next30DaysBookings[index + 1];
      return format(booking.checkOut, 'yyyy-MM-dd') === format(nextBooking.checkIn, 'yyyy-MM-dd');
    }).length;

    // Calculate average turnover time
    let totalTurnoverDays = 0;
    let turnoverCount = 0;
    
    for (let i = 0; i < next30DaysBookings.length - 1; i++) {
      const current = next30DaysBookings[i];
      const next = next30DaysBookings[i + 1];
      const daysBetween = differenceInDays(next.checkIn, current.checkOut);
      if (daysBetween >= 0) {
        totalTurnoverDays += daysBetween;
        turnoverCount++;
      }
    }
    
    const avgTurnoverDays = turnoverCount > 0 
      ? (totalTurnoverDays / turnoverCount).toFixed(1) 
      : 'N/A';

    // Prepare preview data (limit to 5 bookings)
    const previewBookings = next30DaysBookings.slice(0, 5).map(booking => ({
      checkOut: format(booking.checkOut, 'MMM d, yyyy'),
      checkOutDay: format(booking.checkOut, 'EEEE'),
      guestName: booking.guestName || 'Guest',
      nights: differenceInDays(booking.checkOut, booking.checkIn),
      // Check if there's a same-day turnover
      sameDayTurnover: next30DaysBookings.some(b => 
        b !== booking && 
        format(b.checkIn, 'yyyy-MM-dd') === format(booking.checkOut, 'yyyy-MM-dd')
      )
    }));

    // Find the very next checkout
    const nextCheckout = futureBookings.length > 0 ? {
      date: format(futureBookings[0].checkOut, 'MMM d, yyyy'),
      guestName: futureBookings[0].guestName || 'Guest',
      daysFromNow: differenceInDays(futureBookings[0].checkOut, today)
    } : null;

    return NextResponse.json({
      success: true,
      stats: {
        totalBookings: next30DaysBookings.length,
        sameDayTurnovers,
        avgTurnoverDays,
        nextCheckout
      },
      preview: previewBookings,
      message: next30DaysBookings.length === 0 
        ? 'No upcoming bookings found in the next 30 days' 
        : `Found ${next30DaysBookings.length} upcoming bookings`
    });
  } catch (error) {
    console.error('Error previewing calendar:', error);
    
    // Check if it's a fetch error
    if (error instanceof Error && error.message.includes('fetch')) {
      return NextResponse.json(
        { error: 'Unable to access the calendar URL. Please check the link and try again.' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to preview calendar. Please check your URL and try again.' },
      { status: 500 }
    );
  }
}