# Clean Calendar

A modern web application for managing cleaning schedules for Airbnb properties.

## 🚀 Production Status

See [PRODUCTION_READINESS_STATUS.md](docs/PRODUCTION_READINESS_STATUS.md) for detailed progress on production deployment.

## 📋 Features

- **Airbnb Calendar Sync**: Automatically sync bookings from Airbnb iCal feeds
- **Cleaner Management**: Manage multiple cleaners and their assignments
- **Smart Scheduling**: Automatic assignment of cleaners to properties
- **Manual Bookings**: Add one-time or recurring manual cleanings
- **Calendar Views**: List, weekly, and monthly schedule views
- **Share Schedules**: Generate shareable links for cleaners
- **Mobile Support**: Cleaner dashboard optimized for mobile devices
- **Historical Tracking**: Track extensions, cancellations, and modifications
- **Cleaner Reassignment**: Easily reassign cleaners to scheduled cleanings

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Database**: PostgreSQL (local), Supabase (production)
- **Authentication**: Supabase Auth with Google OAuth
- **Calendar Parsing**: ical library
- **Date Handling**: date-fns

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Docker (for local PostgreSQL)
- Supabase account (for production)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd clean-calendar
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Start the database**
   ```bash
   npm run docker:dev
   ```

5. **Run database migrations**
   ```bash
   # Apply each migration in order
   psql $DATABASE_URL < supabase/migrations/001_initial_schema.sql
   # ... continue for all migrations
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Open the application**
   ```
   http://localhost:9002
   ```

## 📁 Project Structure

```
/src
  /app              # Next.js app router pages
    /api            # API routes
    /auth           # Authentication pages
    /cleaner        # Cleaner-specific pages
    /schedule       # Schedule management
  /components       # React components
  /hooks            # Custom React hooks
  /lib              # Utility functions and configs
  /types            # TypeScript type definitions
/supabase
  /migrations       # Database migration files
/docs               # Documentation
/scripts            # Utility scripts
```

## 🔧 Configuration

### Environment Variables

See `.env.example` for all available environment variables. Key variables:

- `DATABASE_URL` - PostgreSQL connection string
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `NEXT_PUBLIC_USE_AUTH` - Enable/disable authentication

### Authentication Modes

- **Dev Mode** (`NEXT_PUBLIC_USE_AUTH=false`): Uses mock user, no login required
- **Production Mode** (`NEXT_PUBLIC_USE_AUTH=true`): Requires Supabase authentication

## 📚 Documentation

- [API Documentation](docs/API_DOCUMENTATION.md)
- [Production Deployment](docs/PRODUCTION_DEPLOYMENT.md)
- [Google OAuth Setup](docs/OAUTH_NEXT_STEPS.md)
- [Mobile Calendar Sharing Plan](docs/MOBILE_CALENDAR_SHARING_PLAN.md)
- [Supabase Setup](docs/SUPABASE_SETUP.md)

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run integration tests
npm run test:integration

# Run e2e tests
npm run test:e2e
```

## 🚀 Deployment

See [PRODUCTION_DEPLOYMENT.md](docs/PRODUCTION_DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy to Vercel

1. Push to GitHub
2. Connect repository to Vercel
3. Add environment variables
4. Deploy

## 🔐 Security

- All API routes require authentication in production
- Database access uses Row Level Security (RLS)
- Environment variables for sensitive data
- HTTPS required for production

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## 📝 License

[Add your license here]

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Database hosting by [Supabase](https://supabase.com/)