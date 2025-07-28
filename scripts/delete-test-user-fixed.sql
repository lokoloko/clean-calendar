-- Delete test user - fixed syntax

-- First verify the user exists
SELECT id, email, created_at, last_sign_in_at
FROM auth.users 
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Delete related records first, then the user
-- Run these one at a time if needed

-- 1. Delete from auth.identities
DELETE FROM auth.identities 
WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- 2. Delete from auth.sessions
DELETE FROM auth.sessions 
WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- 3. Delete from auth.refresh_tokens
DELETE FROM auth.refresh_tokens 
WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- 4. Delete from auth.mfa_factors
DELETE FROM auth.mfa_factors 
WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- 5. Delete from any other auth tables that might reference the user
DELETE FROM auth.mfa_amr_claims 
WHERE session_id IN (
  SELECT id FROM auth.sessions WHERE user_id = '00000000-0000-0000-0000-000000000001'
);

-- 6. Delete from audit log if needed
DELETE FROM auth.audit_log_entries 
WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- 7. Finally, delete the user
DELETE FROM auth.users 
WHERE id = '00000000-0000-0000-0000-000000000001';

-- 8. Clean up profile
DELETE FROM public.profiles 
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Verify deletion
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN 'Success: Test user has been deleted'
    ELSE 'Failed: Test user still exists'
  END as status
FROM auth.users 
WHERE id = '00000000-0000-0000-0000-000000000001';