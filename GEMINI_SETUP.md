# Gemini AI Setup Guide

This guide explains how to set up Google's Gemini AI API for use in both the Calendar and Analytics applications.

## Getting Your API Key

1. **Visit Google AI Studio**: https://makersuite.google.com/app/apikey
2. **Sign in** with your Google account
3. **Create a new API key** or use an existing one
4. **Copy the API key** - it will look like: `AIzaSyA...`

## Local Setup

### 1. Create `.env.local` file in project root
```bash
# In the project root (/Volumes/WORKING/Projects/clean-calendar/)
cp .env.local.example .env.local
```

### 2. Add your Gemini API key
Edit `.env.local` and add your key:
```env
# Google AI (Gemini) - Shared between Calendar and Analytics apps
GOOGLE_AI_API_KEY=your-actual-gemini-api-key-here
GEMINI_API_KEY=your-actual-gemini-api-key-here  # Alias for compatibility
```

### 3. Restart your development servers
```bash
# For Analytics app
npm run analytics:docker:down
npm run analytics:docker

# For Calendar app  
docker-compose restart app
```

## Features Enabled by Gemini

### Analytics App
- **Smart Insights**: AI-generated analysis of your property portfolio
- **Pattern Detection**: Identifies trends across your properties
- **Recommendations**: Specific actions to improve underperforming properties
- **Critical Alerts**: Highlights urgent issues needing attention

### Calendar App (Future)
- **Schedule Optimization**: AI suggests optimal cleaning schedules
- **Conflict Detection**: Warns about potential booking conflicts
- **Cleaner Assignment**: Smart matching of cleaners to properties
- **Predictive Analytics**: Forecasts busy periods and revenue

## API Usage & Costs

### Free Tier (Gemini 1.5 Flash)
- **60 requests per minute**
- **1 million tokens per month free**
- Perfect for personal use and small portfolios

### Pricing (if you exceed free tier)
- Gemini 1.5 Flash: $0.0001875 per 1K input tokens
- Gemini 1.5 Pro: $0.00125 per 1K input tokens
- Most analytics runs use < 2K tokens per request

## Configuration

The API configuration is shared in `/lib/env/gemini.ts`:

```typescript
// Default model (fast, good for analytics)
GEMINI_CONFIG = {
  model: 'gemini-1.5-flash',
  temperature: 0.7,  // Creativity level
  maxTokens: 2048,
  topP: 0.95,
}

// Pro model (more accurate, slower)
GEMINI_PRO_CONFIG = {
  model: 'gemini-1.5-pro',
  temperature: 0.3,  // More consistent
  maxTokens: 4096,
  topP: 0.95,
}
```

## Troubleshooting

### API Key Not Working?
1. Check the key is correctly copied (no extra spaces)
2. Verify the key is enabled in Google AI Studio
3. Check you haven't exceeded rate limits

### No AI Insights Showing?
1. Check browser console for errors
2. Verify `.env.local` file exists and has the key
3. Restart your development server after adding the key

### Rate Limit Errors?
- The app automatically falls back to mock insights if API fails
- Wait 1 minute and try again if you hit rate limits
- Consider upgrading to paid tier for production use

## Environment Variables

Both apps check for these environment variables (in order):
1. `GEMINI_API_KEY`
2. `GOOGLE_AI_API_KEY` 
3. `NEXT_PUBLIC_GEMINI_API_KEY`
4. `NEXT_PUBLIC_GOOGLE_AI_API_KEY`

This allows flexibility in configuration across different deployment environments.

## Production Deployment

For Vercel deployment:
1. Go to your Vercel project settings
2. Navigate to Environment Variables
3. Add `GEMINI_API_KEY` with your API key
4. Redeploy your application

## Security Notes

- **Never commit** your API key to git
- `.env.local` is already in `.gitignore`
- Use environment variables in production
- Rotate keys regularly for security
- Monitor usage to detect any unusual activity