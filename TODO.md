# CleanSweep Scheduler - TODO List

## Medium Priority

### 1. SMS Integration for Code Sending
- **Status**: Pending
- **Description**: Complete Twilio setup for production SMS sending
- **Current State**: Using mock authentication with 'mock-token' bypass
- **Implementation Details**:
  - Set up Twilio account and get credentials
  - Add environment variables for Twilio (Account SID, Auth Token, Phone Number)
  - Implement actual SMS sending in `/api/cleaner/auth/send-code`
  - Remove mock authentication bypass in production
  - Add rate limiting to prevent SMS spam
  - Handle SMS delivery failures gracefully

### 2. Settings Page Save Functionality
- **Status**: Pending
- **Description**: Make the settings page functional for saving preferences
- **Current State**: UI is built but save functionality not implemented
- **Features to Save**:
  - Daily sync time preference
  - Notification preferences (email/SMS)
  - Default cleaning duration
  - Default checkout time
  - Auto-assignment rules
- **Implementation**:
  - Create settings table in database
  - Add API endpoints for settings CRUD
  - Persist settings per user
  - Apply settings throughout the app

### 3. Stats Page Timezone-Aware Date Calculations
- **Status**: Pending
- **Description**: Fix timezone issues in statistics calculations
- **Current Issue**: Stats may be incorrect for properties in different timezones
- **Fix Required**:
  - Convert all dates to property timezone before calculations
  - Handle month boundaries correctly across timezones
  - Ensure occupancy rates account for timezone differences
  - Fix revenue calculations for timezone-aware date ranges

## Low Priority

### 1. Conflict Detection for Manual Schedules
- **Status**: Pending
- **Description**: Warn about scheduling conflicts when creating manual cleanings

#### Types of Conflicts to Detect:

**1. Double-booking Conflicts**
- Attempting to schedule manual cleaning on a date with existing Airbnb checkout
- Two manual cleanings scheduled for same property on same day
- Show warning: "This property already has a cleaning scheduled on [date]"

**2. Overlapping Recurring Schedules**
- Creating recurring schedule that conflicts with existing bookings
- Example: Weekly cleaning on Saturdays, but Airbnb checkout on specific Saturday
- Implementation: Check all generated dates against existing schedule

**3. Cleaner Availability Conflicts**
- Same cleaner assigned to multiple properties at overlapping times
- Critical for same-day turnarounds
- Warning: "Jane is already assigned to [Property] at [time]"

**4. Time-based Conflicts**
- Properties too far apart for back-to-back cleanings
- Same-day turnarounds with insufficient time
- Could integrate with mapping API for travel time estimates

#### Implementation Approach:
- Add conflict checking API endpoint
- Show warning dialog before saving
- Highlight conflicting dates in red on calendar
- List specific conflicts with details
- Allow override with confirmation ("Schedule anyway?")
- Add visual indicators in calendar views

### 2. Remove Cleaner Edit Page
- **Status**: Pending
- **Description**: Remove the dedicated edit page since inline editing is implemented
- **Files to Remove**:
  - `/src/app/cleaners/[id]/edit/page.tsx`
  - Any associated components
- **Update**: Remove edit links/buttons that navigate to the edit page

## Future Enhancements

### High Value Features
1. **Multi-property Conflict View**
   - Dashboard showing all conflicts across properties
   - Bulk conflict resolution tools

2. **Smart Scheduling Assistant**
   - AI-powered optimal schedule suggestions
   - Automatic conflict resolution proposals
   - Load balancing across cleaners

3. **Travel Time Integration**
   - Google Maps API for accurate travel times
   - Buffer time calculations between properties
   - Route optimization for cleaners

4. **Cleaner Capacity Management**
   - Set max properties per day per cleaner
   - Track cleaner performance metrics
   - Automatic workload distribution

### Integration Features
1. **Calendar App Integration**
   - Sync with Google Calendar/Outlook
   - Two-way sync for cleaner schedules
   - Mobile calendar notifications

2. **Payment Integration**
   - Track cleaner payments
   - Invoice generation
   - Payment history

3. **Guest Communication**
   - Automated checkout reminders
   - Cleaning completion notifications
   - Special instruction handling

## Completed Features (for reference)
- ✅ Airbnb calendar synchronization
- ✅ Manual property support
- ✅ Recurring cleaning schedules
- ✅ Mobile cleaner portal with SMS auth
- ✅ Visual feedback cues for cleaners
- ✅ Export functionality
- ✅ Calendar views (list, weekly, monthly)
- ✅ Sorting for listings page

## Notes
- All dates/times should respect property timezones
- Maintain data integrity with soft deletes
- Prioritize mobile experience for cleaner features
- Keep authentication simple but secure

Last Updated: July 17, 2025