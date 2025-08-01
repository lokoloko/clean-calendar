# Vercel Authentication Fix Guide

## Critical Environment Variable Issue

The authentication is failing because `NEXT_PUBLIC_USE_AUTH` might not be properly set in Vercel.

## Required Environment Variables in Vercel

Make sure ALL of these are set in your Vercel project settings:

1. **NEXT_PUBLIC_USE_AUTH** = `true` (MUST be exactly the string "true", not True or TRUE)
2. **NEXT_PUBLIC_SUPABASE_URL** = Your Supabase project URL
3. **NEXT_PUBLIC_SUPABASE_ANON_KEY** = Your Supabase anon key
4. **DATABASE_URL** = Your Supabase connection string

## How to Verify

1. Visit: https://www.gostudiom.com/api/debug/env-check
   - This will show you exactly what environment variables are being read
   - Check that `NEXT_PUBLIC_USE_AUTH_equals_true` is `true`

2. Visit: https://www.gostudiom.com/api/debug/auth-detailed
   - This will show detailed authentication status
   - Look for recommendations at the bottom

3. Check Vercel logs for console output starting with:
   - `[Middleware]` - Shows middleware auth checks
   - `[Auth]` - Shows auth mode and user detection
   - `[Supabase]` - Shows cookie setting attempts
   - `[Auth Callback]` - Shows OAuth callback flow

## Common Issues

1. **Environment variable not set correctly**
   - In Vercel, go to Settings > Environment Variables
   - Make sure `NEXT_PUBLIC_USE_AUTH` is set to exactly `true` (lowercase)
   - Make sure it's available for Production environment

2. **Cookies not being set**
   - Check browser DevTools > Application > Cookies
   - Look for cookies starting with `sb-` or containing `supabase`
   - If missing, the auth callback might not be completing

3. **Wrong redirect URL**
   - In Supabase dashboard, check that `https://www.gostudiom.com/auth/callback` is in redirect URLs
   - Make sure the site URL is set to `https://www.gostudiom.com`

## Testing Authentication

1. Log out completely:
   - Clear all cookies for gostudiom.com
   - Visit https://www.gostudiom.com/api/auth/logout (if exists)

2. Try logging in again:
   - Go to https://www.gostudiom.com/login
   - Use Google OAuth
   - Watch the network tab for the callback

3. After login, immediately check:
   - https://www.gostudiom.com/api/test-auth
   - https://www.gostudiom.com/api/debug/auth-detailed

## What Changed

The test implementation commit (4c484cb) introduced:
1. New error handling that wraps all API responses
2. Auth checks moved inside try/catch blocks
3. Dependency on proper environment variable configuration

The auth system itself wasn't changed, but it's now more sensitive to configuration issues.