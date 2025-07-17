import { test, expect } from '@playwright/test'

test.describe('Cleaner Portal', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/cleaner')
    
    await expect(page.getByText('Cleaner Login')).toBeVisible()
    await expect(page.getByPlaceholder('Enter your phone number')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Send Code' })).toBeVisible()
  })

  test('should navigate through login flow', async ({ page }) => {
    await page.goto('/cleaner')
    
    // Enter phone number
    await page.getByPlaceholder('Enter your phone number').fill('1234567890')
    await page.getByRole('button', { name: 'Send Code' }).click()
    
    // Should navigate to verification page
    await expect(page).toHaveURL('/cleaner/verify')
    await expect(page.getByText('Enter Verification Code')).toBeVisible()
    
    // Enter verification code (using mock auth)
    for (let i = 0; i < 6; i++) {
      await page.locator(`input[type="text"]`).nth(i).fill('1')
    }
    
    // Should navigate to dashboard
    await expect(page).toHaveURL('/cleaner/dashboard')
  })

  test('should display cleaner dashboard', async ({ page }) => {
    // Navigate directly with mock auth
    await page.goto('/cleaner/dashboard')
    
    await expect(page.getByText('Cleaner Dashboard')).toBeVisible()
    await expect(page.getByText("Today's Progress")).toBeVisible()
    
    // Check filter tabs
    await expect(page.getByRole('button', { name: 'Today' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'This Week' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible()
  })

  test('should navigate to cleaning detail', async ({ page }) => {
    await page.goto('/cleaner/dashboard')
    
    // Click on a cleaning card if available
    const cleaningCard = page.locator('.cursor-pointer').first()
    if (await cleaningCard.isVisible()) {
      await cleaningCard.click()
      
      await expect(page.getByText('Cleaning Details')).toBeVisible()
      await expect(page.getByText('Property Details')).toBeVisible()
      await expect(page.getByText('Cleaning Feedback')).toBeVisible()
    }
  })

  test('should submit cleaning feedback', async ({ page }) => {
    // Navigate to a specific cleaning
    await page.goto('/cleaner/cleaning/test-id')
    
    // Select cleanliness rating
    await page.getByRole('button', { name: /Clean.*very clean/ }).click()
    
    // Add notes
    await page.getByPlaceholder('Any issues, broken items').fill('Everything looks good!')
    
    // Submit
    await page.getByRole('button', { name: 'Complete Cleaning' }).click()
    
    // Verify success
    await expect(page.getByText('Cleaning completed')).toBeVisible()
  })

  test('should be mobile responsive', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip()
    }
    
    await page.goto('/cleaner/dashboard')
    
    // Verify mobile layout
    await expect(page.getByText('Cleaner Dashboard')).toBeVisible()
    
    // Check that cards are stacked vertically
    const cards = page.locator('.space-y-3')
    await expect(cards).toBeVisible()
  })
})