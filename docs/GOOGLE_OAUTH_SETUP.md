# Google OAuth Setup for Clean Calendar

## Step 1: Google Cloud Console Setup

### 1.1 Create/Select Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name it: `Clean Calendar` (or use existing project)
4. Click "Create"

### 1.2 Enable APIs
1. Go to "APIs & Services" → "Enable APIs and services"
2. Search for "Google+ API" (or "Google Identity")
3. Click on it and press "Enable"

### 1.3 Configure OAuth Consent Screen
1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose "External" (unless you have a Google Workspace)
3. Fill in the required fields:
   - App name: `Clean Calendar`
   - User support email: (your email)
   - Developer contact: (your email)
4. Add scopes:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
5. Add test users if in testing mode (your email)
6. Save and continue

### 1.4 Create OAuth Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: "Web application"
4. Name: `Clean Calendar Web`
5. Add Authorized redirect URIs:
   ```
   https://puvlcvcbxmobxpnbjrwp.supabase.co/auth/v1/callback
   ```
6. Click "Create"
7. **SAVE YOUR CREDENTIALS:**
   - Client ID: `xxxxxxxxxxxx.apps.googleusercontent.com`
   - Client Secret: `GOCSPX-xxxxxxxxxxxxx`

## Step 2: Configure Supabase

### 2.1 Add Google Provider
1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Navigate to Authentication → Providers
3. Find "Google" and click "Enable"
4. Enter:
   - Client ID (from Google Cloud Console)
   - Client Secret (from Google Cloud Console)
5. Copy the Redirect URL (should match what you added in Google)
6. Click "Save"

### 2.2 Update Auth Settings
1. Go to Authentication → Settings
2. Under "Site URL", add:
   ```
   http://localhost:3000
   ```
   (for development)
3. Under "Redirect URLs", add:
   ```
   http://localhost:3000/auth/callback
   http://localhost:3000/dashboard
   ```
4. Save changes

## Step 3: Test OAuth Flow

Create a test page at `http://localhost:3000/test-auth` with this code:

```typescript
import { createBrowserClient } from '@/lib/supabase'

export default function TestAuth() {
  const supabase = createBrowserClient()

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost:3000/auth/callback'
      }
    })
    if (error) console.error('Error:', error)
  }

  return (
    <button onClick={handleGoogleLogin}>
      Sign in with Google
    </button>
  )
}
```

## Important Notes

1. **Redirect URL Must Match**: The redirect URL in Google Console must exactly match Supabase's callback URL
2. **HTTPS Required in Production**: Google OAuth requires HTTPS for non-localhost URLs
3. **Verification**: If your app requests sensitive scopes, Google may require verification
4. **Rate Limits**: Google has rate limits for OAuth requests

## Troubleshooting

### Common Issues:
1. **"redirect_uri_mismatch"**: Check that URLs match exactly (including trailing slashes)
2. **"access_blocked"**: Make sure Google+ API is enabled
3. **"invalid_client"**: Double-check Client ID and Secret

### Debug Checklist:
- [ ] Google+ API is enabled
- [ ] OAuth consent screen is configured
- [ ] Redirect URIs match exactly
- [ ] Client ID/Secret are correct in Supabase
- [ ] Supabase Site URL is set correctly