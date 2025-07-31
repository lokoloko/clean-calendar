import { Page } from '@playwright/test'

/**
 * Helper to set up authentication for E2E tests
 * In development mode, clicking "Sign in with Google" sets a dev cookie
 */
export async function authenticateUser(page: Page) {
  // Navigate to login
  await page.goto('/login')
  
  // In dev mode, click the Google sign in button to set dev cookie
  await page.getByRole('button', { name: /sign in with google/i }).click()
  
  // Wait for redirect to dashboard
  await page.waitForURL('/dashboard')
}

/**
 * Helper to authenticate as a cleaner
 * Uses the mock authentication token
 */
export async function authenticateCleaner(page: Page, phone: string = '555-123-4567') {
  // Set the cleaner session cookie directly
  await page.context().addCookies([{
    name: 'cleaner-session',
    value: 'mock-token',
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    sameSite: 'Lax'
  }])
  
  // Navigate to cleaner dashboard
  await page.goto('/cleaner/dashboard')
}

/**
 * Helper to create test data via API
 */
export async function createTestListing(page: Page, data: {
  name: string
  ics_url?: string
  cleaning_fee?: number
}) {
  const response = await page.request.post('/api/listings', {
    data: {
      name: data.name,
      ics_url: data.ics_url || null,
      cleaning_fee: data.cleaning_fee || 100,
      timezone: 'America/New_York',
      is_active_on_airbnb: !!data.ics_url
    }
  })
  
  return response.json()
}

/**
 * Helper to create test cleaner via API
 */
export async function createTestCleaner(page: Page, data: {
  name: string
  phone?: string
  email?: string
}) {
  const response = await page.request.post('/api/cleaners', {
    data: {
      name: data.name,
      phone: data.phone,
      email: data.email
    }
  })
  
  return response.json()
}

/**
 * Helper to wait for API calls to complete
 */
export async function waitForApiCalls(page: Page) {
  // Wait for any pending API calls
  await page.waitForLoadState('networkidle')
}