-- =====================================================
-- CONFIGURE AUTH SECURITY SETTINGS
-- =====================================================
-- Run this in Supabase Dashboard > Settings > Auth Configuration

-- 1. Fix OTP Expiry (currently too long)
-- Go to: Authentication > Providers > Email
-- Set "OTP Expiry" to: 3600 (1 hour) or less
-- Recommended: 1800 (30 minutes)

-- 2. Enable Leaked Password Protection
-- Go to: Authentication > Security & Protection
-- Enable: "Leaked password protection"
-- This checks passwords against HaveIBeenPwned database

-- These settings cannot be changed via SQL migration
-- They must be configured in the Supabase Dashboard

-- =====================================================
-- VERIFICATION
-- =====================================================
-- After making these changes, you can verify by:
-- 1. Check OTP expiry in Auth settings
-- 2. Test with a known leaked password (should be rejected)
-- 3. Run security audit again to confirm warnings are resolved