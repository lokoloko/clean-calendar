# Public User Flow Documentation

This document describes the complete flow for public (non-authenticated) users who discover CleanSweep Scheduler and want to import their Airbnb calendar.

## Overview

The public user flow allows potential users to preview calendar data before signing up, providing immediate value and encouraging registration.

## Flow Steps

### 1. Landing Page Discovery
**Location**: `/` (home page)

- User lands on the public homepage
- Sees the calendar URL input field with "Try it Now" messaging
- Can paste an Airbnb ICS calendar URL to preview data

### 2. Calendar Preview
**Location**: `/` (home page with preview data)

- User enters ICS URL and clicks "Preview Calendar"
- System fetches and parses the calendar data
- Displays preview with:
  - Property statistics (bookings, occupancy, revenue)
  - Sample upcoming cleanings
  - Visual calendar preview
- URL is stored in `sessionStorage` as `pendingCalendarUrl`

### 3. Authentication Prompt
**Location**: `/` → OAuth flow

- User sees "Sign in to Continue" button after preview
- Clicking triggers Google OAuth authentication
- Calendar URL remains in sessionStorage during auth

### 4. Post-Login Redirect
**Location**: `/dashboard` → `/listings?import=URL`

- After successful login, user lands on dashboard
- Dashboard detects `pendingCalendarUrl` in sessionStorage
- Automatically redirects to `/listings?import=URL`
- Shows toast: "Calendar URL detected, redirecting to create your first listing..."

### 5. Listing Creation
**Location**: `/listings` (with Add Listing modal open)

- Add Listing modal opens automatically
- ICS URL field is pre-populated with the imported URL
- User completes listing details:
  - Property name
  - Cleaning fee
  - Timezone
- On save, auto-sync is triggered

### 6. Auto-Sync Behavior
**Location**: Backend process

#### If No Cleaners Exist:
- Listing is created successfully
- Sync is skipped with message: "Calendar sync will start automatically after you add cleaners and assign them to this listing."
- User is guided to add cleaners first

#### If Cleaners Exist but Not Assigned:
- Listing is created successfully
- Sync attempt returns: "Calendar data fetched but no schedule items created. Please assign a cleaner first."
- User needs to assign cleaners in the Assignments page

#### If Cleaners Exist and Assigned:
- Full sync executes immediately
- Schedule items are created from ICS data
- User sees populated schedule

### 7. Complete Setup
**Next Steps**:
1. Add cleaners (if not done): `/cleaners`
2. Assign cleaners to listing: `/assignments`
3. View synced schedule: `/schedule`
4. Configure settings: `/settings`

## Key Technical Details

### Session Storage
```javascript
// Set on preview
sessionStorage.setItem('pendingCalendarUrl', calendarUrl);

// Read on dashboard
const pendingUrl = sessionStorage.getItem('pendingCalendarUrl');

// Clear after use
sessionStorage.removeItem('pendingCalendarUrl');
```

### Auto-Sync Logic
```javascript
// Triggered on listing creation if:
listing.is_active_on_airbnb && listing.ics_url && hasCleaners

// Triggered on listing update if:
(icsUrlChanged || becameActive) && listing.ics_url
```

### Sync Filtering
- **Old behavior**: Only synced listings with `is_active_on_airbnb = true`
- **New behavior**: Syncs ANY listing with an ICS URL
- Prevents "No active Airbnb listings found" error

## Error Handling

### Common Issues and Solutions

1. **Invalid ICS URL**
   - Preview shows error message
   - User can correct URL and try again

2. **No Cleaners for Sync**
   - Clear guidance provided
   - Sync will work after cleaners are added

3. **Authentication Fails**
   - Calendar URL preserved in sessionStorage
   - User can retry authentication

## Benefits of This Flow

1. **Immediate Value**: Users see their data before signing up
2. **Smooth Onboarding**: URL carries through entire signup process
3. **Smart Sync**: Attempts sync but handles missing dependencies gracefully
4. **Clear Guidance**: Each step provides next actions

## Related Documentation

- [Calendar Sync System](./CALENDAR_SYNC.md) - Technical sync details
- [Authentication Flow](../CLAUDE.md#authentication) - OAuth implementation
- [API Endpoints](../CLAUDE.md#key-features-and-routes) - Backend routes