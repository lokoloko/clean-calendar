# Airbnb Analytics Platform

AI-powered analytics platform for analyzing Airbnb portfolio performance.

## Features

- 📊 **Upload & Parse**: Process Airbnb earnings PDFs and transaction CSVs
- 🏠 **Property Detection**: Automatically detects all 21 properties
- 🗺️ **Property Mapping**: Confirms PDF to CSV name mappings
- 💯 **Health Scoring**: 0-100 health score for each property
- 📈 **Dashboard**: Comprehensive view of portfolio performance
- 🤖 **AI Insights**: Smart recommendations for optimization
- 🚨 **Inactive Alerts**: Highlights properties needing attention

## Quick Start

### Using Docker (Recommended)

```bash
# From project root
npm run analytics:docker:build
npm run analytics:docker

# View at http://localhost:9003
```

### Local Development

```bash
# Install dependencies
cd apps/analytics
npm install

# Run development server
npm run dev

# View at http://localhost:9003
```

## How to Use

1. **Upload Files**: 
   - Upload your monthly Airbnb earnings PDF
   - Upload transaction history CSV (optional)

2. **Confirm Mappings**: 
   - Review detected properties
   - Confirm property name mappings

3. **View Dashboard**:
   - See total revenue ($19,758.69 for December)
   - Review 9 active / 12 inactive properties
   - Check health scores for all properties
   - Read AI-generated insights

## Property Health Scoring

Each property receives a health score (0-100) based on:
- **Revenue** (40 points): Is the property generating income?
- **Revenue Level** (20 points): How much revenue compared to others?
- **Occupancy** (20 points): Nights booked / available nights
- **Consistency** (10 points): Regular bookings vs gaps
- **Trend** (10 points): Improving or declining performance

### Health Status:
- 🟢 **Healthy** (70-100): Performing well
- 🟡 **Warning** (40-69): Needs optimization
- 🔴 **Critical** (0-39): Urgent attention required

## File Formats Supported

### Earnings PDF
- Monthly earnings reports from Airbnb
- Format: `MM_DD_YYYY-MM_DD_YYYY_airbnb_earnings.pdf`
- Contains: Property earnings, service fees, nights booked

### Transaction CSV
- Transaction history export from Airbnb
- Contains: All reservations, payouts, co-host payments
- Columns: Date, Type, Listing, Amount, etc.

## Architecture

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (separate from calendar app)
- **Parsing**: pdf-parse, papaparse
- **Port**: 9003 (calendar uses 9002)

## Environment Variables

Copy `.env.local.example` to `.env.local` and configure:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5434/analytics
NEXT_PUBLIC_APP_URL=http://localhost:9003
GEMINI_API_KEY=your-key-here  # For AI insights (optional)
```

## Docker Ports

- **App**: 9003
- **Database**: 5434 (separate from calendar DB on 5433)

## Commands

```bash
# Docker commands (from root)
npm run analytics:docker       # Start container
npm run analytics:docker:build # Build container
npm run analytics:docker:down  # Stop container
npm run analytics:logs         # View logs

# Development (from apps/analytics)
npm run dev    # Start dev server
npm run build  # Build for production
npm run start  # Start production server
```

## Future Enhancements

- [ ] Gemini AI integration for deeper insights
- [ ] Monthly comparison views
- [ ] Automated scraping with BrowserQL
- [ ] PDF/Excel report generation
- [ ] Property URL management for scraping
- [ ] Historical data tracking

## Troubleshooting

### PDF Not Parsing?
- Ensure PDF is from Airbnb earnings report
- Check format matches expected structure

### Properties Not Detected?
- Property names must match known list
- Check property mapping page

### Docker Issues?
- Ensure port 9003 is available
- Check Docker logs: `npm run analytics:logs`

## Notes

This app is completely isolated from the calendar app:
- Separate branch (`feature/analytics-platform`)
- Separate Docker container
- Separate database
- Different port (9003 vs 9002)
- No shared code with calendar app