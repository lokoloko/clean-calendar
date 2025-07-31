# Database Performance Optimization

## Overview

This document outlines the database performance optimizations implemented for GoStudioM Scheduler, including indexing strategies, connection pooling, and query optimization techniques.

## Index Strategy

### Primary Indexes

1. **User-based Lookups**
   - `idx_listings_user_id`: Fast user listing retrieval
   - `idx_cleaners_user_id`: Fast user cleaner retrieval
   - All tables with `user_id` have corresponding indexes

2. **Schedule Performance** (Most Critical)
   - `idx_schedule_check_out`: For date-based queries
   - `idx_schedule_listing_checkout`: Composite for listing schedules
   - `idx_schedule_cleaner_checkout`: Composite for cleaner schedules
   - `idx_schedule_completed`: Partial index for completed items

3. **Authentication & Sessions**
   - `idx_cleaner_sessions_token`: Fast session validation
   - `idx_auth_codes_unused`: Optimized for code verification
   - `idx_share_tokens_active`: Fast active token lookups

### Query Patterns Optimized

1. **Dashboard Queries**
   ```sql
   -- Optimized by idx_schedule_check_out and idx_schedule_completed
   SELECT * FROM schedule_items 
   WHERE check_out >= CURRENT_DATE 
   AND check_out <= CURRENT_DATE + INTERVAL '7 days'
   ```

2. **Cleaner Schedule Lookups**
   ```sql
   -- Optimized by idx_schedule_cleaner_checkout
   SELECT * FROM schedule_items 
   WHERE cleaner_id = ? 
   ORDER BY check_out ASC
   ```

3. **Feedback Statistics**
   ```sql
   -- Optimized by idx_feedback_rating and idx_feedback_created_at
   SELECT cleanliness_rating, COUNT(*) 
   FROM cleaner_feedback 
   WHERE created_at >= ? 
   GROUP BY cleanliness_rating
   ```

## Connection Pooling Configuration

### Production Settings
```javascript
{
  max: 20,              // Maximum connections
  min: 2,               // Minimum idle connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  statement_timeout: 30000,
  query_timeout: 30000
}
```

### Development Settings
```javascript
{
  max: 5,               // Lower for development
  min: 0,               // No idle connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
}
```

## Query Optimization Techniques

### 1. Batched Queries
The dashboard metrics endpoint uses a single transaction with parallel queries:
```javascript
const [listings, cleaners, schedule, ...] = await Promise.all([
  client.query(...),
  client.query(...),
  // etc
])
```

### 2. Caching Strategy
- Dashboard metrics cached for 1 minute using Next.js `unstable_cache`
- Reduces database load for frequently accessed data
- Cache invalidation on data mutations

### 3. Selective Fetching
- Only fetch required columns
- Use LIMIT clauses for dashboard widgets
- Implement pagination for large datasets

## Performance Monitoring

### Key Metrics to Track
1. **Query Duration**
   - Monitor slow queries > 100ms
   - Log queries > 1s for investigation

2. **Connection Pool Health**
   - Active connections
   - Waiting requests
   - Pool errors

3. **Cache Hit Rates**
   - Dashboard metrics cache
   - Static data caches

### Database Statistics
Run `ANALYZE` after significant data changes:
```sql
ANALYZE public.schedule_items;
ANALYZE public.cleaner_feedback;
```

## Scaling Considerations

### Current Limits
- Sequential calendar sync: ~20-30 users with hourly syncs
- Dashboard queries: Optimized for up to 10,000 schedule items

### Future Optimizations
1. **Implement Queue System** (at 50+ users)
   - Bull or similar for background jobs
   - Parallel calendar syncing

2. **Add Read Replicas** (at 100+ users)
   - Separate read/write connections
   - Load balance read queries

3. **Implement Materialized Views** (at 500+ users)
   - Pre-computed dashboard metrics
   - Hourly refresh for statistics

## Maintenance Tasks

### Weekly
- Check slow query logs
- Review connection pool metrics
- Update table statistics if needed

### Monthly
- Review index usage with `pg_stat_user_indexes`
- Remove unused indexes
- Vacuum tables to reclaim space

### Quarterly
- Full database analysis
- Index reorganization if needed
- Performance baseline comparison