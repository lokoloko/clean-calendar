# Turborepo Configuration

## Overview

This project uses Turborepo to manage multiple applications in a monorepo structure while keeping the main cleaning app at the root for minimal disruption.

## Structure

```
clean-calendar/
├── apps/
│   ├── cleaning/         # Wrapper for root app
│   │   └── package.json  # Redirects commands to root
│   └── analytics/        # Future analytics app
│       └── package.json
├── packages/             # Shared packages (future)
├── src/                  # Main cleaning app source
├── package.json          # Root package.json with workspaces
└── turbo.json           # Turborepo configuration
```

## Key Design Decision

Instead of moving the existing cleaning app into `apps/cleaning`, we created a minimal wrapper package.json that redirects all commands back to the root. This approach:

- ✅ Keeps all existing code in place
- ✅ Maintains all current URLs and routes
- ✅ Requires no path updates
- ✅ Works with existing deployment
- ✅ Allows gradual migration

## Usage

### Run specific app
```bash
# Run cleaning app
npx turbo run dev --filter=@cleancalendar/cleaning

# Run analytics app
npx turbo run dev --filter=@cleancalendar/analytics

# Or use npm scripts
npm run dev:turbo  # Runs all apps
```

### Build all apps
```bash
npm run build:turbo
```

### Run tests
```bash
npm run test  # Still works for root app
npx turbo run test  # Runs tests for all apps
```

## Adding New Apps

1. Create new directory: `mkdir apps/myapp`
2. Initialize with Next.js: `cd apps/myapp && npx create-next-app@latest . --typescript`
3. Update app name in package.json: `"name": "@cleancalendar/myapp"`
4. Run with turbo: `npx turbo run dev --filter=@cleancalendar/myapp`

## Benefits

- **Zero Breaking Changes**: Everything continues to work as before
- **Gradual Migration**: Can extract shared code when ready
- **Independent Development**: Apps can be developed separately
- **Shared Resources**: Database and auth remain centralized
- **Build Optimization**: Turbo caches builds and only rebuilds what changed

## Next Steps

1. Extract shared UI components to `packages/ui`
2. Create shared database client in `packages/database`
3. Move auth logic to `packages/auth`
4. Gradually update imports in the main app

This conservative approach ensures production stability while building the foundation for multi-app architecture.