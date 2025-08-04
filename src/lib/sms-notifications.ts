import { format } from 'date-fns';
import { ScheduleItem } from './schedule-export';

interface SmsOptions {
  cleanerName: string;
  hostName: string;
  scheduleItems: ScheduleItem[];
}

/**
 * Format daily SMS reminder - only sent when there are cleanings
 * Keep under 160 characters
 */
export const formatDailySMS = (options: SmsOptions): string => {
  const { cleanerName, hostName, scheduleItems } = options;
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  
  // Filter today's cleanings
  const todayItems = scheduleItems.filter(item => {
    const checkoutDate = format(new Date(item.check_out), 'yyyy-MM-dd');
    return checkoutDate === todayStr && item.status !== 'cancelled';
  });
  
  if (todayItems.length === 0) {
    return ''; // Don't send SMS if no cleanings
  }
  
  // Sort by checkout time
  const sortedItems = todayItems.sort((a, b) => {
    const timeA = a.checkout_time || '11:00';
    const timeB = b.checkout_time || '11:00';
    return timeA.localeCompare(timeB);
  });
  
  let message = `${hostName}:\n`;
  
  sortedItems.forEach(item => {
    const time = item.checkout_time ? format(new Date(`2000-01-01T${item.checkout_time}`), 'h:mma').toLowerCase() : '11am';
    message += `${item.listing_name} - ${time}\n`;
  });
  
  return message.trim();
};

/**
 * Format weekly SMS schedule - overview for planning
 * Sent on Sundays, excludes days with no cleanings
 */
export const formatWeeklySMS = (options: SmsOptions): string => {
  const { cleanerName, hostName, scheduleItems } = options;
  const today = new Date();
  const weekStart = new Date(today);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 6);
  
  // Group cleanings by day
  const cleaningsByDay = new Map<string, string[]>();
  
  scheduleItems.forEach(item => {
    const checkoutDate = new Date(item.check_out);
    if (checkoutDate >= weekStart && checkoutDate <= weekEnd && item.status !== 'cancelled') {
      const dayKey = format(checkoutDate, 'EEE d');
      if (!cleaningsByDay.has(dayKey)) {
        cleaningsByDay.set(dayKey, []);
      }
      cleaningsByDay.get(dayKey)!.push(item.listing_name);
    }
  });
  
  if (cleaningsByDay.size === 0) {
    return ''; // Don't send if no cleanings this week
  }
  
  let message = `${hostName} (${format(weekStart, 'MMM d')}-${format(weekEnd, 'd')}):\n`;
  
  // Sort days and format
  const sortedDays = Array.from(cleaningsByDay.entries()).sort((a, b) => {
    const dateA = new Date(a[0].split(' ')[1]);
    const dateB = new Date(b[0].split(' ')[1]);
    return dateA.getTime() - dateB.getTime();
  });
  
  sortedDays.forEach(([day, properties]) => {
    // Combine multiple properties on same day
    if (properties.length > 1) {
      message += `${day}: ${properties.join(' & ')}\n`;
    } else {
      message += `${day}: ${properties[0]}\n`;
    }
  });
  
  return message.trim();
};

/**
 * Check if SMS should be sent based on opt-in status
 */
export const shouldSendSMS = (cleaner: any): boolean => {
  return !!(
    cleaner.phone && 
    cleaner.sms_opted_in && 
    !cleaner.sms_opt_out_at
  );
};

/**
 * Format time in SMS-friendly way
 */
export const formatSMSTime = (time: string): string => {
  try {
    return format(new Date(`2000-01-01T${time}`), 'h:mma').toLowerCase().replace(':00', '');
  } catch {
    return '11am';
  }
};