import type { Listing, Cleaner, Assignment, ScheduleItem } from '@/types';

export const mockCleaners: Cleaner[] = [
  { id: '1', name: 'Yolanda Vega', phone: '+1-202-555-0182', email: 'yolanda@email.com', listingsAssigned: 3 },
  { id: '2', name: 'John Smith', phone: '+1-202-555-0154', email: 'john.s@email.com', listingsAssigned: 1 },
  { id: '3', name: 'Maria Garcia', phone: '+1-202-555-0167', email: 'maria.g@email.com', listingsAssigned: 2 },
];

export const mockListings: Listing[] = [
  { id: '1', name: 'Monrovia A', icsUrl: 'https://example.com/calendar/monrovia_a.ics', assignedCleaners: ['Yolanda Vega'], cleaningFee: 75 },
  { id: '2', name: 'Downtown Loft', icsUrl: 'https://example.com/calendar/downtown.ics', assignedCleaners: ['Yolanda Vega', 'John Smith'], cleaningFee: 100 },
  { id: '3', name: 'Beachside Bungalow', icsUrl: 'https://example.com/calendar/beachside.ics', assignedCleaners: ['Maria Garcia'], cleaningFee: 125 },
  { id: '4', name: 'Mountain Cabin', icsUrl: 'https://example.com/calendar/cabin.ics', assignedCleaners: ['Yolanda Vega', 'Maria Garcia'], cleaningFee: 90 },
];

export const mockAssignments: Assignment[] = [
  { id: '1', listingName: 'Monrovia A', cleanerName: 'Yolanda Vega' },
  { id: '2', listingName: 'Downtown Loft', cleanerName: 'Yolanda Vega' },
  { id: '3', listingName: 'Downtown Loft', cleanerName: 'John Smith' },
  { id: '4', listingName: 'Beachside Bungalow', cleanerName: 'Maria Garcia' },
  { id: '5', listingName: 'Mountain Cabin', cleanerName: 'Yolanda Vega' },
  { id: '6', listingName: 'Mountain Cabin', cleanerName: 'Maria Garcia' },
];

export const mockSchedule: ScheduleItem[] = [
    { id: '1', date: 'June 17, 2024', property: 'Monrovia A', cleaner: 'Yolanda Vega', checkoutTime: '11:00 AM', notes: '-' },
    { id: '2', date: 'June 17, 2024', property: 'Downtown Loft', cleaner: 'John Smith', checkoutTime: '10:00 AM', notes: 'Guest requested late checkout' },
    { id: '3', date: 'June 18, 2024', property: 'Beachside Bungalow', cleaner: 'Maria Garcia', checkoutTime: '11:00 AM', notes: '-' },
    { id: '4', date: 'June 19, 2024', property: 'Mountain Cabin', cleaner: 'Yolanda Vega', checkoutTime: '12:00 PM', notes: 'Deep clean needed' },
    { id: '5', date: 'June 20, 2024', property: 'Monrovia A', cleaner: 'Yolanda Vega', checkoutTime: '11:00 AM', notes: '-' },
];
