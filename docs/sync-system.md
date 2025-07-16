# Calendar Sync System

## Overview

CleanSweep Scheduler implements a robust calendar synchronization system that:
- Preserves historical booking data
- Tracks cancelled bookings
- Prevents duplicate entries
- Supports both manual and automatic syncing

## Sync Frequency

### Automatic Daily Sync
- **Schedule**: Daily at 6:00 AM UTC
- **Purpose**: Catch last-minute bookings that cleaners need to know about
- **Configuration**: Via `vercel.json` cron configuration (for Vercel deployments)

### Manual Sync Options
1. **Individual Listing**: Click "Sync Now" in the listings table
2. **All Listings**: Click "Sync All" button at the top of the listings page

## How Sync Works

### Data Preservation Strategy
1. **Historical Data**: Bookings that have already checked out are never deleted
2. **Cancelled Bookings**: When a booking disappears from the ICS feed, it's marked as "cancelled" with a timestamp
3. **Updates**: Existing bookings are updated if details change (guest name, dates, etc.)

### Technical Implementation

```sql
-- Unique constraint prevents duplicate bookings
ALTER TABLE schedule_items 
ADD CONSTRAINT schedule_items_booking_uid_unique UNIQUE (booking_uid);

-- Status tracking for bookings
status IN ('pending', 'confirmed', 'completed', 'cancelled')
```

### Sync Process Flow
1. Fetch current bookings from Airbnb ICS URL
2. Mark missing future bookings as "cancelled"
3. Insert new bookings or update existing ones
4. Update last_sync timestamp

## API Endpoints

### Sync Single Listing
```bash
POST /api/listings/{listing_id}/sync
```

### Sync All Listings
```bash
POST /api/sync-all

# Optional authentication header
Authorization: Bearer {SYNC_API_KEY}
```

## Setting Up External Cron Services

If not using Vercel, you can use external cron services:

### Option 1: cron-job.org
1. Create account at https://cron-job.org
2. Create new cron job:
   - URL: `https://your-domain.com/api/sync-all`
   - Schedule: `0 6 * * *` (6 AM UTC daily)
   - Method: POST
   - Headers: `Authorization: Bearer YOUR_SYNC_API_KEY`

### Option 2: GitHub Actions
```yaml
name: Daily Calendar Sync
on:
  schedule:
    - cron: '0 6 * * *'
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Calendar Sync
        run: |
          curl -X POST https://your-domain.com/api/sync-all \
            -H "Authorization: Bearer ${{ secrets.SYNC_API_KEY }}"
```

### Option 3: Self-Hosted Cron
```bash
# Add to crontab
0 6 * * * curl -X POST https://your-domain.com/api/sync-all -H "Authorization: Bearer YOUR_SYNC_API_KEY"
```

## Security

1. **API Key Protection**: Set `SYNC_API_KEY` environment variable to protect the sync-all endpoint
2. **Rate Limiting**: Consider implementing rate limiting for production
3. **Monitoring**: Check sync results regularly to ensure bookings are being captured

## Monitoring Sync Health

The sync-all endpoint returns detailed results:

```json
{
  "success": true,
  "summary": {
    "total": 5,
    "successful": 4,
    "failed": 0,
    "skipped": 1
  },
  "results": [
    {
      "listingId": "123",
      "listingName": "Beach House",
      "status": "success",
      "itemsCreated": 3,
      "itemsUpdated": 2,
      "totalBookings": 5
    }
  ],
  "syncedAt": "2024-07-15T06:00:00Z"
}
```

## Troubleshooting

### Common Issues
1. **No cleaner assigned**: Listings without assigned cleaners will be skipped
2. **Invalid ICS URL**: Check that the Airbnb calendar URL is accessible
3. **Duplicate bookings**: The unique constraint prevents duplicates automatically

### Checking Sync Status
- Green checkmark: Synced within last 24 hours
- Yellow warning: Never synced or sync is overdue
- View exact sync time by hovering over the status icon