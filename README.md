# GoStudioM Scheduler

> The easiest way to manage Airbnb cleaning schedules. Save 5+ hours per week. Never miss a turnover.

## Overview

GoStudioM Scheduler is a Next.js 15 application that automates cleaning schedule management for Airbnb property managers. It integrates with Airbnb calendar systems, manages cleaner assignments, and uses AI for schedule optimization.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL (via Supabase)
- Supabase CLI

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/clean-calendar.git
cd clean-calendar

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Start Supabase locally
supabase start

# Run database migrations
supabase db push

# Start development server
npm run dev
```

Visit `http://localhost:9002` to see the app.

## 🏗️ Tech Stack

- **Framework**: Next.js 15.3.3 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth + Custom SMS auth for cleaners
- **AI**: Google Genkit for schedule optimization
- **Hosting**: Vercel

## 📱 Key Features

### For Property Managers
- **Automated Calendar Sync**: Syncs with Airbnb ICS feeds every 3 hours
- **Smart Cleaner Assignment**: Link cleaners to specific properties
- **Multiple Schedule Views**: List, weekly, and monthly calendar views
- **Manual Scheduling**: Support for non-Airbnb properties
- **Share Links**: Secure schedule sharing with cleaners
- **Export Functionality**: Text-based schedules for SMS/WhatsApp

### For Cleaners
- **Mobile Portal**: SMS-based authentication system
- **Today's Schedule**: Clear view of daily cleaning tasks
- **Feedback System**: Rate cleanliness after each cleaning
- **Offline Support**: Works on any device with a browser

## 🔒 Security & Performance

### Security Features
- Row Level Security (RLS) on all tables
- Secure cleaner authentication via SMS
- Session management with 30-day expiry
- Feature gating by subscription tier
- Leaked password protection enabled

### Performance Optimizations
- Database connection pooling
- Query result caching with Next.js
- 17 performance indexes on common queries
- Optimized RLS policies for auth checks
- Mobile-first responsive design

## 💰 Subscription Tiers

### Free ($0/month)
- 1 Airbnb listing
- Email notifications only
- Basic schedule view

### Starter ($9/month)
- Up to 3 listings
- SMS & email notifications
- All schedule views
- 30-day free trial

### Pro ($29/month)
- Unlimited listings
- SMS, WhatsApp & email
- Cleaner portal access
- Advanced analytics

## 🚦 Production Status

**Current Progress**: 55% Complete

### ✅ Completed
- Security infrastructure (RLS, auth)
- Database schema and migrations
- Core functionality (CRUD operations)
- Calendar synchronization
- Mobile optimization
- Performance optimization
- Legal pages (Privacy, Terms, Cookies)

### 🔄 In Progress
- Content & branding (screenshots needed)
- Testing & deployment setup

### ⏳ Pending
- Notification system (requires Twilio/SendGrid)
- Payment integration (Stripe)
- Production deployment

## 📚 Documentation

- [Production Launch Plan](./docs/PRODUCTION_LAUNCH_PLAN.md)
- [API Documentation](./docs/API_DOCUMENTATION.md)
- [Functionality Guide](./docs/FUNCTIONALITY_GUIDE.md)
- [Branch Strategy](./docs/BRANCH_STRATEGY.md)
- [Performance Analysis](./docs/SUPABASE_PERFORMANCE_ANALYSIS.md)

## 🛠️ Development

### Essential Commands

```bash
# Development
npm run dev              # Start dev server on port 9002
npm run build           # Build for production
npm run lint            # Run linter
npm run typecheck       # Check TypeScript types

# Database
supabase start          # Start local Supabase
supabase db push        # Apply migrations
supabase db reset       # Reset database

# Testing
npm test                # Run tests
npm run test:e2e        # Run E2E tests
```

### Environment Variables

Create `.env.local` with:

```env
# Supabase
DATABASE_URL=postgresql://postgres:postgres@localhost:54321/postgres
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:9002
CRON_SECRET=your-cron-secret

# Future: Notifications
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
SENDGRID_API_KEY=
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Database powered by [Supabase](https://supabase.com/)
- Deployed on [Vercel](https://vercel.com/)

---

**Status**: Pre-launch (Production readiness: 55%)

*Last updated: July 31, 2025*