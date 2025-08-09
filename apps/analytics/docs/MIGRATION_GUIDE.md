# Database Migration Guide

## Overview
This guide provides step-by-step instructions for migrating the GoStudioM Analytics Platform from localStorage to a production PostgreSQL database using Supabase.

## Prerequisites
- Supabase account and project created
- Database connection credentials
- Admin access to run migrations

## Migration Steps

### 1. Set Up Supabase Project

#### Create a new Supabase project:
1. Go to [https://supabase.com](https://supabase.com)
2. Create a new project
3. Note down your project credentials:
   - Project URL: `https://[PROJECT_REF].supabase.co`
   - Anon Key: Found in Settings > API
   - Database URL: Found in Settings > Database

### 2. Configure Environment Variables

Update your `.env.local` file:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
```

### 3. Run Database Migration

#### Option A: Using Supabase Dashboard
1. Navigate to SQL Editor in Supabase Dashboard
2. Copy the contents of `supabase/migrations/001_analytics_schema.sql`
3. Paste and run the migration
4. Verify with `verify_schema.sql`

#### Option B: Using Supabase CLI
```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref [PROJECT_REF]

# Run migration
supabase db push

# Or run specific migration file
supabase db execute -f supabase/migrations/001_analytics_schema.sql
```

#### Option C: Using psql
```bash
# Connect to database
psql postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres

# Run migration
\i supabase/migrations/001_analytics_schema.sql

# Verify
\i supabase/migrations/verify_schema.sql
```

### 4. Verify Migration

Run the verification script to ensure all tables, indexes, and policies are created:

```sql
-- In Supabase SQL Editor, run:
-- Contents of verify_schema.sql
```

Expected output:
- ✓ All 6 tables created
- ✓ All indexes created
- ✓ RLS enabled on all tables
- ✓ All policies created

### 5. Update Application Code

#### Remove localStorage dependencies:

1. Update imports in components:
```typescript
// Before
import { PropertyStore } from '@/lib/storage/property-store'

// After
import { PropertyStore } from '@/lib/storage/property-store-new'
```

2. Update all synchronous calls to async:
```typescript
// Before
const properties = PropertyStore.getAll()

// After
const properties = await PropertyStore.getAll()
```

3. Update components to handle async operations:
```typescript
// Use the custom hook for React components
import { usePropertyStore } from '@/hooks/use-property-store'

function MyComponent() {
  const { properties, loading, error, refresh } = usePropertyStore()
  
  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  
  return <div>{/* Your component */}</div>
}
```

### 6. Test the Migration

#### Basic functionality tests:
1. Upload PDF earnings report
2. Upload CSV transaction file
3. Create property from uploaded data
4. View property details
5. Sync with Airbnb
6. Generate insights

#### Performance tests:
- Load time for properties list
- Property detail page load
- Metrics calculation speed

### 7. Rollback (if needed)

If you need to rollback the migration:

```bash
# Run rollback script
psql postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres \
  -f supabase/migrations/001_analytics_schema_rollback.sql
```

**WARNING**: Rollback will DELETE all data in the analytics schema!

## Data Structure Changes

### Key differences from localStorage:

1. **IDs**: Now using UUID strings instead of timestamp-based IDs
2. **Dates**: All timestamps stored as TIMESTAMPTZ in UTC
3. **User Association**: All data linked to authenticated user
4. **Async Operations**: All operations are now asynchronous

### Data type mappings:

| localStorage | Database | Notes |
|-------------|----------|--------|
| `Date` objects | `TIMESTAMPTZ` | Stored in UTC |
| Numbers | `DECIMAL(12,2)` | For currency |
| Percentages | `DECIMAL(5,2)` | 0-100 range |
| Complex objects | `JSONB` | For flexible data |
| Arrays | `TEXT[]` or `JSONB` | Depending on use case |

## Security Considerations

### Row Level Security (RLS)
- All tables have RLS enabled
- Users can only access their own data
- Policies enforce data isolation

### Best Practices:
1. Never disable RLS in production
2. Use service role key only for admin operations
3. Always authenticate users before data access
4. Validate all input data before storage

## Performance Optimization

### Database indexes created:
- User ID lookups
- Property name searches
- Time-based queries
- Metric period lookups

### Caching strategy:
- 5-minute cache for property lists
- Invalidate on updates
- Use database views for complex queries

## Monitoring

### Check database performance:
```sql
-- Table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'analytics'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Slow queries
SELECT 
    query,
    calls,
    mean_exec_time,
    total_exec_time
FROM pg_stat_statements
WHERE query LIKE '%analytics%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

## Troubleshooting

### Common issues:

1. **"User not authenticated" error**
   - Ensure Supabase client is properly initialized
   - Check auth token is valid
   - Verify RLS policies

2. **Slow queries**
   - Check indexes are being used
   - Consider adding specific indexes
   - Use EXPLAIN ANALYZE for query plans

3. **Data not appearing**
   - Verify RLS policies
   - Check user_id associations
   - Ensure proper authentication

## Support

For issues or questions:
1. Check Supabase logs in Dashboard > Logs
2. Review RLS policies in Database > Policies
3. Test queries in SQL Editor

## Next Steps

After successful migration:
1. Remove localStorage code completely
2. Delete migration UI components
3. Update documentation
4. Set up automated backups
5. Configure monitoring alerts