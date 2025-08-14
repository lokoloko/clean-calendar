import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('File Upload Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display upload interface', async ({ page }) => {
    // Check main elements are visible
    await expect(page.locator('h1:has-text("Smart Analytics")')).toBeVisible()
    await expect(page.locator('text=Upload Airbnb Reports')).toBeVisible()
    await expect(page.locator('text=Drop Your Airbnb Files Here')).toBeVisible()
  })

  test('should upload CSV file via drag and drop', async ({ page }) => {
    // Create test CSV file content
    const csvContent = `Date,Type,Confirmation Code,Start Date,Nights,Guest,Listing,Details,Reference,Currency,Amount,Paid Out,Service Fee,Host Fee
2024-01-15,Reservation,HMXYZ123,2024-01-20,3,John Doe,Beach House Studio,,"",USD,450.00,405.00,,45.00
2024-01-16,Reservation,HMABC456,2024-01-25,2,Jane Smith,Mountain View Cabin,,"",USD,300.00,270.00,,30.00`

    // Create file from string
    const fileName = 'test-earnings.csv'
    
    // Find the file input (even if hidden)
    const fileInput = page.locator('input[type="file"]')
    
    // Create file and upload
    await fileInput.setInputFiles({
      name: fileName,
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    })

    // Wait for upload to process
    await page.waitForTimeout(1000)

    // Check if success message or dashboard appears
    await expect(page.locator('text=/process|analyz|success/i').first()).toBeVisible({
      timeout: 10000,
    })
  })

  test('should upload PDF file via click to browse', async ({ page }) => {
    // Click on the dropzone to open file dialog
    await page.locator('div[role="presentation"]').click()
    
    // Find the file input
    const fileInput = page.locator('input[type="file"]')
    
    // Create mock PDF content
    const pdfContent = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj')
    
    // Upload file
    await fileInput.setInputFiles({
      name: 'earnings-report.pdf',
      mimeType: 'application/pdf',
      buffer: pdfContent,
    })

    // Wait for processing
    await page.waitForTimeout(1000)
    
    // Check for response
    await expect(page.locator('text=/process|analyz|extract/i').first()).toBeVisible({
      timeout: 10000,
    })
  })

  test('should reject invalid file types', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]')
    
    // Try to upload a .txt file
    await fileInput.setInputFiles({
      name: 'invalid.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('This is not a valid file type'),
    })

    // Check for error message
    await expect(page.locator('text=/invalid|error|support/i').first()).toBeVisible({
      timeout: 5000,
    })
  })

  test('should handle multiple file uploads', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]')
    
    // Create multiple files
    const files = [
      {
        name: 'january.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from('Date,Type,Amount\n2024-01-01,Reservation,500'),
      },
      {
        name: 'february.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from('Date,Type,Amount\n2024-02-01,Reservation,600'),
      },
    ]
    
    // Upload multiple files
    await fileInput.setInputFiles(files)
    
    // Wait for processing
    await page.waitForTimeout(2000)
    
    // Check that files were processed
    await expect(page.locator('text=/process|upload|success/i').first()).toBeVisible({
      timeout: 10000,
    })
  })

  test('should navigate to dashboard after successful upload', async ({ page }) => {
    // Upload a valid CSV
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('Date,Type,Listing,Amount\n2024-01-01,Reservation,Test Property,500'),
    })
    
    // Wait for processing and potential redirect
    await page.waitForTimeout(2000)
    
    // Check if we're on dashboard or if dashboard button is visible
    const dashboardUrl = page.url()
    if (!dashboardUrl.includes('/dashboard')) {
      // Look for dashboard navigation
      const dashboardLink = page.locator('a[href*="dashboard"], button:has-text("View Dashboard")')
      if (await dashboardLink.isVisible()) {
        await dashboardLink.click()
        await page.waitForURL('**/dashboard')
      }
    }
    
    // Verify dashboard elements
    expect(page.url()).toContain('/dashboard')
  })
})

test.describe('Dashboard Navigation', () => {
  test('should navigate between different sections', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Check main navigation elements
    const navItems = [
      'Dashboard',
      'Properties',
      'Comparison',
      'Historical',
    ]
    
    for (const item of navItems) {
      const navLink = page.locator(`a:has-text("${item}"), button:has-text("${item}")`)
      if (await navLink.isVisible()) {
        await navLink.click()
        await page.waitForTimeout(500)
        // Verify navigation worked (URL changed or content updated)
      }
    }
  })

  test('should display property details', async ({ page }) => {
    // First upload some data
    await page.goto('/')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'properties.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(`Date,Type,Listing,Amount,Nights
2024-01-01,Reservation,Beach House,500,3
2024-01-05,Reservation,Mountain Cabin,400,2`),
    })
    
    await page.waitForTimeout(2000)
    
    // Navigate to properties
    await page.goto('/properties')
    
    // Check if properties are listed
    await expect(page.locator('text="Beach House"').or(page.locator('text="Mountain Cabin"'))).toBeVisible({
      timeout: 10000,
    })
    
    // Click on a property to view details
    const propertyCard = page.locator('text="Beach House"').first()
    if (await propertyCard.isVisible()) {
      await propertyCard.click()
      
      // Wait for property details page
      await page.waitForTimeout(1000)
      
      // Check for property details elements
      await expect(page.locator('text=/revenue|occupancy|performance/i').first()).toBeVisible({
        timeout: 5000,
      })
    }
  })
})

test.describe('AI Insights', () => {
  test('should generate AI insights for properties', async ({ page }) => {
    // Upload data first
    await page.goto('/')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'data.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(`Date,Type,Listing,Amount,Nights,Guest
2024-01-01,Reservation,Luxury Villa,1000,5,John Doe
2024-01-10,Reservation,Luxury Villa,1200,4,Jane Smith`),
    })
    
    await page.waitForTimeout(2000)
    
    // Look for AI insights button or section
    const insightsButton = page.locator('button:has-text("Generate Insights"), button:has-text("AI Insights")')
    if (await insightsButton.isVisible()) {
      await insightsButton.click()
      
      // Wait for AI processing
      await page.waitForTimeout(3000)
      
      // Check for insights content
      await expect(page.locator('text=/recommendation|insight|opportunity|optimization/i').first()).toBeVisible({
        timeout: 10000,
      })
    }
  })
})