# Supabase Security Configuration Guide

## Required Security Settings

Follow these steps in your Supabase Dashboard to configure the required security settings:

### 1. Reduce OTP Expiry Time

**Path**: Authentication > Providers > Email

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** in the left sidebar
3. Click on **Providers**
4. Find **Email** provider and click **Settings** (gear icon)
5. Look for **OTP Expiry duration**
6. Change from default (3600 seconds / 1 hour) to:
   - **Recommended**: 1800 (30 minutes)
   - **Alternative**: 3600 (1 hour max)
7. Click **Save**

### 2. Enable Leaked Password Protection

**Path**: Authentication > Security & Protection

1. In the Authentication section, click on **Security & Protection**
2. Find **Leaked password protection**
3. Toggle it **ON**
4. This will check passwords against HaveIBeenPwned database
5. Click **Save** if there's a save button

### 3. Verify Security Settings

After making these changes:

1. Go to **Settings** > **Security Advisor**
2. Run a security scan
3. Ensure no critical warnings remain
4. Common warnings to address:
   - ✅ RLS enabled on all tables (already done)
   - ✅ Email confirmations enabled
   - ✅ Leaked password protection enabled
   - ✅ OTP expiry reasonable (<= 1 hour)

### 4. Additional Recommended Settings

While you're in the dashboard, also verify:

**Authentication > URL Configuration**
- Site URL: `https://your-production-domain.com`
- Redirect URLs: Include your production domain

**Authentication > Email Templates**
- Ensure email templates look professional
- Update sender name to "GoStudioM"

## Verification Steps

After configuration, test that:

1. **OTP Expiry**: 
   - Request a magic link
   - Wait 31 minutes (if set to 30 min)
   - Link should be expired

2. **Leaked Password Protection**:
   - Try to create account with password: `password123`
   - Should be rejected as leaked

## Current Status Checklist

- [ ] OTP Expiry set to 1800 or 3600 seconds
- [ ] Leaked password protection enabled
- [ ] Security Advisor shows no critical issues
- [ ] Site URL configured for production
- [ ] Email templates updated

## Notes

- These settings are per-project, not global
- Changes take effect immediately
- No code changes required
- Settings persist across deployments

---

**Last Updated**: August 4, 2025
**Time Required**: ~5 minutes
**Risk Level**: None (safe to change anytime)