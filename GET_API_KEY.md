# Getting Your Google Gemini API Key

## Quick Steps:

1. **Go to Google AI Studio:**
   https://aistudio.google.com/app/apikey

2. **Click "Get API Key"** or "Create API Key"

3. **Select a Google Cloud Project** (or create a new one - it's free)

4. **Copy your API key** - it will look like:
   ```
   AIzaSyD-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   ```

## Add to Your Project:

1. **Create/edit `.env.local` in your project root:**
   ```bash
   # From: /Volumes/WORKING/Projects/clean-calendar/
   nano .env.local
   ```

2. **Add this line with your actual key:**
   ```env
   GEMINI_API_KEY=AIzaSyD-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   ```

3. **Save and restart your app**

## Free Tier Limits:
- ✅ **Free to start** - No credit card required
- ✅ **60 requests/minute**
- ✅ **1 million tokens/month free**
- ✅ **Perfect for your analytics needs**

## That's It!
Once added, your Analytics app will automatically use Gemini AI for insights.

## Direct Link:
https://aistudio.google.com/app/apikey