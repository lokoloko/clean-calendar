# Google OAuth Setup - Next Steps

## Current Status

I've implemented the OAuth infrastructure for your Clean Calendar app:

### ✅ Completed
1. **Login page** (`/login`) - with Google OAuth button
2. **Sign-up page** (`/signup`) - with Google OAuth option
3. **OAuth callback handler** (`/auth/callback`) - processes OAuth responses
4. **Test page** (`/test-auth`) - to verify OAuth is working
5. **Middleware update** - checks Supabase sessions when `NEXT_PUBLIC_USE_AUTH=true`
6. **Auth hook** (`useAuth`) - for managing user sessions in components
7. **Data migration script** - to transfer data from dev user to authenticated user

### 🔧 What You Need to Do

## Step 1: Configure Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API (or Google Identity API)
4. Configure OAuth consent screen:
   - App name: Clean Calendar
   - Add your email for support/developer contact
   - Add scopes: userinfo.email, userinfo.profile
5. Create OAuth 2.0 credentials:
   - Type: Web application
   - Name: Clean Calendar Web
   - Add authorized redirect URI:
     ```
     https://puvlcvcbxmobxpnbjrwp.supabase.co/auth/v1/callback
     ```
6. Save your credentials:
   - Client ID: `xxxx.apps.googleusercontent.com`
   - Client Secret: `GOCSPX-xxxx`

## Step 2: Configure Supabase

1. Go to [Supabase Dashboard](https://app.supabase.com/project/puvlcvcbxmobxpnbjrwp/auth/providers)
2. Find Google provider and enable it
3. Enter your Client ID and Client Secret from Google
4. Save the configuration

## Step 3: Test OAuth Flow

1. Keep auth in dev mode for now:
   ```bash
   # In .env.local
   NEXT_PUBLIC_USE_AUTH=false
   ```

2. Visit `/test-auth` and click "Sign in with Google"
3. Complete the Google sign-in flow
4. You should see your email and user ID displayed

## Step 4: Migrate Your Data

Once you have your authenticated user ID:

```bash
# Install dependencies if needed
npm install -g tsx

# Run migration (replace with your actual user ID)
npx tsx scripts/migrate-user-data.ts YOUR-USER-ID-HERE
```

## Step 5: Enable Supabase Auth

1. Update `.env.local`:
   ```bash
   NEXT_PUBLIC_USE_AUTH=true
   ```

2. Restart your dev server:
   ```bash
   npm run dev
   ```

3. Now the app will use Supabase authentication instead of dev mode

## Testing Checklist

- [ ] Google OAuth credentials created in Google Cloud Console
- [ ] OAuth provider configured in Supabase dashboard
- [ ] Test OAuth flow at `/test-auth`
- [ ] Migrate existing data to your authenticated user
- [ ] Enable `NEXT_PUBLIC_USE_AUTH=true`
- [ ] Verify you can access protected routes after login
- [ ] Verify middleware redirects work properly

## Production Considerations

Before going to production:

1. **Update redirect URLs** in both Google Console and Supabase for your production domain
2. **Set up Row Level Security (RLS)** policies in Supabase
3. **Remove test routes** like `/test-auth`
4. **Add proper error handling** for auth failures
5. **Set up email templates** in Supabase for auth emails
6. **Configure rate limiting** for auth endpoints

## Troubleshooting

### "redirect_uri_mismatch" Error
- Ensure the redirect URI in Google Console matches exactly:
  `https://puvlcvcbxmobxpnbjrwp.supabase.co/auth/v1/callback`

### "User not found" after login
- Make sure to run the data migration script with your authenticated user ID

### Can't access protected routes
- Check that `NEXT_PUBLIC_USE_AUTH=true` is set
- Clear your browser cookies and try logging in again

### OAuth flow redirects to error page
- Check Supabase logs for detailed error messages
- Verify Client ID and Secret are correct in Supabase