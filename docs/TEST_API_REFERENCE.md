# Test API Reference

## Test Utilities

### Error Handling (`src/lib/api-errors.ts`)

#### `ApiError`
Custom error class for API responses.

```typescript
new ApiError(statusCode: number, message: string, code?: string, details?: any)
```

**Example:**
```typescript
throw new ApiError(403, 'Access denied', 'FORBIDDEN', { userId: '123' })
```

#### `handleApiError`
Converts any error to a standardized API response.

```typescript
handleApiError(error: unknown, context?: { route?: string; method?: string }): NextResponse
```

**Example:**
```typescript
try {
  // ... api logic
} catch (error) {
  return handleApiError(error, { route: '/api/users', method: 'GET' })
}
```

#### `ApiResponses`
Helper functions for common error responses.

```typescript
ApiResponses.unauthorized(message?: string)
ApiResponses.forbidden(message?: string)
ApiResponses.notFound(resource: string)
ApiResponses.validationError(message: string, details?: any)
ApiResponses.conflict(message: string)
ApiResponses.internalError(message?: string)
ApiResponses.databaseError(message?: string)
```

### API Wrapper (`src/lib/api-wrapper.ts`)

#### `withApiHandler`
Wraps API route handlers with error handling and logging.

```typescript
withApiHandler(handler: ApiHandler, options?: WrapperOptions): ApiHandler
```

**Example:**
```typescript
export const GET = withApiHandler(async (req) => {
  const data = await fetchData()
  return NextResponse.json(data)
})
```

#### `parseRequestBody`
Parses and validates request body with Zod schema.

```typescript
parseRequestBody<T>(req: NextRequest, schema?: z.ZodSchema<T>): Promise<T>
```

**Example:**
```typescript
const body = await parseRequestBody(req, cleanerSchema)
// body is typed and validated
```

#### `parseQueryParams`
Parses and validates query parameters.

```typescript
parseQueryParams<T>(req: NextRequest, schema: z.ZodSchema<T>): T
```

**Example:**
```typescript
const { page, limit } = parseQueryParams(req, paginationSchema)
```

#### `createApiResponse`
Helper functions for creating consistent responses.

```typescript
createApiResponse.success(data: T, status?: number)
createApiResponse.created(data: T)
createApiResponse.noContent()
createApiResponse.paginated(data: T[], pagination: {...})
```

### Validation Schemas (`src/lib/validations/index.ts`)

#### Common Schemas

```typescript
// UUID validation
idSchema: z.string().uuid()

// Pagination with defaults
paginationSchema: z.object({
  page: z.coerce.number().default(1),
  limit: z.coerce.number().max(100).default(20)
})

// Date range with validation
dateRangeSchema: z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
})

// Phone number with regex
phoneSchema: z.string().regex(/^[\d\s\-\+\(\)]+$/).min(10).max(20)

// Email validation
emailSchema: z.string().email()
```

#### Entity Schemas

```typescript
// Cleaner validation
cleanerSchema: z.object({
  name: z.string().min(1).max(100),
  phone: phoneSchema,
  email: emailSchema.optional()
})

// Listing validation
listingSchema: z.object({
  name: z.string().min(1).max(100),
  ics_url: z.string().url().optional().nullable(),
  cleaning_fee: z.coerce.number().min(0).default(0),
  timezone: z.string().default('America/New_York'),
  is_active_on_airbnb: z.boolean().default(true)
})

// Assignment validation
assignmentSchema: z.object({
  listing_id: idSchema,
  cleaner_id: idSchema
})

// Feedback validation
feedbackSchema: z.object({
  schedule_item_id: idSchema,
  cleanliness_rating: z.enum(['clean', 'normal', 'dirty']).optional(),
  notes: z.string().max(500).optional(),
  completed_at: z.string().datetime().optional()
})
```

## E2E Test Helpers (`tests/e2e/helpers/auth.ts`)

#### `authenticateUser`
Sets up authentication for admin users in E2E tests.

```typescript
authenticateUser(page: Page): Promise<void>
```

**Example:**
```typescript
test.beforeEach(async ({ page }) => {
  await authenticateUser(page)
})
```

#### `authenticateCleaner`
Sets up authentication for cleaner users.

```typescript
authenticateCleaner(page: Page, phone?: string): Promise<void>
```

**Example:**
```typescript
await authenticateCleaner(page, '555-123-4567')
```

#### `createTestListing`
Creates a test listing via API.

```typescript
createTestListing(page: Page, data: {
  name: string
  ics_url?: string
  cleaning_fee?: number
}): Promise<any>
```

**Example:**
```typescript
const listing = await createTestListing(page, {
  name: 'Test Beach House',
  ics_url: 'https://airbnb.com/calendar/ical/123.ics',
  cleaning_fee: 150
})
```

#### `createTestCleaner`
Creates a test cleaner via API.

```typescript
createTestCleaner(page: Page, data: {
  name: string
  phone?: string
  email?: string
}): Promise<any>
```

#### `waitForApiCalls`
Waits for all pending API calls to complete.

```typescript
waitForApiCalls(page: Page): Promise<void>
```

## Mock Implementations

### Next.js Server Mocks (`src/test-utils/setup-tests.ts`)

The setup file provides global mocks for Next.js server components:

- `NextRequest` - Mock implementation with URL parsing
- `NextResponse` - Mock with static `json()` method
- `Headers` - Basic headers implementation

### Authentication Mocks

```typescript
// Mock successful authentication
jest.mock('@/lib/auth-server', () => ({
  requireAuth: jest.fn().mockResolvedValue({ 
    id: 'user-123', 
    email: 'test@example.com' 
  }),
  getCurrentUser: jest.fn().mockResolvedValue({ 
    id: 'user-123', 
    email: 'test@example.com' 
  })
}))

// Mock authentication failure
mockedRequireAuth.mockRejectedValue(new Error('Unauthorized'))
```

### Database Mocks

```typescript
// Mock database query
jest.mock('@/lib/db', () => ({
  db: {
    query: jest.fn().mockResolvedValue({ rows: [] }),
    getUser: jest.fn(),
    createCleaner: jest.fn(),
    transaction: jest.fn()
  }
}))

// Mock transaction
mockedDb.transaction.mockImplementation(async (callback) => {
  const client = { query: jest.fn() }
  return callback(client)
})
```

## Test Assertions

### Common Jest Matchers

```typescript
// Equality
expect(value).toBe(expected)          // Strict equality
expect(value).toEqual(expected)       // Deep equality

// Truthiness
expect(value).toBeTruthy()
expect(value).toBeFalsy()
expect(value).toBeNull()
expect(value).toBeDefined()

// Numbers
expect(value).toBeGreaterThan(3)
expect(value).toBeGreaterThanOrEqual(3.5)
expect(value).toBeLessThan(5)
expect(value).toBeCloseTo(0.3)

// Strings
expect(string).toMatch(/pattern/)
expect(string).toContain('substring')

// Arrays
expect(array).toContain(item)
expect(array).toHaveLength(3)

// Objects
expect(object).toHaveProperty('key')
expect(object).toMatchObject({ key: 'value' })

// Functions
expect(mockFn).toHaveBeenCalled()
expect(mockFn).toHaveBeenCalledWith(arg1, arg2)
expect(mockFn).toHaveBeenCalledTimes(1)

// Errors
expect(() => throwingFn()).toThrow()
expect(() => throwingFn()).toThrow('error message')
```

### Playwright Assertions

```typescript
// Visibility
await expect(element).toBeVisible()
await expect(element).toBeHidden()

// Text content
await expect(element).toHaveText('text')
await expect(element).toContainText('partial')

// Attributes
await expect(element).toHaveAttribute('href', '/path')
await expect(element).toHaveClass('active')

// State
await expect(element).toBeEnabled()
await expect(element).toBeDisabled()
await expect(element).toBeChecked()

// Page assertions
await expect(page).toHaveURL('/dashboard')
await expect(page).toHaveTitle('Page Title')

// Count
await expect(page.locator('.item')).toHaveCount(5)
```