# Test Checklist for New Features

Use this checklist when adding new features to ensure comprehensive test coverage.

## 🎯 Feature: ___________________

### 📋 Pre-Development
- [ ] Identify test requirements from user stories
- [ ] Plan test scenarios (happy path + edge cases)
- [ ] Set up test data requirements

### 🧪 Unit Tests
- [ ] **Input Validation**
  - [ ] Valid inputs pass
  - [ ] Invalid inputs fail with proper errors
  - [ ] Edge cases handled (empty, null, undefined)
  - [ ] Boundary values tested

- [ ] **Business Logic**
  - [ ] Core functionality works as expected
  - [ ] All conditional branches covered
  - [ ] Error states handled gracefully
  - [ ] Return values match expectations

- [ ] **Data Transformations**
  - [ ] Input data correctly transformed
  - [ ] Output format matches schema
  - [ ] Type conversions work properly

### 🔌 API Tests
- [ ] **Authentication**
  - [ ] Unauthenticated requests return 401
  - [ ] Invalid tokens rejected
  - [ ] User permissions checked

- [ ] **Request Handling**
  - [ ] Valid requests return correct status codes
  - [ ] Request body validation works
  - [ ] Query parameters parsed correctly
  - [ ] Headers processed properly

- [ ] **Response Format**
  - [ ] Success responses match schema
  - [ ] Error responses use standard format
  - [ ] Pagination works correctly
  - [ ] Data filtering applies properly

- [ ] **Database Operations**
  - [ ] Create operations work
  - [ ] Read operations return correct data
  - [ ] Update operations apply changes
  - [ ] Delete operations remove data
  - [ ] Transactions rollback on error

### 🌐 E2E Tests
- [ ] **User Flows**
  - [ ] Complete happy path works
  - [ ] Form submissions process correctly
  - [ ] Navigation flows as expected
  - [ ] Data persists between pages

- [ ] **UI Interactions**
  - [ ] Buttons clickable and functional
  - [ ] Forms validate on submit
  - [ ] Error messages display correctly
  - [ ] Loading states show appropriately

- [ ] **Cross-browser**
  - [ ] Works in Chrome
  - [ ] Works in mobile view
  - [ ] Responsive design adapts

### 🔍 Edge Cases
- [ ] **Data Boundaries**
  - [ ] Empty data sets handled
  - [ ] Maximum data limits respected
  - [ ] Special characters processed
  - [ ] Unicode/emoji support

- [ ] **Concurrency**
  - [ ] Multiple simultaneous requests handled
  - [ ] Race conditions prevented
  - [ ] Optimistic locking works

- [ ] **Error Scenarios**
  - [ ] Network failures handled
  - [ ] Database connection errors caught
  - [ ] Third-party service failures managed
  - [ ] Timeout scenarios covered

### 📊 Performance
- [ ] **Response Times**
  - [ ] API responses < 200ms
  - [ ] Page loads < 3 seconds
  - [ ] No memory leaks

- [ ] **Load Testing**
  - [ ] Handles expected user load
  - [ ] Graceful degradation under stress
  - [ ] Database queries optimized

### 🔒 Security
- [ ] **Input Sanitization**
  - [ ] SQL injection prevented
  - [ ] XSS attacks blocked
  - [ ] CSRF protection active

- [ ] **Access Control**
  - [ ] User can only access own data
  - [ ] Admin features restricted
  - [ ] API rate limiting works

### 📝 Documentation
- [ ] **Test Documentation**
  - [ ] Test purpose clearly described
  - [ ] Test data requirements documented
  - [ ] Expected outcomes defined

- [ ] **Code Coverage**
  - [ ] Minimum 80% line coverage
  - [ ] Critical paths 100% covered
  - [ ] Coverage report reviewed

### ✅ Final Checks
- [ ] All tests pass locally
- [ ] No console errors in tests
- [ ] Mocks properly cleaned up
- [ ] Test names descriptive
- [ ] No flaky tests
- [ ] CI/CD pipeline passes

## Example Feature Test Plan

### Feature: "Add Cleaner Notes"

#### Unit Tests
```typescript
// Validation
✓ should accept notes up to 500 characters
✓ should reject notes over 500 characters
✓ should sanitize HTML from notes
✓ should handle emoji in notes

// Business Logic
✓ should append note with timestamp
✓ should maintain note history
✓ should associate note with user
```

#### API Tests
```typescript
// POST /api/cleaners/:id/notes
✓ should require authentication
✓ should validate cleaner ownership
✓ should create note successfully
✓ should return 404 for invalid cleaner
✓ should handle database errors
```

#### E2E Tests
```typescript
// Cleaner Notes Flow
✓ should show notes section on cleaner page
✓ should add note via form submission
✓ should display note after creation
✓ should show note history
✓ should handle long notes with scroll
```

## Quick Test Writing Guide

### 1. Start with the simplest test
```typescript
it('should exist', () => {
  expect(myFunction).toBeDefined()
})
```

### 2. Add happy path
```typescript
it('should return expected result', () => {
  const result = myFunction('input')
  expect(result).toBe('expected output')
})
```

### 3. Add edge cases
```typescript
it('should handle empty input', () => {
  const result = myFunction('')
  expect(result).toBe(null)
})
```

### 4. Add error cases
```typescript
it('should throw on invalid input', () => {
  expect(() => myFunction(null)).toThrow('Input required')
})
```

### 5. Add integration test
```typescript
it('should work with real dependencies', async () => {
  const result = await myApiRoute(request)
  expect(result.status).toBe(200)
})
```