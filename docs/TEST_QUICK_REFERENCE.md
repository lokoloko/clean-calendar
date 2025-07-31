# Test Quick Reference

## 🚀 Common Test Commands

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run specific file
npm run test -- src/lib/__tests__/api-errors.test.ts

# Run tests matching name
npm run test -- --testNamePattern="should create"

# Run E2E tests
npm run test:e2e

# Run everything
./run-tests.sh
```

## 📁 Test File Locations

| Test Type | Location | Example |
|-----------|----------|---------|
| Unit Tests | `src/**/__tests__/` | `src/lib/__tests__/api-errors.test.ts` |
| API Tests | `src/app/api/__tests__/` | `src/app/api/__tests__/cleaners.route.test.ts` |
| E2E Tests | `tests/e2e/` | `tests/e2e/landing-to-dashboard.spec.ts` |
| Test Utils | `src/test-utils/` | `src/test-utils/setup-tests.ts` |

## ✅ Test Coverage (80/85 passing)

### Fully Passing ✅
- **API Error Handling** - All error scenarios covered
- **API Wrapper** - Request/response handling verified
- **Validation Schemas** - All Zod schemas tested

### Partial Coverage ⚠️
- **Cleaners API** - 5/7 tests passing
- **Dashboard Metrics** - 2/5 tests passing

## 🧪 Test Patterns

### Mock Authentication
```typescript
jest.mock('@/lib/auth-server', () => ({
  requireAuth: jest.fn().mockResolvedValue({ id: 'user-123' })
}))
```

### Mock Database
```typescript
jest.mock('@/lib/db', () => ({
  db: {
    getCleaners: jest.fn().mockResolvedValue([])
  }
}))
```

### Mock Next.js Request
```typescript
const request = new NextRequest('http://localhost/api/test')
```

### E2E Page Interaction
```typescript
await page.goto('/')
await page.getByRole('button', { name: 'Sign in' }).click()
await expect(page).toHaveURL('/login')
```

## 🐛 Debug Commands

```bash
# Verbose output
npm run test -- --verbose

# Run failed tests only
npm run test -- --onlyFailures

# Update snapshots
npm run test -- -u

# Run tests in band (no parallel)
npm run test -- --runInBand

# With node debugger
node --inspect-brk node_modules/.bin/jest
```

## 📊 Coverage Reports

After running `npm run test:coverage`:
- HTML Report: `coverage/lcov-report/index.html`
- Console Summary: Shows % coverage per file
- Coverage Goals: 
  - Statements: 80%+
  - Branches: 70%+
  - Functions: 80%+
  - Lines: 80%+

## 🔧 Common Fixes

| Issue | Solution |
|-------|----------|
| "Request is not defined" | Check `jest.setup.js` includes polyfills |
| Mock not called | Ensure mock is before import |
| Timeout error | Add `await` to async operations |
| Validation fails | Check exact error with `console.log(error.errors)` |

## 📝 Adding New Tests

1. **Create test file**: `[name].test.ts` or `[name].spec.ts`
2. **Import test subject**: `import { functionToTest } from '../module'`
3. **Write test**: Follow AAA pattern (Arrange, Act, Assert)
4. **Run test**: `npm run test:watch`
5. **Check coverage**: `npm run test:coverage`