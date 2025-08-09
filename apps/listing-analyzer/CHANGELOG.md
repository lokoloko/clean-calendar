# Listing Analyzer Changelog

## [0.2.0] - 2025-08-09

### Added
- **BrowserQL Integration**: Implemented proper BrowserQL GraphQL endpoint for Browserless.io
- **GoStudioM Branding**: Added logo and branding to all pages
- **Enhanced Scraping**: Real-time data fetching without mock fallbacks
- **Improved Error Handling**: Better error messages for scraping failures

### Changed
- Replaced mock data scraper with BrowserQL implementation (`scraper-browserql.ts`)
- Updated API route to use new BrowserQL scraper
- Fixed type compatibility between scraper and analyzer modules
- Enhanced UI with GoStudioM branding elements

### Fixed
- Environment variable configuration in Docker setup
- Type mismatches between AirbnbData and AirbnbListingData interfaces

## [0.1.0] - 2025-08-09

### Initial Release

#### Features
- **Free Listing Analysis Tool**: Complete implementation of a free Airbnb listing analyzer as a lead generation tool for the paid analytics platform
- **No Authentication Required**: Users can analyze their listing instantly without signup
- **Comprehensive Analysis**: Analyzes photos, description, amenities, reviews, pricing, host status, and booking settings
- **AI-Powered Insights**: Uses Google Gemini to generate:
  - Overall score (0-100)
  - Category breakdown scores
  - Top 5 prioritized recommendations
  - Improved description suggestions
  - Missing amenities identification
- **Responsive Design**: Mobile-friendly interface with modern UI
- **Strategic Upsells**: Multiple touchpoints promoting the paid analytics platform

#### Technical Implementation
- Built with Next.js 15 and TypeScript
- Browserless.io integration for web scraping
- Google Gemini API for AI analysis
- Tailwind CSS for styling
- Shared environment variables with monorepo root
- Runs on port 9004 in development

#### Components Created
- `HeroSection`: Landing page with URL input
- `ScoreDisplay`: Visual score representation
- `RecommendationCard`: Individual recommendation display
- `UpgradePrompt`: Call-to-action for paid platform

#### API Routes
- `/api/analyze`: Main analysis endpoint combining scraping and AI

#### Libraries
- `lib/scraper.ts`: Browserless integration for data extraction
- `lib/analyzer.ts`: Gemini AI analysis logic

#### Development Scripts
- `npm run analyzer:dev`: Run from root directory
- Direct development: `cd apps/listing-analyzer && npm run dev`

### Notes
- This tool serves as a free entry point to demonstrate value before users upgrade to the full analytics platform
- Future enhancements planned: competitor comparison, PDF reports, email capture