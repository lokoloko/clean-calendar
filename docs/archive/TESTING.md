# Testing Guide for CleanSweep Scheduler

This document outlines the testing strategy and setup for the CleanSweep Scheduler application.

## Overview

Our testing suite includes:
- **Unit Tests**: Component and function-level tests
- **Integration Tests**: Database and API endpoint tests
- **E2E Tests**: Full user workflow tests using Playwright
- **Docker Tests**: Container-based testing environment

## Test Structure

```
├── src/__tests__/          # Unit tests
│   ├── components/         # React component tests
│   ├── api/               # API route tests
│   └── lib/               # Utility function tests
├── tests/
│   ├── integration/       # Integration tests
│   └── e2e/              # End-to-end tests
├── jest.config.js         # Jest configuration
├── jest.setup.js          # Jest setup file
├── playwright.config.ts   # Playwright configuration
└── docker-compose.test.yml # Docker test environment
```

## Running Tests

### Quick Start

```bash
# Install dependencies
npm install

# Run all tests
npm run test:all

# Or use the test runner script
./scripts/run-tests.sh
```

### Individual Test Suites

#### Unit Tests
```bash
# Run unit tests
npm run test

# Watch mode for development
npm run test:watch

# Generate coverage report
npm run test:coverage
```

#### Integration Tests
```bash
# Start test database
docker-compose -f docker-compose.test.yml up -d test-db

# Run integration tests
npm run test:integration
```

#### E2E Tests
```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run E2E tests
npm run test:e2e

# Run with UI mode for debugging
npm run test:e2e:ui
```

#### Docker Tests
```bash
# Run tests in Docker environment
npm run test:docker
```

## Writing Tests

### Unit Test Example

```typescript
// src/__tests__/components/my-component.test.tsx
import { render, screen } from '@testing-library/react'
import MyComponent from '@/components/my-component'

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent title="Test" />)
    expect(screen.getByText('Test')).toBeInTheDocument()
  })
})
```

### Integration Test Example

```typescript
// tests/integration/api.test.ts
import { testPool, seedTestData } from './setup'

describe('API Integration', () => {
  beforeEach(async () => {
    await seedTestData()
  })

  it('should create a listing', async () => {
    const response = await fetch('/api/listings', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test' })
    })
    expect(response.status).toBe(200)
  })
})
```

### E2E Test Example

```typescript
// tests/e2e/user-flow.spec.ts
import { test, expect } from '@playwright/test'

test('user can create a listing', async ({ page }) => {
  await page.goto('/listings')
  await page.click('button:has-text("Add New Listing")')
  await page.fill('input[name="name"]', 'Test Listing')
  await page.click('button:has-text("Save")')
  await expect(page.locator('text=Test Listing')).toBeVisible()
})
```

## Test Database

The test suite uses a separate PostgreSQL database (`cleansweep_test`) to avoid affecting development data.

### Setup Test Database

```bash
# Using Docker
docker run -d \
  --name cleansweep-test-db \
  -e POSTGRES_DB=cleansweep_test \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5434:5432 \
  postgres:16-alpine

# Run migrations
psql postgresql://postgres:postgres@localhost:5434/cleansweep_test < supabase/migrations/*.sql
```

## Mocking

### Database Mocking

```typescript
// Mock pg module
jest.mock('pg', () => {
  const mPool = {
    query: jest.fn(),
    end: jest.fn(),
  }
  return { Pool: jest.fn(() => mPool) }
})
```

### API Mocking

```typescript
// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: async () => ({ data: 'test' }),
  })
)
```

### Next.js Router Mocking

Router mocking is configured in `jest.setup.js` for all tests.

## CI/CD Integration

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main`

See `.github/workflows/test.yml` for the CI configuration.

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Clean State**: Always clean up test data after tests
3. **Descriptive Names**: Use clear, descriptive test names
4. **Arrange-Act-Assert**: Follow the AAA pattern
5. **Mock External Services**: Don't make real API calls in tests
6. **Test User Flows**: E2E tests should mirror real user behavior

## Coverage Goals

- Unit Tests: 80% coverage
- Integration Tests: Critical paths covered
- E2E Tests: Main user workflows

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Ensure Docker is running
   - Check database ports aren't in use
   - Verify DATABASE_URL environment variable

2. **Playwright Tests Failing**
   - Run `npx playwright install` to install browsers
   - Check the app is running on port 9002
   - Use `npm run test:e2e:ui` for debugging

3. **Jest Module Resolution**
   - Clear jest cache: `jest --clearCache`
   - Check tsconfig paths match jest config

## Useful Commands

```bash
# Run specific test file
npm test -- listings.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should create"

# Update snapshots
npm test -- -u

# Debug Playwright test
npx playwright test --debug

# Show Playwright report
npx playwright show-report
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Next.js Testing](https://nextjs.org/docs/testing)