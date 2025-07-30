# Google Authentication for Local Development

This guide explains how to set up Google authentication for local development of the CleanSweep Scheduler application.

## Current Setup: Dev Mode (Recommended for Development)

The application currently uses a mock authentication system for local development:

- **Environment Variable**: `NEXT_PUBLIC_USE_AUTH=false` in `.env.local`
- **Auth Context**: Uses `auth-context-dev.tsx` with mock user data
- **How to Use**: Click "Sign in with Google" on the homepage to set the `dev-auth` cookie
- **Benefits**: No external dependencies, instant authentication, consistent test user

## Option 1: Continue Using Dev Mode

This is the simplest approach for development:

1. Keep `NEXT_PUBLIC_USE_AUTH=false` in your `.env.local`
2. Start the application with Docker or npm
3. Click "Sign in with Google" on the homepage
4. You'll be redirected to the dashboard with a mock user session

### Manual Cookie Setting (Alternative)

If you want to bypass the UI:
1. Open http://localhost:9002 in your browser
2. Open DevTools (F12)
3. Go to Application/Storage → Cookies
4. Add a cookie: `dev-auth` = `true`
5. Navigate to http://localhost:9002/dashboard

## Option 2: Real Google OAuth in Local Development

If you need to test the actual Google authentication flow:

### 1. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API"
   - Click and enable it
4. Create OAuth credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: **Web application**
   - Name: "CleanSweep Local Dev" (or similar)
   - Add Authorized JavaScript origins:
     - `http://localhost:9002`
     - `http://localhost:54321` (Supabase)
   - Add Authorized redirect URIs:
     - `http://localhost:9002/auth/callback`
     - `http://localhost:54321/auth/v1/callback`
   - Click "Create"
5. Save the Client ID and Client Secret

### 2. Configure Supabase for Google OAuth

```bash
# Start local Supabase if not already running
supabase start

# Configure Google provider
supabase auth providers google \
  --client-id YOUR_GOOGLE_CLIENT_ID \
  --secret YOUR_GOOGLE_CLIENT_SECRET
```

### 3. Update Environment Variables

Create or update `.env.local`:

```env
# Enable real authentication
NEXT_PUBLIC_USE_AUTH=true

# Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_local_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_local_service_role_key

# Google OAuth (if your app needs direct access)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### 4. Update Docker Compose (if using Docker)

Modify `docker-compose.yml`:

```yaml
services:
  app:
    environment:
      - NODE_ENV=development
      - NEXT_PUBLIC_USE_AUTH=true
      - NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
```

### 5. Update Auth Context Import

Currently, the app imports the production auth context. To conditionally use the correct one:

```typescript
// In src/app/layout.tsx
import { AuthProvider } from process.env.NEXT_PUBLIC_USE_AUTH === 'true' 
  ? '@/contexts/auth-context' 
  : '@/contexts/auth-context-dev'
```

Note: This would require dynamic imports or build-time configuration.

### 6. Test the Authentication Flow

1. Start the application:
   ```bash
   # With Docker
   docker-compose up -d --build
   
   # Or with npm
   npm run dev
   ```

2. Navigate to http://localhost:9002
3. Click "Sign in with Google"
4. You should be redirected to Google's OAuth consent screen
5. After authorization, you'll be redirected back to the dashboard

## Troubleshooting

### Common Issues

1. **Redirect URI mismatch**
   - Ensure the redirect URIs in Google Console match exactly
   - Check for trailing slashes
   - Verify port numbers

2. **Supabase not configured**
   - Run `supabase status` to check if it's running
   - Verify the Google provider is configured with `supabase auth providers list`

3. **Environment variables not loaded**
   - Restart the application after changing `.env.local`
   - Check that variables are available: `console.log(process.env.NEXT_PUBLIC_USE_AUTH)`

4. **CORS issues**
   - Ensure localhost URLs are in the authorized origins
   - Check browser console for specific CORS errors

## Switching Between Modes

To switch between dev mode and real authentication:

1. **To Dev Mode**:
   - Set `NEXT_PUBLIC_USE_AUTH=false`
   - Restart the application

2. **To Real Auth**:
   - Set `NEXT_PUBLIC_USE_AUTH=true`
   - Ensure Google OAuth is configured
   - Restart the application

## Security Notes

- Never commit Google OAuth credentials to version control
- Use different OAuth apps for development and production
- The dev mode should only be used in local development
- Always test the real authentication flow before deploying to production

## Related Documentation

- [Google OAuth Setup](./GOOGLE_OAUTH_SETUP.md) - Production OAuth setup
- [Supabase Setup](./SUPABASE_SETUP.md) - Supabase configuration
- [Production Deployment](./PRODUCTION_DEPLOYMENT.md) - Deployment guidelines