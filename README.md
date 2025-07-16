# CleanSweep Scheduler

A modern web application for managing cleaning schedules for short-term rental properties.

## Documentation
- [Implementation Details](./IMPLEMENTATION.md) - Comprehensive documentation of features and technical implementation
- [Development Setup](#getting-started) - Quick start guide below

## Features

- 📅 **Airbnb Calendar Sync** - Automatically sync bookings from Airbnb ICS feeds
- 👥 **Cleaner Management** - Manage your cleaning team and assignments
- 📊 **Analytics Dashboard** - Track occupancy rates and cleaning costs
- 📱 **Multiple Views** - List, weekly, and monthly calendar views
- 🔄 **Manual Scheduling** - Support for non-Airbnb properties and recurring cleanings
- 📤 **Export Functionality** - Text-based exports for easy communication
- 🌍 **Timezone Support** - Handle properties in different timezones
- 📱 **Mobile Cleaner Portal** - SMS-authenticated mobile interface for cleaners

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript
- **UI Components**: Shadcn/ui, Tailwind CSS
- **Database**: PostgreSQL
- **Containerization**: Docker & Docker Compose
- **Date Handling**: date-fns

## Getting Started

### Prerequisites
- Docker and Docker Compose installed
- Node.js 20+ (for local development without Docker)

### Quick Start

1. Clone the repository:
```bash
git clone https://github.com/yourusername/clean-calendar.git
cd clean-calendar
```

2. Start the application:
```bash
docker-compose up -d
```

3. Access the application:
```
http://localhost:9002
```

### Development Mode

For development with hot reload:
```bash
npm install
npm run dev
```

## Project Structure

```
clean-calendar/
├── src/
│   ├── app/              # Next.js app router pages
│   ├── components/       # React components
│   ├── contexts/         # React contexts
│   ├── hooks/           # Custom React hooks
│   └── lib/             # Utility functions and database
├── supabase/
│   └── migrations/      # Database migrations
├── public/              # Static assets
└── docker-compose.yml   # Docker configuration
```

## Environment Variables

Create a `.env.local` file for local development:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/cleansweep
NEXT_PUBLIC_SUPABASE_URL=http://localhost:9002
NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy-key-for-local-dev
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary software. All rights reserved.

## Support

For support, please contact the development team.