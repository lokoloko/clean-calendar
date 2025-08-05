# Migration Instructions: Fix Cleaner Share Links

## Latest Issue (Step 2)
The cleaner share link access is failing with a 500 error when visiting the generated link.

### Solution
Run the following migration in your Supabase SQL editor:

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of: `supabase/migrations/manual_run_share_token_access.sql`
4. Click "Run"

### What This Migration Does
- Creates `get_cleaner_by_token` function - Gets cleaner info using share token
- Creates `get_cleaner_schedule_by_token` function - Gets schedule data using share token
- Both functions use SECURITY DEFINER to bypass RLS for unauthenticated access
- Grants EXECUTE permissions to the anon role

### Testing
The migration includes test queries at the bottom. After running:
1. Visit a share link (e.g., `/cleaner/schedule/[token]`)
2. The schedule should load without authentication

---

## Previous Issue (Step 1) - COMPLETED
The cleaner share link generation was failing with:
```
"new row violates row-level security policy for table cleaner_sessions"
```

### Solution Applied
Added RLS policies for managers to create/manage cleaner sessions:
- `Managers can create cleaner sessions`
- `Managers can view cleaner sessions`
- `Managers can update cleaner sessions`
- `Managers can delete cleaner sessions`

This allows the share link generation to work.