import { test, expect } from '@playwright/test'

test.describe('Listings Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/listings')
  })

  test('should display listings page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Manage Listings')
    await expect(page.getByRole('button', { name: 'Add New Listing' })).toBeVisible()
  })

  test('should open add listing modal', async ({ page }) => {
    await page.getByRole('button', { name: 'Add New Listing' }).click()
    
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('Add New Listing')).toBeVisible()
    await expect(page.getByLabel('Listing Name')).toBeVisible()
  })

  test('should create a new listing', async ({ page }) => {
    await page.getByRole('button', { name: 'Add New Listing' }).click()
    
    // Fill in the form
    await page.getByLabel('Listing Name').fill('Test Beach House')
    await page.getByLabel('Cleaning Fee').fill('75')
    
    // Select timezone
    await page.getByRole('combobox').first().click()
    await page.getByRole('option', { name: 'Pacific Time' }).click()
    
    // Submit
    await page.getByRole('button', { name: 'Add Listing' }).click()
    
    // Verify success
    await expect(page.getByText('Listing created successfully')).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Test Beach House' })).toBeVisible()
  })

  test('should sort listings by name', async ({ page }) => {
    // Assuming there are already some listings
    const nameHeader = page.getByRole('button', { name: 'Listing Name' })
    
    // Click to sort ascending
    await nameHeader.click()
    await expect(nameHeader.locator('svg').first()).toBeVisible() // Up arrow
    
    // Click again to sort descending
    await nameHeader.click()
    await expect(nameHeader.locator('svg').last()).toBeVisible() // Down arrow
  })

  test('should sync individual listing', async ({ page }) => {
    // Find a listing with sync button
    const firstRow = page.locator('tr').nth(1)
    await firstRow.getByRole('button').last().click() // More menu
    
    await page.getByText('Sync Now').click()
    
    // Verify sync feedback
    await expect(page.getByText(/Synced \d+ bookings/)).toBeVisible()
  })
})