# SMS Notification Timezone Implementation Plan

## Overview
This document outlines the approach for implementing timezone-aware SMS notifications in GoStudioM Scheduler. The system will send SMS notifications to cleaners at appropriate local times based on their assigned properties' timezones.

## Core Principle
**One Timezone Per Cleaner**: Each cleaner operates in a single timezone, determined by their assigned listings. This reflects real-world operations where cleaning companies serve local geographic areas.

## Implementation Strategy

### 1. Determining Cleaner's Timezone
```sql
-- Get cleaner's timezone from their first assigned listing
SELECT l.timezone 
FROM listings l
JOIN assignments a ON a.listing_id = l.id
WHERE a.cleaner_id = :cleanerId
LIMIT 1
```

### 2. Notification Scheduling Logic
When a user configures "Send daily reminders at 6:00 AM":
- System determines each cleaner's timezone from their assignments
- Schedules SMS for 6:00 AM in each cleaner's local timezone
- Stores scheduled time in `notification_schedule` table with proper timezone conversion

### 3. Example Flow
- **User Setting**: "Daily reminders at 6:00 AM"
- **Cleaner A** (Vancouver): Receives SMS at 6:00 AM PT
- **Cleaner B** (Toronto): Receives SMS at 6:00 AM ET
- **Cleaner C** (Calgary): Receives SMS at 6:00 AM MT

### 4. Database Schema
The existing `notification_schedule` table is already prepared:
```sql
CREATE TABLE notification_schedule (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  cleaner_id UUID,
  type VARCHAR(20), -- 'daily', 'weekly', 'feedback_reminder'
  scheduled_for TIMESTAMP WITH TIME ZONE, -- Stores in UTC
  sent_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20), -- 'pending', 'sent', 'failed'
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
```

## Implementation Steps

### Step 1: Create Notification Scheduling Cron Job
**Endpoint**: `/api/cron/schedule-notifications`
- Runs hourly
- For each user with notifications enabled:
  - Gets user's preferred notification time
  - For each cleaner:
    - Determines cleaner's timezone from assignments
    - Schedules notification for next occurrence at local time
    - Inserts into `notification_schedule` table

### Step 2: Create SMS Sending Cron Job
**Endpoint**: `/api/cron/send-notifications`
- Runs every 5 minutes
- Queries pending notifications: `WHERE status = 'pending' AND scheduled_for <= NOW()`
- For each notification:
  - Builds message with cleaner's schedule for the day
  - Sends SMS via Twilio
  - Updates status to 'sent' or 'failed'

### Step 3: Message Format
```
Good morning [Cleaner Name]! Your cleanings for today:

10:00 AM - 123 Main St (Checkout)
2:00 PM - 456 Oak Ave (Checkout)

Reply DONE after each cleaning.
```

## Edge Cases

### No Assignments
If a cleaner has no current assignments, skip scheduling notifications for them.

### Timezone Changes
If a listing's timezone is updated, the next scheduled notification will use the new timezone.

### Daylight Saving Time
PostgreSQL's `TIMESTAMP WITH TIME ZONE` handles DST transitions automatically.

## Dependencies
- Twilio SMS integration must be complete
- User must have active subscription with SMS enabled
- Cleaner must have valid phone number

## Future Enhancements
1. Add `preferred_timezone` field to cleaners table for explicit control
2. Allow per-cleaner notification time overrides
3. Support for notification preferences (SMS vs WhatsApp vs Email)
4. Configurable message templates

## Testing Considerations
1. Test with cleaners in different timezones
2. Verify DST transitions work correctly
3. Test with cleaners who have no assignments
4. Verify messages are sent at correct local times

## Performance Considerations
- Index on `notification_schedule(status, scheduled_for)` for efficient queries
- Batch SMS sending to avoid rate limits
- Use connection pooling for database queries