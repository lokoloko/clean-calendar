# Calendar Sync System

This document describes the calendar synchronization system in CleanSweep Scheduler.

## Overview

The calendar sync system automatically fetches and updates cleaning schedules from Airbnb ICS calendar feeds. It runs every 3 hours via Vercel cron jobs and preserves all historical data.

## Architecture

### Sync Endpoints

1. **Cron Endpoint** (`/api/cron/sync-all`)
   - Secured with `CRON_SECRET` environment variable
   - Runs every 3 hours (0:00, 3:00, 6:00, etc.)
   - Currently optimized for single-user operation
   - No authentication required (uses API key instead)

2. **Manual Sync** (`/api/sync-all`)
   - Requires user authentication
   - Triggered by "Sync All" button on dashboard
   - Shows real-time progress and results

3. **Per-Listing Sync** (`/api/listings/[id]/sync`)
   - Syncs individual listings
   - Requires authentication
   - Used for immediate updates after changes

## Historical Data Preservation

The sync system preserves complete booking history:

### Tracked Changes
- **Cancellations**: Marked with `cancelled_at` timestamp and reason
- **Extensions**: Tracked with `is_extended` flag and `extension_count`
- **Modifications**: All changes stored in `modification_history` JSONB
- **Completions**: Past bookings automatically marked as completed

### Database Fields
```sql
-- Core tracking fields
cancelled_at TIMESTAMP WITH TIME ZONE
modification_history JSONB DEFAULT '[]'
is_extended BOOLEAN DEFAULT false
extension_notes TEXT
previous_check_out DATE
extension_count INTEGER DEFAULT 0
original_check_in DATE
original_check_out DATE
```

## Configuration

### Environment Variables
```bash
# Required for cron jobs
CRON_SECRET=your-secret-key  # Generate with: openssl rand -base64 32
```

### Vercel Cron Configuration
```json
{
  "crons": [
    {
      "path": "/api/cron/sync-all",
      "schedule": "0 */3 * * *"
    }
  ]
}
```

## Sync Process

1. **Fetch ICS Data**: Parse calendar feed from Airbnb
2. **Mark Completed**: Update past bookings to completed status
3. **Detect Cancellations**: Find bookings no longer in feed
4. **Update Existing**: Modify bookings with new dates
5. **Create New**: Add new bookings from feed
6. **Update Metadata**: Record sync time and history

## Scalability Considerations

### Current State (Single User)
- 17 listings × 8 syncs/day = 136 ICS fetches daily
- Sequential processing in single cron job
- Hardcoded user ID for simplicity

### Future Multi-Tenant Options

1. **Queue-Based System**
   - Use job queues for parallel processing
   - Scale horizontally with workers
   - Handle failures gracefully

2. **Manual Sync Only**
   - Remove automatic sync
   - Users trigger their own updates
   - Zero background load

3. **Tiered Frequencies**
   - Free: Daily sync
   - Premium: Hourly sync
   - Enterprise: Real-time

4. **Smart Optimization**
   - Only sync active listings
   - Skip if no upcoming bookings
   - Batch similar time zones

## Monitoring

### Dashboard Indicators
- "Sync All" button with spinner during sync
- Last sync time displayed (e.g., "2 hours ago")
- Success/failure counts in toast notifications

### Sync Results
```json
{
  "success": true,
  "summary": {
    "total": 17,
    "successful": 16,
    "failed": 0,
    "skipped": 1
  },
  "results": [...],
  "syncedAt": "2025-01-28T10:00:00Z"
}
```

## Troubleshooting

### Common Issues

1. **No Cleaner Assigned**
   - Sync skips listings without assigned cleaners
   - Assign cleaner in Assignments page

2. **Invalid ICS URL**
   - Check URL is accessible
   - Verify Airbnb calendar is public

3. **Cron Not Running**
   - Verify CRON_SECRET in Vercel env vars
   - Check Vercel function logs

### Manual Testing
```bash
# Test cron endpoint locally
curl -X POST http://localhost:9002/api/cron/sync-all \
  -H "Authorization: Bearer your-cron-secret"

# Test manual sync (requires auth)
curl -X POST http://localhost:9002/api/sync-all \
  -H "Cookie: your-auth-cookie"
```

## Best Practices

1. **Regular Monitoring**: Check sync status weekly
2. **Manual Sync**: Use for immediate updates after major changes
3. **Historical Analysis**: Use modification_history for insights
4. **Error Handling**: Monitor failed syncs in results

## Migration Notes

When migrating from old sync system:
1. Historical data is preserved
2. Cancellations tracked separately
3. Extensions counted automatically
4. No data loss during transition