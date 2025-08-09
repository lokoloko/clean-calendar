# Free Airbnb Listing Analyzer

A free tool that provides instant AI-powered recommendations to improve Airbnb listings and increase bookings.

## Features

### Free Tool (No Login Required)
- **Instant Analysis**: Get results in 30 seconds
- **Comprehensive Scoring**: 0-100 overall score with category breakdowns
- **Top 5 Recommendations**: Actionable improvements with impact estimates
- **Description Optimization**: AI-rewritten description for better conversions
- **Missing Amenities**: Identify high-value amenities you're missing
- **100% Free**: No signup, no credit card, no limits on first analysis

### What Gets Analyzed
- Photo count and quality assessment
- Description effectiveness
- Amenities competitiveness
- Review sentiment and issues
- Pricing strategy
- Host status and settings
- Booking policies

## Running the App

### Development
```bash
# From root directory
npm run analyzer:dev

# Or directly
cd apps/listing-analyzer
npm run dev
```

App will be available at: http://localhost:9004

### Environment Variables
Uses the root `.env.local` file:
```env
BROWSERLESS_API_KEY=your-browserless-key
GEMINI_API_KEY=your-gemini-key
NEXT_PUBLIC_ANALYTICS_URL=http://localhost:9003
```

## Project Structure
```
apps/listing-analyzer/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── analyze/page.tsx            # Results page
│   └── api/analyze/route.ts        # Analysis endpoint
├── components/
│   ├── HeroSection.tsx             # Landing hero
│   ├── ScoreDisplay.tsx            # Score visualization
│   ├── RecommendationCard.tsx      # Recommendation cards
│   └── UpgradePrompt.tsx           # Upsell CTAs
└── lib/
    ├── scraper.ts                  # Browserless integration
    └── analyzer.ts                  # Gemini AI analysis
```

## How It Works

1. **User enters Airbnb URL** on landing page
2. **Scraping with Browserless**: Extracts all listing data
3. **AI Analysis with Gemini**: Generates insights and recommendations
4. **Results Display**: Shows score, recommendations, and improvements
5. **Upsell Opportunities**: Promotes paid analytics platform

## Upsell Strategy

Throughout the results, we promote the paid analytics platform:
- "Track this property monthly" → Analytics dashboard
- "Analyze your portfolio" → Multi-property management
- "Get revenue insights" → Upload earnings data
- "Compare with competitors" → Coming soon feature

## Future Enhancements

- [ ] Competitor comparison (manual URLs)
- [ ] PDF report download (email capture)
- [ ] Social sharing features
- [ ] SEO landing pages for organic traffic
- [ ] A/B testing recommendations
- [ ] Market analysis by location

## Tech Stack

- **Next.js 15**: React framework
- **Tailwind CSS**: Styling
- **Browserless.io**: Web scraping
- **Google Gemini**: AI analysis
- **TypeScript**: Type safety

## Deployment

Deploy to Vercel:
```bash
vercel --cwd apps/listing-analyzer
```

Or configure in Vercel dashboard:
- Root Directory: `apps/listing-analyzer`
- Build Command: `npm run build`
- Output Directory: `.next`

## Support

This is a lead generation tool for the main analytics platform.
For full features, users should upgrade to the paid service.