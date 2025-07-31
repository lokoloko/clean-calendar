# Security Fixes - Status Update

✅ **VIEWS FIXED**: The SECURITY DEFINER issue has been resolved!

## 1. Database Views (SECURITY DEFINER) ✅ COMPLETE

**Issue**: Two views (`cancelled_bookings` and `extended_bookings`) were using SECURITY DEFINER which bypasses RLS policies.

**Status**: ✅ FIXED - Views have been recreated without SECURITY DEFINER
- Both views now properly respect RLS policies
- Verified: No SECURITY DEFINER in view definitions

## 2. Auth Configuration

### A. OTP Expiry Too Long
**Issue**: Email OTP expiry is set to more than 1 hour

**Fix**: 
1. Go to Supabase Dashboard > Authentication > Providers > Email
2. Set "OTP Expiry" to 1800 (30 minutes) or 3600 (1 hour max)

### B. Leaked Password Protection Disabled
**Issue**: Not checking passwords against HaveIBeenPwned database

**Fix**:
1. Go to Supabase Dashboard > Authentication > Security & Protection
2. Enable "Leaked password protection"

## Verification

After applying fixes:
1. Run Supabase security audit again
2. Verify no SECURITY DEFINER views exist:
```sql
SELECT viewname, definition 
FROM pg_views 
WHERE schemaname = 'public' 
AND definition LIKE '%SECURITY DEFINER%';
```
3. Test OTP with shortened expiry
4. Test registration with a known leaked password (should fail)

## Notes
- Auth settings must be configured via Dashboard (not SQL)
- These are one-time configurations that persist