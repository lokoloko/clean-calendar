/**
 * Centralized timezone configuration for North American properties
 */

export const NORTH_AMERICAN_TIMEZONES = [
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT/PDT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT/MDT)' },
  { value: 'America/Phoenix', label: 'Mountain Standard Time (MST)' },
  { value: 'America/Regina', label: 'Central Standard Time (CST)' },
  { value: 'America/Chicago', label: 'Central Time (CT/CDT)' },
  { value: 'America/New_York', label: 'Eastern Time (ET/EDT)' },
  { value: 'America/Halifax', label: 'Atlantic Time (AT/ADT)' },
  { value: 'America/St_Johns', label: 'Newfoundland Time (NT/NDT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT/AKDT)' }
] as const;

export const TIMEZONE_ABBREVIATIONS: Record<string, string> = {
  'America/New_York': 'ET',
  'America/Chicago': 'CT',
  'America/Denver': 'MT',
  'America/Los_Angeles': 'PT',
  'America/Phoenix': 'MST',
  'America/Regina': 'CST',
  'America/Halifax': 'AT',
  'America/St_Johns': 'NT',
  'Pacific/Honolulu': 'HST',
  'America/Anchorage': 'AKT'
};

export function getTimezoneAbbreviation(timezone: string): string {
  return TIMEZONE_ABBREVIATIONS[timezone] || timezone.split('/')[1];
}

// Default timezone for new listings
export const DEFAULT_TIMEZONE = 'America/New_York';