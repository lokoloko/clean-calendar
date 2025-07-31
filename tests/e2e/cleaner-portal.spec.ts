import { test, expect } from '@playwright/test'

test.describe('Cleaner Portal Flow', () => {
  test('should display cleaner login page', async ({ page }) => {
    await page.goto('/cleaner')
    
    // Check page title
    await expect(page.getByRole('heading', { name: 'Cleaner Portal' })).toBeVisible()
    
    // Check phone input
    await expect(page.getByPlaceholder(/phone number/i)).toBeVisible()
    
    // Check send code button
    await expect(page.getByRole('button', { name: /send code/i })).toBeVisible()
  })

  test('should validate phone number format', async ({ page }) => {
    await page.goto('/cleaner')
    
    const phoneInput = page.getByPlaceholder(/phone number/i)
    const sendButton = page.getByRole('button', { name: /send code/i })
    
    // Try invalid phone number
    await phoneInput.fill('123')
    await sendButton.click()
    
    // Should show error (exact message depends on implementation)
    await expect(page.getByText(/invalid|enter.*valid/i)).toBeVisible()
  })

  test('should proceed to verification page with valid phone', async ({ page }) => {
    await page.goto('/cleaner')
    
    const phoneInput = page.getByPlaceholder(/phone number/i)
    const sendButton = page.getByRole('button', { name: /send code/i })
    
    // Enter valid phone number
    await phoneInput.fill('555-123-4567')
    await sendButton.click()
    
    // Should navigate to verify page
    await expect(page).toHaveURL(/\/cleaner\/verify/)
    
    // Check verification page elements
    await expect(page.getByText(/enter.*code/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /verify/i })).toBeVisible()
  })

  test('should handle verification code input', async ({ page }) => {
    // Navigate directly to verify page with phone in URL
    await page.goto('/cleaner/verify?phone=555-123-4567')
    
    // Find code inputs (usually 6 separate inputs)
    const codeInputs = page.locator('input[maxlength="1"]')
    const inputCount = await codeInputs.count()
    
    // Should have 6 digit inputs
    expect(inputCount).toBe(6)
    
    // Enter code
    for (let i = 0; i < inputCount; i++) {
      await codeInputs.nth(i).fill(String(i + 1))
    }
    
    // Verify button should be enabled
    const verifyButton = page.getByRole('button', { name: /verify/i })
    await expect(verifyButton).toBeEnabled()
  })

  test('should show mobile-optimized layout', async ({ page, isMobile }) => {
    await page.goto('/cleaner')
    
    if (isMobile) {
      // Check that the page is mobile-friendly
      const viewport = page.viewportSize()
      expect(viewport?.width).toBeLessThanOrEqual(768)
      
      // Elements should still be visible and accessible
      await expect(page.getByRole('heading', { name: 'Cleaner Portal' })).toBeVisible()
      await expect(page.getByPlaceholder(/phone number/i)).toBeVisible()
    }
  })

  test.skip('should access cleaner dashboard after authentication', async ({ page }) => {
    // Skip this test as it requires actual authentication
    // In a real test environment, you would mock the auth or use test credentials
    
    await page.goto('/cleaner/dashboard')
    
    // Would check for dashboard elements like:
    // - Today's cleanings
    // - Progress indicators
    // - Cleaning cards
  })
})