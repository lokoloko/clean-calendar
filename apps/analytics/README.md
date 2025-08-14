# Smart Analytics Platform

AI-powered analytics platform for analyzing Airbnb portfolio performance with tiered pricing model - Part of the GoStudioM suite of tools built for hosts, by a host.

## Features

### Core Features (All Tiers)
- 📊 **Upload & Parse**: Process Airbnb earnings PDFs
- 🏠 **Property Detection**: Automatically detects all properties in your portfolio
- 💯 **Health Scoring**: 0-100 health score for each property
- 📈 **Dashboard**: Comprehensive view of portfolio performance
- 🤖 **Basic AI Insights**: Essential recommendations

### Pro Features ($29/month)
- 📁 **CSV Import**: Transaction history for accurate property metrics
- 📊 **Historical Analytics**: Multi-year trend analysis
- 📥 **Unlimited Exports**: PDF and Excel report generation
- 🎯 **Accurate Metrics**: Individual property nights and average stays
- 🔍 **Advanced Insights**: Detailed AI recommendations
- 📈 **Property Comparison**: Side-by-side performance analysis

### Enterprise Features (Custom Pricing)
- 🔌 **API Access**: Integrate with your systems
- 🏷️ **White Label**: Custom branding
- 🤖 **Automated Monitoring**: Set up alerts and reports
- 🎯 **Priority Support**: Dedicated account manager

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

### Free Tier
1. **Upload PDF**: 
   - Upload your monthly Airbnb earnings PDF (3 per month)
   - System extracts revenue and property list

2. **Confirm Mappings**: 
   - Review detected properties
   - Select properties for analysis

3. **View Dashboard**:
   - See total revenue and property count
   - Review active/inactive properties
   - Check health scores (with estimated metrics)
   - Read basic AI insights

### Pro Tier
1. **Upload Files**: 
   - Unlimited PDF uploads
   - Upload transaction CSV for accurate metrics
   - Access historical data analysis

2. **Enhanced Analysis**:
   - Accurate property-level nights and average stays
   - Multi-year trend analysis
   - Advanced AI recommendations

3. **Export & Share**:
   - Generate PDF reports
   - Export to Excel
   - Share with stakeholders

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

## Current Implementation Status

### Completed ✅
- PDF parsing with clear data limitations
- CSV transaction processing for accurate metrics
- Interactive dashboard with health scores
- Tiered pricing model (Free/Pro/Enterprise)
- Historical analytics for Pro users
- Export to PDF/Excel (Pro feature)
- AI insights with Gemini integration
- Tier selector for testing (dev mode)

### In Progress 🚧
- User authentication system
- Stripe payment integration
- Database persistence (currently sessionStorage)
- Property comparison tools

### Planned 📋
- Property URL mapping for competitor analysis
- Automated monthly monitoring
- Email report scheduling
- Mobile app
- API access for Enterprise
- White-label options

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

## Known Limitations

### PDF Data Extraction
- Individual property average stays cannot be extracted (format issue)
- Property nights are estimated based on revenue
- CSV required for accurate property-level metrics

### Data Storage
- Currently uses sessionStorage (temporary)
- Database integration planned for production

## Testing Tiers

In development mode, use the tier selector (bottom-right):
1. Click the tier badge
2. Select Free/Pro/Enterprise
3. Features update based on tier

## Technical Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **UI**: Tailwind CSS + shadcn/ui
- **Charts**: Recharts
- **PDF**: pdf-parse
- **CSV**: PapaParse
- **AI**: Google Gemini API
- **State**: React hooks + sessionStorage

## Notes

This app is part of the GoStudioM monorepo:
- Shares infrastructure with calendar app
- Separate port (9003 vs 9002)
- Can be deployed independently
- Ready for authentication integration