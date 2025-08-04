import { generateExportForCleaner, type ScheduleItem } from './schedule-export';
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns';

interface NotificationOptions {
  cleanerId: string;
  cleanerName: string;
  scheduleItems: ScheduleItem[];
}

/**
 * Generate daily reminder message for a cleaner
 * Shows only today's cleanings
 */
export const generateDailyReminder = (options: NotificationOptions): string => {
  const { cleanerId, cleanerName, scheduleItems } = options;
  const today = new Date();
  
  const exportText = generateExportForCleaner({
    cleanerId,
    startDate: today,
    endDate: today,
    exportType: 'today',
    scheduleItems
  });
  
  // Add a greeting to the message
  const greeting = `Good morning ${cleanerName}! Here's your schedule for today:\n\n`;
  
  // If no cleanings, send a different message
  if (exportText.includes('No cleanings scheduled')) {
    return `Good morning ${cleanerName}! You have no cleanings scheduled for today. Enjoy your day off! 🌟`;
  }
  
  return greeting + exportText;
};

/**
 * Generate weekly schedule message for a cleaner
 * Shows the upcoming week's cleanings
 */
export const generateWeeklySchedule = (options: NotificationOptions): string => {
  const { cleanerId, cleanerName, scheduleItems } = options;
  
  // Get the start and end of the current week
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 0 }); // Sunday
  const weekEnd = endOfWeek(today, { weekStartsOn: 0 }); // Saturday
  
  const exportText = generateExportForCleaner({
    cleanerId,
    startDate: weekStart,
    endDate: weekEnd,
    exportType: 'range',
    scheduleItems
  });
  
  // Add a greeting to the message
  const greeting = `Hi ${cleanerName}! Here's your cleaning schedule for this week:\n\n`;
  
  // If no cleanings this week
  if (!exportText.includes('cleanings scheduled')) {
    return `Hi ${cleanerName}! You have no cleanings scheduled for this week (${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}). We'll notify you when new cleanings are assigned. 📅`;
  }
  
  return greeting + exportText + '\n\nHave a great week! 💪';
};

/**
 * Generate a custom date range schedule message
 * Useful for sending schedules for specific periods
 */
export const generateCustomSchedule = (
  options: NotificationOptions & { 
    startDate: Date; 
    endDate: Date; 
    customGreeting?: string;
  }
): string => {
  const { cleanerId, cleanerName, scheduleItems, startDate, endDate, customGreeting } = options;
  
  const exportText = generateExportForCleaner({
    cleanerId,
    startDate,
    endDate,
    exportType: 'range',
    scheduleItems
  });
  
  const defaultGreeting = `Hi ${cleanerName}! Here's your schedule for ${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d')}:\n\n`;
  const greeting = customGreeting || defaultGreeting;
  
  return greeting + exportText;
};

/**
 * Generate reminder for tomorrow's cleanings
 * Useful for evening reminders
 */
export const generateTomorrowReminder = (options: NotificationOptions): string => {
  const { cleanerId, cleanerName, scheduleItems } = options;
  const tomorrow = addDays(new Date(), 1);
  
  const exportText = generateExportForCleaner({
    cleanerId,
    startDate: tomorrow,
    endDate: tomorrow,
    exportType: 'today',
    scheduleItems
  });
  
  // Custom formatting for tomorrow
  const formattedExport = exportText.replace(
    `Today's Cleanings - ${format(tomorrow, 'MMMM d')}:`,
    `Tomorrow's Cleanings - ${format(tomorrow, 'EEEE, MMMM d')}:`
  );
  
  const greeting = `Good evening ${cleanerName}! Here's a reminder for tomorrow:\n\n`;
  
  // If no cleanings tomorrow
  if (formattedExport.includes('No cleanings scheduled')) {
    return `Good evening ${cleanerName}! You have no cleanings scheduled for tomorrow. Sleep well! 😴`;
  }
  
  return greeting + formattedExport + '\n\nGet a good night\'s rest! 🌙';
};