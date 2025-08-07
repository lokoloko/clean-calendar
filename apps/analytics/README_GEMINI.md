# Setting up Gemini AI for Smart Analytics

## Getting Your Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

## Configuring the Application

1. Create a `.env.local` file in the `/apps/analytics` directory
2. Add your API key:
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   ```
3. Restart the development server

## What You Get with Gemini AI

When configured, the analysis page will provide:

- **Intelligent Portfolio Analysis**: AI-powered insights specific to your properties
- **Performance Scoring**: Smart evaluation of your portfolio's health
- **Strategic Recommendations**: Tailored advice based on your actual data
- **Trend Detection**: Identify patterns and opportunities in your revenue
- **Risk Assessment**: Warnings about underperforming properties

## Fallback Mode

Without a Gemini API key, the app still works but provides:
- Basic rule-based analysis
- Standard metrics calculation
- Generic recommendations

## Testing Your Configuration

1. Upload your Airbnb PDF
2. Select properties on the mapping page
3. Click "Analyze Selected"
4. If Gemini is configured, you'll see personalized AI insights
5. If not configured, you'll see basic analysis (still useful!)

## API Usage

- The free tier of Gemini API provides 60 requests per minute
- Each analysis uses 1 API call
- This is more than sufficient for typical usage