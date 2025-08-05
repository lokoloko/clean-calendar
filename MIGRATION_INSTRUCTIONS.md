# Migration Instructions: Fix Cleaner Share Links

## Problem
The cleaner share link feature is failing with error:
```
"new row violates row-level security policy for table cleaner_sessions"
```

This is because the `cleaner_sessions` table lacks INSERT policies that allow managers to create share tokens for their cleaners.

## Solution
Run the following migration in your Supabase SQL editor:

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of: `supabase/migrations/manual_run_cleaner_sessions_policies.sql`
4. Click "Run"

## What This Migration Does
- Adds INSERT policy: Allows managers to create share tokens for their cleaners
- Adds SELECT policy: Allows managers to view sessions for their cleaners  
- Adds UPDATE policy: Allows managers to update sessions (e.g., extend expiry)
- Adds DELETE policy: Allows managers to revoke share tokens

## Verification
After running the migration, you should see 5 policies for the `cleaner_sessions` table:
1. `cleaner_sessions_own_read` (existing - for cleaners)
2. `Managers can create cleaner sessions` (new)
3. `Managers can view cleaner sessions` (new)
4. `Managers can update cleaner sessions` (new)
5. `Managers can delete cleaner sessions` (new)

## Testing
After running the migration:
1. Go to the Cleaners page
2. Click the calendar icon next to any cleaner
3. The share link should generate successfully without errors