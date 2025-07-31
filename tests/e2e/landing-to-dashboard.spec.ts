import { test, expect } from '@playwright/test'

test.describe('Landing Page to Dashboard Flow', () => {
  test('should display landing page with key elements', async ({ page }) => {
    await page.goto('/')
    
    // Check main headline
    await expect(page.getByRole('heading', { name: /Never Miss a Cleaning Again/i })).toBeVisible()
    
    // Check sign in button
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
    
    // Check pricing section
    await expect(page.getByText('Simple, fair pricing')).toBeVisible()
    
    // Check how it works section
    await expect(page.getByText('How it works')).toBeVisible()
  })

  test('should navigate to login when clicking sign in', async ({ page }) => {
    await page.goto('/')
    
    // Click sign in button
    await page.getByRole('button', { name: 'Sign in' }).click()
    
    // Should redirect to login page
    await expect(page).toHaveURL('/login')
  })

  test('should show calendar URL input and import flow', async ({ page }) => {
    await page.goto('/')
    
    // Find the calendar URL input
    const urlInput = page.getByPlaceholder(/paste.*calendar.*url/i)
    await expect(urlInput).toBeVisible()
    
    // Enter a test calendar URL
    await urlInput.fill('https://airbnb.com/calendar/ical/12345.ics')
    
    // Click import button
    await page.getByRole('button', { name: /import/i }).click()
    
    // Should redirect to login (since not authenticated)
    await expect(page).toHaveURL('/login')
  })

  test('should display pricing tiers correctly', async ({ page }) => {
    await page.goto('/')
    
    // Check all pricing tiers are visible
    await expect(page.getByText('Free')).toBeVisible()
    await expect(page.getByText('Starter')).toBeVisible()
    await expect(page.getByText('Pro')).toBeVisible()
    await expect(page.getByText('Enterprise')).toBeVisible()
    
    // Check trial information
    await expect(page.getByText(/21-day free trial/i)).toBeVisible()
  })

  test('should show mobile responsive layout', async ({ page, isMobile }) => {
    await page.goto('/')
    
    if (isMobile) {
      // On mobile, check that content is still accessible
      await expect(page.getByRole('heading', { name: /Never Miss a Cleaning Again/i })).toBeVisible()
      
      // Scroll to pricing section
      await page.getByText('Simple, fair pricing').scrollIntoViewIfNeeded()
      await expect(page.getByText('Simple, fair pricing')).toBeVisible()
    }
  })

  test('should access public pages without authentication', async ({ page }) => {
    // Terms page
    await page.goto('/terms')
    await expect(page.getByRole('heading', { name: 'Terms of Service' })).toBeVisible()
    
    // Privacy page
    await page.goto('/privacy')
    await expect(page.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible()
    
    // Cookies page
    await page.goto('/cookies')
    await expect(page.getByRole('heading', { name: 'Cookie Policy' })).toBeVisible()
  })
})