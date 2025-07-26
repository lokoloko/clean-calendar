# Authentication Migration Plan

## Goal
Add proper authentication while preserving all existing data (listings, cleaners, schedule items, etc.)

## Current State
- All data is currently associated with a hardcoded dev user ID: `00000000-0000-0000-0000-000000000001`
- No actual authentication is implemented
- All requests use this single user context

## Migration Strategy

### Phase 1: Backup Current Data
Before making any changes, create a complete backup of your current database:

```bash
# Export all your current data
pg_dump $DATABASE_URL > backup_before_auth_$(date +%Y%m%d_%H%M%S).sql

# Or create a more structured backup
pg_dump $DATABASE_URL \
  --schema=public \
  --data-only \
  --format=custom \
  --file=clean_calendar_data_backup.dump
```

### Phase 2: Add Authentication Infrastructure
1. Set up Supabase Auth (or chosen auth provider)
2. Add auth middleware and context
3. Create login/signup pages
4. Keep dev mode as fallback initially

### Phase 3: Create Migration Script
Create a migration script that will:
1. Create a real user account for you
2. Update all existing records to belong to your new user ID
3. Maintain all relationships and data integrity

```sql
-- Example migration script
-- First, create your user account through the auth system
-- Then run this to claim all existing data:

-- Assuming your new user ID is 'YOUR-NEW-USER-ID'
UPDATE public.listings 
SET user_id = 'YOUR-NEW-USER-ID' 
WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- The schedule_items will automatically follow due to foreign key relationships
-- Cleaners are already linked to listings, so they're preserved
```

### Phase 4: Implement Dual-Mode Operation
1. Add environment variable: `USE_AUTH=true/false`
2. In development: Can use either auth or dev mode
3. In production: Always use real auth
4. Keep dev user as fallback for local development

### Phase 5: Data Verification
After migration:
1. Verify all listings are accessible
2. Check all schedule items are intact
3. Confirm cleaner assignments are preserved
4. Test all functionality with new auth

## Implementation Steps

### Step 1: Add Auth Configuration
```typescript
// src/lib/auth-config.ts
export const AUTH_CONFIG = {
  useAuth: process.env.NEXT_PUBLIC_USE_AUTH === 'true',
  devUserId: '00000000-0000-0000-0000-000000000001',
  // Will be replaced with real user ID after auth
  getCurrentUserId: async () => {
    if (!AUTH_CONFIG.useAuth) {
      return AUTH_CONFIG.devUserId;
    }
    // Get from auth provider
    const user = await getAuthUser();
    return user?.id || null;
  }
};
```

### Step 2: Update Database Functions
```typescript
// Instead of hardcoded DEV_USER_ID, use:
const userId = await AUTH_CONFIG.getCurrentUserId();
```

### Step 3: Create Migration Endpoint
```typescript
// src/app/api/migrate-to-auth/route.ts
// One-time migration endpoint to claim your data
export async function POST(request: Request) {
  const { newUserId } = await request.json();
  
  // Verify this is really you (check some secret)
  // Then migrate all data from dev user to your real user
  
  await db.migrateUserData({
    fromUserId: '00000000-0000-0000-0000-000000000001',
    toUserId: newUserId
  });
}
```

## Safety Measures

1. **Never delete the dev user data** - Always UPDATE to reassign ownership
2. **Test in a staging environment first** - Use a copy of your database
3. **Keep backups at every stage** - Before auth, after auth setup, after migration
4. **Implement rollback plan** - Keep the ability to revert if needed
5. **Gradual rollout** - Test with your account first before opening to others

## Preserving Cleaner Access
Since cleaners access via tokens, their access remains unchanged:
- Cleaner tokens continue to work
- Their schedule items remain linked
- No action needed from cleaners

## Environment Variables
```env
# Development (preserves current behavior)
NEXT_PUBLIC_USE_AUTH=false

# After migration
NEXT_PUBLIC_USE_AUTH=true
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Rollback Plan
If anything goes wrong:
1. Set `USE_AUTH=false` to revert to dev mode
2. Restore from backup if needed
3. All data remains accessible via dev user

This approach ensures zero data loss and a smooth transition to proper authentication.