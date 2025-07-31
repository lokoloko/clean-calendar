# Testing Guide for GoStudioM Scheduler

## Table of Contents
1. [Overview](#overview)
2. [Test Architecture](#test-architecture)
3. [Running Tests](#running-tests)
4. [Unit Tests](#unit-tests)
5. [Integration Tests](#integration-tests)
6. [E2E Tests](#e2e-tests)
7. [Writing New Tests](#writing-new-tests)
8. [Troubleshooting](#troubleshooting)

## Overview

GoStudioM uses a comprehensive testing strategy with three levels of tests:
- **Unit Tests**: Test individual functions and components in isolation
- **Integration Tests**: Test API endpoints with mocked database
- **E2E Tests**: Test complete user workflows in a browser

### Test Stack
- **Jest**: Unit and integration testing framework
- **Playwright**: E2E testing framework
- **Testing Library**: React component testing utilities
- **TypeScript**: Type-safe test writing

## Test Architecture

```
/Volumes/WORKING/Projects/clean-calendar/
├── src/
│   ├── lib/
│   │   └── __tests__/          # Library unit tests
│   ├── app/
│   │   └── api/
│   │       └── __tests__/      # API route tests
│   └── test-utils/             # Test utilities and mocks
├── tests/
│   └── e2e/                    # End-to-end tests
│       └── helpers/            # E2E helper functions
├── jest.config.js              # Jest configuration
├── jest.setup.js               # Jest setup file
├── playwright.config.ts        # Playwright configuration
└── run-tests.sh               # Test runner script
```

## Running Tests

### Quick Commands

```bash
# Run all unit tests
npm run test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run a specific test file
npm run test -- src/lib/__tests__/api-errors.test.ts

# Run tests matching a pattern
npm run test -- --testNamePattern="should create cleaner"

# Run E2E tests
npm run test:e2e

# Run all test suites
./run-tests.sh
```

### Test Scripts

The `run-tests.sh` script runs all test types in sequence:
1. Unit tests
2. TypeScript type checking
3. ESLint checks

## Unit Tests

### API Error Handling Tests
**File**: `src/lib/__tests__/api-errors.test.ts`

Tests the standardized error handling system:

```typescript
// Example test
it('should handle ApiError instances correctly', () => {
  const apiError = new ApiError(403, 'Forbidden', ErrorCodes.FORBIDDEN)
  const response = handleApiError(apiError)
  
  expect(response.status).toBe(403)
})
```

**What it tests**:
- ApiError class creation with status codes
- Error response formatting
- Specific error scenarios (unauthorized, duplicate key, etc.)
- Request ID generation for tracking
- Environment-specific error messages

### API Wrapper Tests
**File**: `src/lib/__tests__/api-wrapper.test.ts`

Tests the API route wrapper functionality:

```typescript
// Example test
it('should wrap handler and return successful response', async () => {
  const handler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }))
  const wrappedHandler = withApiHandler(handler)
  
  const response = await wrappedHandler(mockRequest)
  expect(response).toBeDefined()
})
```

**What it tests**:
- Request/response wrapping
- Error handling in wrapped handlers
- Request logging functionality
- JSON body parsing with validation
- Query parameter parsing
- Response helper functions

### Validation Schema Tests
**File**: `src/lib/validations/__tests__/index.test.ts`

Tests all Zod validation schemas:

```typescript
// Example test
it('should validate cleaner data', () => {
  const cleaner = {
    name: 'John Doe',
    phone: '555-123-4567',
    email: 'john@example.com'
  }
  expect(cleanerSchema.parse(cleaner)).toEqual(cleaner)
})
```

**What it tests**:
- UUID validation
- Pagination parameters
- Date range validation
- Phone number formats
- Email validation
- Entity schemas (cleaners, listings, etc.)
- Custom validation rules
- Default values

## Integration Tests

### Cleaners API Route Tests
**File**: `src/app/api/__tests__/cleaners.route.test.ts`

Tests the cleaners API endpoints:

```typescript
// Example test
it('should return cleaners for authenticated user', async () => {
  mockedDb.getCleaners.mockResolvedValue(mockCleaners)
  
  const response = await GET(request)
  
  expect(response.status).toBe(200)
  const data = await response.json()
  expect(data.data).toEqual(mockCleaners)
})
```

**What it tests**:
- GET /api/cleaners - List all cleaners
- POST /api/cleaners - Create new cleaner
- Authentication requirements
- Subscription limit checking
- Input validation
- Error responses

### Dashboard Metrics Tests
**File**: `src/app/api/__tests__/dashboard-metrics.route.test.ts`

Tests the unified dashboard metrics endpoint:

```typescript
// Example test
it('should return metrics for authenticated user', async () => {
  mockedGetCurrentUser.mockResolvedValue(mockUser)
  // ... mock database responses
  
  const response = await GET(request)
  expect(response.status).toBe(200)
})
```

**What it tests**:
- Unified metrics endpoint performance
- Authentication checking
- Database transaction handling
- Caching behavior
- Metric calculations
- Error handling

## E2E Tests

### Landing Page Flow
**File**: `tests/e2e/landing-to-dashboard.spec.ts`

Tests the public landing page experience:

```typescript
test('should display landing page with key elements', async ({ page }) => {
  await page.goto('/')
  
  await expect(page.getByRole('heading', { 
    name: /Never Miss a Cleaning Again/i 
  })).toBeVisible()
})
```

**What it tests**:
- Homepage content display
- Navigation to login
- Calendar URL import flow
- Pricing tier display
- Mobile responsiveness
- Public page access (Terms, Privacy, Cookies)

### Cleaner Portal Flow
**File**: `tests/e2e/cleaner-portal.spec.ts`

Tests the mobile cleaner authentication:

```typescript
test('should validate phone number format', async ({ page }) => {
  await page.goto('/cleaner')
  
  const phoneInput = page.getByPlaceholder(/phone number/i)
  await phoneInput.fill('123')
  
  await expect(page.getByText(/invalid/i)).toBeVisible()
})
```

**What it tests**:
- Phone number validation
- SMS code verification flow
- Mobile-optimized layout
- Session management

### Critical User Journey
**File**: `tests/e2e/critical-user-journey.spec.ts`

Tests the complete setup flow:

```typescript
test('complete setup flow: listing -> cleaner -> assignment', async ({ page }) => {
  await authenticateUser(page)
  
  // Create listing
  await page.goto('/listings')
  await page.getByRole('button', { name: /add.*listing/i }).click()
  // ... complete flow
})
```

**What it tests**:
- Complete onboarding flow
- Listing creation with calendar sync
- Cleaner management
- Assignment creation
- Dashboard metrics display
- Schedule management

## Writing New Tests

### Unit Test Template

```typescript
import { functionToTest } from '../module'

describe('Module Name', () => {
  beforeEach(() => {
    // Setup before each test
    jest.clearAllMocks()
  })

  it('should do something specific', () => {
    // Arrange
    const input = 'test'
    
    // Act
    const result = functionToTest(input)
    
    // Assert
    expect(result).toBe('expected')
  })
})
```

### API Route Test Template

```typescript
import { GET, POST } from '../route'
import { NextRequest } from 'next/server'

// Mock dependencies
jest.mock('@/lib/auth-server', () => ({
  requireAuth: jest.fn()
}))

describe('API Route Name', () => {
  it('should handle GET request', async () => {
    const request = new NextRequest('http://localhost/api/endpoint')
    const response = await GET(request)
    
    expect(response.status).toBe(200)
  })
})
```

### E2E Test Template

```typescript
import { test, expect } from '@playwright/test'

test.describe('Feature Name', () => {
  test('should perform user action', async ({ page }) => {
    await page.goto('/page')
    
    // Interact with page
    await page.getByRole('button', { name: 'Click me' }).click()
    
    // Assert result
    await expect(page.getByText('Success')).toBeVisible()
  })
})
```

## Troubleshooting

### Common Issues

#### 1. "Request is not defined" Error
**Problem**: Next.js server components not available in test environment
**Solution**: Already handled by global mocks in `setup-tests.ts`

#### 2. Mock Not Being Called
**Problem**: Jest mock not registering calls
**Solution**: Ensure mock is set up before importing the module:
```typescript
// ❌ Wrong
import { moduleToTest } from './module'
jest.mock('./dependency')

// ✅ Correct
jest.mock('./dependency')
import { moduleToTest } from './module'
```

#### 3. Async Test Timeout
**Problem**: Test times out waiting for async operation
**Solution**: Ensure all promises are awaited:
```typescript
// ❌ Wrong
it('should work', () => {
  const result = asyncFunction()
  expect(result).toBe('value')
})

// ✅ Correct
it('should work', async () => {
  const result = await asyncFunction()
  expect(result).toBe('value')
})
```

#### 4. Validation Error in Tests
**Problem**: Zod validation failing unexpectedly
**Solution**: Check exact error message:
```typescript
try {
  schema.parse(data)
} catch (error) {
  console.log(error.errors) // See exact validation errors
}
```

### Debugging Tests

1. **Run single test with logs**:
   ```bash
   npm run test -- --verbose path/to/test.ts
   ```

2. **Add console logs** (automatically cleaned up):
   ```typescript
   console.log('Debug:', variable)
   ```

3. **Use debugger**:
   ```typescript
   debugger // Pause execution here
   ```
   Then run: `node --inspect-brk node_modules/.bin/jest`

4. **Check mock calls**:
   ```typescript
   console.log(mockFunction.mock.calls) // See all calls
   console.log(mockFunction.mock.calls[0]) // See first call args
   ```

## Best Practices

### 1. Test Organization
- Keep tests close to the code they test
- Use descriptive test names
- Group related tests with `describe` blocks

### 2. Mocking
- Only mock external dependencies
- Keep mocks simple and focused
- Reset mocks between tests

### 3. Assertions
- Test one thing per test
- Use specific matchers (`toBe`, `toEqual`, etc.)
- Test both success and error cases

### 4. Performance
- Use `beforeAll` for expensive setup
- Clean up after tests with `afterEach`
- Avoid testing implementation details

### 5. Maintenance
- Update tests when changing functionality
- Remove obsolete tests
- Keep test data realistic