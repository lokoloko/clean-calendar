-- Force delete the test user using auth schema functions

-- First verify the user exists
SELECT id, email, created_at, last_sign_in_at
FROM auth.users 
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Method 1: Try using auth.uid() function
-- This sometimes works better than direct DELETE
DO $$
BEGIN
  -- Delete from auth.identities first (if any exist)
  DELETE FROM auth.identities 
  WHERE user_id = '00000000-0000-0000-0000-000000000001';
  
  -- Delete from auth.sessions (if any exist)
  DELETE FROM auth.sessions 
  WHERE user_id = '00000000-0000-0000-0000-000000000001';
  
  -- Delete from auth.refresh_tokens (if any exist)
  DELETE FROM auth.refresh_tokens 
  WHERE user_id = '00000000-0000-0000-0000-000000000001';
  
  -- Delete from auth.mfa_factors (if any exist)
  DELETE FROM auth.mfa_factors 
  WHERE user_id = '00000000-0000-0000-0000-000000000001';
  
  -- Finally delete the user
  DELETE FROM auth.users 
  WHERE id = '00000000-0000-0000-0000-000000000001';
  
  RAISE NOTICE 'Test user deleted successfully';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error deleting user: %', SQLERRM;
END $$;

-- Also clean up any profile
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