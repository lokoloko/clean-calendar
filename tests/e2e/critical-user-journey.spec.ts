import { test, expect } from '@playwright/test'
import { authenticateUser, createTestListing, createTestCleaner, waitForApiCalls } from './helpers/auth'

test.describe('Critical User Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate user before each test
    await authenticateUser(page)
  })

  test('complete setup flow: listing -> cleaner -> assignment', async ({ page }) => {
    // Step 1: Navigate to listings page
    await page.goto('/listings')
    await expect(page.getByRole('heading', { name: 'Listings' })).toBeVisible()
    
    // Step 2: Create a new listing
    await page.getByRole('button', { name: /add.*listing/i }).click()
    
    // Fill in listing details
    await page.getByLabel(/name/i).fill('Test Beach House')
    await page.getByLabel(/calendar.*url/i).fill('https://airbnb.com/calendar/ical/test123.ics')
    await page.getByLabel(/cleaning.*fee/i).fill('150')
    
    // Submit the form
    await page.getByRole('button', { name: /create|save/i }).click()
    
    // Wait for success and redirect
    await waitForApiCalls(page)
    await expect(page.getByText('Test Beach House')).toBeVisible()
    
    // Step 3: Navigate to cleaners page
    await page.goto('/cleaners')
    await expect(page.getByRole('heading', { name: 'Cleaners' })).toBeVisible()
    
    // Step 4: Add a new cleaner
    await page.getByRole('button', { name: /add.*cleaner/i }).click()
    
    // Fill in cleaner details
    await page.getByLabel(/name/i).fill('John Doe')
    await page.getByLabel(/phone/i).fill('555-123-4567')
    await page.getByLabel(/email/i).fill('john@example.com')
    
    // Submit the form
    await page.getByRole('button', { name: /create|save/i }).click()
    
    // Wait for success
    await waitForApiCalls(page)
    await expect(page.getByText('John Doe')).toBeVisible()
    
    // Step 5: Navigate to assignments
    await page.goto('/assignments')
    await expect(page.getByRole('heading', { name: 'Assignments' })).toBeVisible()
    
    // Step 6: Create assignment
    await page.getByRole('button', { name: /assign.*cleaner/i }).click()
    
    // Select listing and cleaner
    await page.getByLabel(/listing/i).selectOption({ label: 'Test Beach House' })
    await page.getByLabel(/cleaner/i).selectOption({ label: 'John Doe' })
    
    // Submit assignment
    await page.getByRole('button', { name: /assign|save/i }).click()
    
    // Verify assignment created
    await waitForApiCalls(page)
    await expect(page.getByText('Test Beach House')).toBeVisible()
    await expect(page.getByText('John Doe')).toBeVisible()
  })

  test('dashboard displays key metrics', async ({ page }) => {
    // Create test data first
    await createTestListing(page, { 
      name: 'Dashboard Test Listing',
      ics_url: 'https://airbnb.com/calendar/ical/dashboard123.ics'
    })
    await createTestCleaner(page, { 
      name: 'Dashboard Test Cleaner',
      phone: '555-999-8888' 
    })
    
    // Navigate to dashboard
    await page.goto('/dashboard')
    
    // Check metric cards are visible
    await expect(page.getByText(/total.*listings/i)).toBeVisible()
    await expect(page.getByText(/active.*cleaners/i)).toBeVisible()
    await expect(page.getByText(/upcoming.*cleanings/i)).toBeVisible()
    
    // Check sections
    await expect(page.getByText(/today.*cleanings/i)).toBeVisible()
    await expect(page.getByText(/needs.*attention/i)).toBeVisible()
    await expect(page.getByText(/recent.*activity/i)).toBeVisible()
    
    // Check sync button
    await expect(page.getByRole('button', { name: /sync.*all/i })).toBeVisible()
  })

  test('schedule view displays cleanings', async ({ page }) => {
    // Navigate to schedule
    await page.goto('/schedule')
    
    // Check view options
    await expect(page.getByRole('button', { name: /list.*view/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /weekly.*view/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /monthly.*view/i })).toBeVisible()
    
    // Check export functionality
    await expect(page.getByRole('button', { name: /export/i })).toBeVisible()
    
    // Switch between views
    await page.getByRole('button', { name: /weekly.*view/i }).click()
    await waitForApiCalls(page)
    
    // Weekly view should show days of week
    await expect(page.getByText(/monday/i)).toBeVisible()
    await expect(page.getByText(/sunday/i)).toBeVisible()
  })

  test('manual schedule creation', async ({ page }) => {
    // Ensure we have a listing and cleaner first
    await createTestListing(page, { name: 'Manual Schedule Test' })
    await createTestCleaner(page, { name: 'Manual Test Cleaner' })
    
    // Navigate to manual schedules
    await page.goto('/manual-schedules')
    
    // Create new manual schedule
    await page.getByRole('button', { name: /create.*schedule/i }).click()
    
    // Fill in details
    await page.getByLabel(/listing/i).selectOption({ label: 'Manual Schedule Test' })
    await page.getByLabel(/cleaner/i).selectOption({ label: 'Manual Test Cleaner' })
    await page.getByLabel(/frequency/i).selectOption('weekly')
    
    // Submit
    await page.getByRole('button', { name: /create|save/i }).click()
    
    // Verify creation
    await waitForApiCalls(page)
    await expect(page.getByText('Manual Schedule Test')).toBeVisible()
  })
})