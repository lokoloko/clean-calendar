# Scaling Considerations for GoStudioM Scheduler

## Overview

This document outlines the current limitations of the cron job synchronization system and provides guidance for scaling to thousands of users. No immediate action is required - this is for planning purposes.

## Current Implementation

The sync system currently:
- Runs every 3 hours via Vercel Cron
- Processes all listings sequentially in a single function
- Takes approximately 2.5 seconds per listing (ICS fetch + database operations)

## Breaking Points

### With Current Architecture

#### Vercel Function Timeouts
- **Hobby/Pro Plan**: 60-second maximum execution time
- **Enterprise Plan**: 300-second maximum execution time

#### Capacity by Sync Frequency

**Every 3 hours (current default):**
- ✅ Works well up to ~500 users with 3 listings each
- Each run has 180 minutes before the next run
- Sequential processing is acceptable

**Every hour (Pro tier proposal):**
- ⚠️ Breaks at ~20-30 users with 3-4 listings each
- 50 users × 4 listings = 500 seconds (8.3 minutes) - exceeds all timeouts
- Would require immediate refactoring

**Every 30 minutes (Enterprise tier):**
- 🚫 Current architecture cannot support this
- Would need complete redesign before offering

### Processing Time Calculations

```
Per listing: ~2.5 seconds
- ICS fetch: 1-2 seconds
- Parsing: 0.3 seconds  
- Database operations: 0.5 seconds
- Network latency: 0.2 seconds

Examples:
- 10 users × 3 listings = 75 seconds ❌ (exceeds 60s limit)
- 8 users × 3 listings = 60 seconds ⚠️ (at the limit)
- 6 users × 3 listings = 45 seconds ✅
```

## Scaling Phases

### Phase 1: MVP (0-50 users)
**Current implementation is sufficient**
- Keep 3-hour sync frequency
- Monitor performance metrics
- Track average processing time per listing

### Phase 2: Early Growth (50-200 users)
**Implement batch processing**

```javascript
// Pseudo-code for batch processing
const BATCH_SIZE = 10 // users per batch
const userBatches = chunk(activeUsers, BATCH_SIZE)

// Schedule batches across the hour
// :00 - Batch 1
// :05 - Batch 2
// :10 - Batch 3
// etc.
```

### Phase 3: Scale Up (200-1000 users)
**Queue-based architecture required**

```javascript
// Architecture overview
1. Cron job → Publishes sync tasks to queue
2. Multiple workers → Process queue items in parallel
3. Rate limiting → Respect Airbnb's limits
4. Caching → Store ICS ETags, skip unchanged calendars
```

**Technology options:**
- BullMQ with Redis
- Supabase Queue (when available)
- AWS SQS + Lambda
- Temporal.io for complex workflows

### Phase 4: Enterprise (1000+ users)
**Microservice architecture**
- Dedicated sync service
- Horizontal scaling with Kubernetes
- Event-driven architecture
- Real-time WebSocket updates

## Cost Projections

### At 1,000 users with hourly syncs:

**Current Architecture (would break):**
- Theoretical: 72,000 function invocations/day
- Vercel Pro: ~$300/month just for functions
- Supabase: Would need Team plan ($599/month)

**Optimized Architecture:**
- Queue workers: ~$100-200/month (cloud compute)
- Database: Supabase Pro ($25/month) could handle it
- Caching layer: ~$20/month (Redis)
- **Total: ~$150-250/month**

## Implementation Priorities

### When to refactor:

1. **Immediate (before launch):**
   - Add error handling for timeout scenarios
   - Implement basic retry logic
   - Add performance monitoring

2. **At 30 active users:**
   - Implement user batching
   - Add processing time metrics
   - Create admin dashboard for sync status

3. **At 100 active users:**
   - Move to queue-based processing
   - Implement caching layer
   - Add rate limiting

4. **At 500 active users:**
   - Dedicated infrastructure
   - Horizontal scaling
   - Real-time sync options

## Performance Optimizations

### Quick Wins (implement as needed):

1. **Parallel Processing per User**
   ```javascript
   // Instead of sequential
   for (const listing of userListings) {
     await syncListing(listing)
   }
   
   // Use parallel
   await Promise.all(
     userListings.map(listing => syncListing(listing))
   )
   ```

2. **ETag Caching**
   ```javascript
   // Store ICS ETag
   if (response.headers.etag === listing.last_etag) {
     return // Skip processing, nothing changed
   }
   ```

3. **Tiered Sync Frequency**
   - Free: Every 6 hours
   - Starter: Every 3 hours  
   - Pro: Every hour
   - Enterprise: Every 30 min (with proper architecture)

## Monitoring Requirements

### Key Metrics to Track:
- Average sync time per listing
- P95 sync time
- Timeout errors
- Failed syncs by reason
- Queue depth (when implemented)
- Active users with sync enabled

### Alerting Thresholds:
- Sync duration > 45 seconds
- Error rate > 5%
- Queue depth > 1000 items
- Any timeout errors

## Database Considerations

### Current indexes support up to ~10,000 users
Beyond that, consider:
- Partitioning schedule_items by date
- Read replicas for analytics queries
- Archiving old data (>6 months)
- Separate OLAP database for reporting

## Conclusion

The current implementation is a solid MVP but has clear scaling limits. The good news:
- These limits won't be hit immediately
- Refactoring path is well-understood
- Costs remain reasonable even at scale
- Each phase can be implemented incrementally

**Key takeaway**: Plan for queue-based processing before reaching 100 active users or offering hourly syncs.

---

*Last Updated: November 2025*
*Status: Information only - no immediate action required*