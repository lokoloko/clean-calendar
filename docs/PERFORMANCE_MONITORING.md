# Performance Monitoring Guide

## Overview

This guide outlines how to monitor and maintain optimal performance for CleanSweep in production.

## Key Performance Metrics

### 1. **Response Times**
- Target: <200ms for API calls
- Target: <100ms for database queries
- Target: <3s for initial page load

### 2. **Database Performance**
- Connection pool utilization: <80%
- Query execution time: <100ms average
- Index usage: >90% for common queries

### 3. **Cache Hit Rates**
- Listings/Cleaners: >95%
- Dashboard metrics: >90%
- Schedule data: >85%

## Monitoring Setup

### 1. Enable pg_stat_statements

```sql
-- Run in Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Configure settings
ALTER SYSTEM SET pg_stat_statements.track = 'all';
ALTER SYSTEM SET pg_stat_statements.max = 10000;
SELECT pg_reload_conf();
```

### 2. Create Monitoring Queries

```sql
-- Top 20 slowest queries
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  min_time,
  max_time
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_catalog%'
  AND query NOT LIKE '%information_schema%'
  AND mean_time > 100
ORDER BY mean_time DESC
LIMIT 20;

-- Index usage statistics
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Table size and bloat
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  n_live_tup,
  n_dead_tup,
  ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_pct
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 3. Application Monitoring

Add these environment variables for monitoring:

```env
# Enable query logging in development
LOG_QUERIES=true
SLOW_QUERY_THRESHOLD=100

# Connection pool monitoring
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
DATABASE_POOL_LOG=true
```

## Performance Checklist

### Daily Checks
- [ ] Check slow query log
- [ ] Monitor error rates
- [ ] Review cache hit rates
- [ ] Check connection pool usage

### Weekly Maintenance
- [ ] Run VACUUM ANALYZE on busy tables
- [ ] Review index usage
- [ ] Check for unused indexes
- [ ] Monitor table bloat

### Monthly Review
- [ ] Analyze query patterns
- [ ] Review and optimize slow queries
- [ ] Update indexes based on usage
- [ ] Plan capacity upgrades

## Common Performance Issues

### 1. **Slow Dashboard Load**
**Symptoms**: Dashboard takes >3s to load
**Solution**: 
- Check cache is working
- Ensure indexes exist on schedule_items
- Use optimized /api/dashboard/metrics endpoint

### 2. **Database Connection Errors**
**Symptoms**: "Too many connections" errors
**Solution**:
- Increase connection pool max
- Check for connection leaks
- Implement connection retry logic

### 3. **High Query Times**
**Symptoms**: Queries taking >500ms
**Solution**:
- Add missing indexes
- Optimize query structure
- Implement query result caching

## Optimization Scripts

### 1. Add Missing Indexes
```bash
# Apply performance indexes
supabase db push supabase/migrations/020_performance_indexes.sql
```

### 2. Analyze Tables
```sql
-- Run monthly
ANALYZE schedule_items;
ANALYZE bookings;
ANALYZE listings;
ANALYZE cleaners;
ANALYZE feedback;
```

### 3. Clean Up Old Data
```sql
-- Archive old schedule items (>6 months)
INSERT INTO schedule_items_archive
SELECT * FROM schedule_items
WHERE date < CURRENT_DATE - INTERVAL '6 months';

DELETE FROM schedule_items
WHERE date < CURRENT_DATE - INTERVAL '6 months';
```

## Monitoring Tools

### 1. **Supabase Dashboard**
- Query Performance tab
- Database Health metrics
- Connection pool status

### 2. **Application Logs**
- Structured logging with timing
- Slow query alerts
- Error tracking

### 3. **External Monitoring**
- Uptime monitoring (e.g., Pingdom)
- APM tools (e.g., New Relic, Datadog)
- Error tracking (e.g., Sentry)

## Alert Thresholds

Set up alerts for:
- Query time >500ms
- Error rate >1%
- Connection pool >80% utilized
- Cache hit rate <80%
- Database CPU >70%

## Performance SLAs

- API response time: p95 <500ms
- Database query time: p95 <200ms
- Uptime: 99.9%
- Error rate: <0.1%

## Troubleshooting Guide

### High Database CPU
1. Check for missing indexes
2. Look for table scans in slow queries
3. Review connection count
4. Check for long-running transactions

### Slow API Responses
1. Check cache hit rates
2. Review database query times
3. Look for N+1 query problems
4. Check external API calls

### Memory Issues
1. Review connection pool size
2. Check for memory leaks
3. Monitor Node.js heap usage
4. Review cache size limits

---

*Last Updated: 2025-07-30*
*Performance monitoring guide for production*