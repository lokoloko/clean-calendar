import { format } from 'date-fns';

export interface ScheduleItem {
  id: string;
  listing_id: string;
  listing_name: string;
  cleaner_id: string;
  cleaner_name: string;
  check_in: string;
  check_out: string;
  checkout_time?: string;
  status: string;
  source?: string;
  manual_rule_frequency?: string;
}

// Helper to parse date strings as local dates (avoiding timezone issues)
export const parseLocalDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  
  // Handle both YYYY-MM-DD and YYYY-MM-DDTHH:MM:SS formats
  const datePart = dateStr.split('T')[0];
  const parts = datePart.split('-');
  if (parts.length !== 3) {
    console.error('Invalid date format:', dateStr);
    return new Date();
  }
  const [year, month, day] = parts.map(Number);
  
  // Validate the date components
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    console.error('Invalid date string:', dateStr);
    return new Date();
  }
  
  return new Date(year, month - 1, day);
};

// Find the next check-in for a given listing
export const getNextCheckIn = (
  listingId: string, 
  currentCheckout: string, 
  currentBookingId: string,
  scheduleItems: ScheduleItem[]
): string => {
  try {
    const checkoutDateObj = parseLocalDate(currentCheckout);
    if (isNaN(checkoutDateObj.getTime())) {
      return 'Invalid date';
    }
    
    const checkoutDateStr = format(checkoutDateObj, 'yyyy-MM-dd');
    
    // Get the current item to check if it's a recurring manual cleaning
    const currentItem = scheduleItems.find(item => item.id === currentBookingId);
    const isRecurring = currentItem?.source === 'manual_recurring';
    
    // Look for a booking that checks in on the same day as this checkout
    const sameDay = scheduleItems.find(item => {
      if (item.listing_id !== listingId || item.id === currentBookingId) return false;
      const checkinDate = parseLocalDate(item.check_in);
      const checkinStr = !isNaN(checkinDate.getTime()) ? format(checkinDate, 'yyyy-MM-dd') : '';
      return checkinStr === checkoutDateStr;
    });
    
    if (sameDay) {
      return 'Same day';
    }
    
    // Find the next booking for this listing (excluding same-day turnarounds already found)
    const futureBookings = scheduleItems
      .filter(item => {
        if (item.listing_id !== listingId || item.id === currentBookingId) return false;
        const checkinDate = parseLocalDate(item.check_in);
        // Check-in must be after or on the checkout date
        return !isNaN(checkinDate.getTime()) && checkinDate >= checkoutDateObj;
      })
      .sort((a, b) => parseLocalDate(a.check_in).getTime() - parseLocalDate(b.check_in).getTime());
    
    if (futureBookings.length > 0) {
      const nextBooking = futureBookings[0];
      const nextCheckin = parseLocalDate(nextBooking.check_in);
      const daysUntil = Math.ceil((nextCheckin.getTime() - checkoutDateObj.getTime()) / (1000 * 60 * 60 * 24));
      
      // For recurring manual cleanings, use the manual rule frequency if available
      if (isRecurring && nextBooking.source === 'manual_recurring') {
        // If we have the manual rule frequency, use it
        if (currentItem?.manual_rule_frequency) {
          switch (currentItem.manual_rule_frequency) {
            case 'monthly':
              return 'Monthly';
            case 'weekly':
              return 'Weekly';
            case 'biweekly':
              return 'Biweekly';
            case 'daily':
              return 'Daily';
            default:
              // Fall back to date-based detection
              break;
          }
        }
        
        // Fall back to date-based pattern detection if no rule frequency
        // Check if it's approximately monthly (28-31 days)
        if (daysUntil >= 28 && daysUntil <= 31) {
          return 'Monthly';
        }
        // Check if it's biweekly (14 days)
        else if (daysUntil === 14) {
          return 'Biweekly';
        }
        // Check if it's weekly (7 days)
        else if (daysUntil === 7) {
          return 'Weekly';
        }
      }
      
      if (daysUntil === 0) {
        return 'Same day';
      } else if (daysUntil === 1) {
        return 'Next day';
      } else if (daysUntil === 2) {
        return '2 days later';
      } else if (daysUntil === 3) {
        return '3 days later';
      } else if (daysUntil === 4) {
        return '4 days later';
      } else if (daysUntil === 5) {
        return '5 days later';
      } else if (daysUntil === 6) {
        return '6 days later';
      } else if (daysUntil === 7) {
        return '1 week later';
      } else if (daysUntil <= 14) {
        return `${daysUntil} days later`;
      } else if (daysUntil >= 28 && daysUntil <= 31) {
        return '~1 month later';
      } else {
        return format(nextCheckin, 'MMM d');
      }
    }
    
    // For recurring cleanings with no future bookings, indicate the pattern
    if (isRecurring) {
      return 'Recurring';
    }
    
    return 'No upcoming';
  } catch (error) {
    console.error('Error in getNextCheckIn:', error, { listingId, currentCheckout });
    return 'Error';
  }
};

export interface ExportOptions {
  cleanerId: string;
  startDate: Date;
  endDate: Date;
  exportType: 'today' | 'range';
  scheduleItems: ScheduleItem[];
  smsMode?: boolean;
  hostName?: string;
}

export const generateExportForCleaner = (options: ExportOptions): string => {
  const { cleanerId, startDate, endDate, exportType, scheduleItems, smsMode, hostName } = options;
  
  // Filter schedule items for the selected cleaner and date range, excluding cancelled bookings
  const cleanerItems = scheduleItems.filter(item => {
    if (item.cleaner_id !== cleanerId) return false;
    if (item.status === 'cancelled') {
      console.log('Excluding cancelled booking:', item.listing_name, item.check_out);
      return false; // Exclude cancelled bookings
    }
    const checkoutDate = parseLocalDate(item.check_out);
    const checkoutDateStr = format(checkoutDate, 'yyyy-MM-dd');
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');
    return checkoutDateStr >= startDateStr && checkoutDateStr <= endDateStr;
  });

  // Group items by date
  const itemsByDate = new Map<string, ScheduleItem[]>();
  cleanerItems.forEach(item => {
    const dateKey = format(parseLocalDate(item.check_out), 'yyyy-MM-dd');
    if (!itemsByDate.has(dateKey)) {
      itemsByDate.set(dateKey, []);
    }
    itemsByDate.get(dateKey)!.push(item);
  });

  // Generate text for each day in range
  let exportText = '';
  
  // Add header with date range for multi-day exports
  if (exportType === 'range' && !smsMode) {
    exportText += `Schedule for ${format(startDate, 'MMMM d')} - ${format(endDate, 'MMMM d, yyyy')}:\n\n`;
  } else if (exportType === 'range' && smsMode && hostName) {
    // SMS weekly format with host name
    exportText += `${hostName} (${format(startDate, 'MMM d')}-${format(endDate, 'd')}):\n`;
  }
  
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dateKey = format(currentDate, 'yyyy-MM-dd');
    const dayItems = itemsByDate.get(dateKey) || [];
    
    // Skip days with no cleanings (for both SMS and regular exports)
    if (dayItems.length === 0) {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }
    
    // Format day header
    if (smsMode) {
      if (dayItems.length > 0) {
        exportText += `${format(currentDate, 'EEE d')}: `;
      }
    } else if (exportType === 'today' && format(currentDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')) {
      exportText += `Today's Cleanings - ${format(currentDate, 'MMMM d')}:\n`;
    } else {
      exportText += `${format(currentDate, 'EEEE, MMMM d')}:\n`;
    }
    
    // Format items (we already skip days with no cleanings above)
    if (smsMode) {
      // SMS mode: compact format
      const propertyNames = dayItems.map(item => item.listing_name);
      if (propertyNames.length > 1) {
        exportText += propertyNames.join(' & ');
      } else {
        exportText += propertyNames[0];
      }
      exportText += '\n';
    } else {
      // Regular mode: detailed format
      dayItems.forEach(item => {
        const nextCheckIn = getNextCheckIn(item.listing_id, item.check_out, item.id, scheduleItems);
        exportText += `${item.listing_name}`;
        
        // Handle different types of schedules
        if (item.source === 'manual_recurring' && item.manual_rule_frequency) {
          // For recurring manual schedules, show the frequency
          const frequencyMap: Record<string, string> = {
            'daily': 'Daily cleaning',
            'weekly': 'Weekly cleaning',
            'biweekly': 'Biweekly cleaning',
            'monthly': 'Monthly cleaning'
          };
          exportText += ` - ${frequencyMap[item.manual_rule_frequency] || item.manual_rule_frequency}`;
        } else if (nextCheckIn === 'Same day' || nextCheckIn === 'Next day' || nextCheckIn === 'No upcoming') {
          exportText += ` - ${nextCheckIn}`;
        } else if (['Monthly', 'Weekly', 'Biweekly', 'Daily', 'Recurring'].includes(nextCheckIn)) {
          // Handle recurring patterns detected by getNextCheckIn
          exportText += ` - ${nextCheckIn} cleaning`;
        } else {
          exportText += ` - Next Cleaning: ${nextCheckIn}`;
        }
        
        exportText += '\n';
      });
    }
    
    if (!smsMode) {
      exportText += '\n';
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return exportText.trim();
};