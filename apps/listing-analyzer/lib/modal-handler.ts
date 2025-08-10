// Modal handler utilities for Airbnb pages
import { Page } from 'puppeteer-core'

export async function dismissTranslationModal(page: Page): Promise<void> {
  try {
    // Check for translation modal
    const translationModal = await page.$('[aria-label*="Translation"]')
    if (translationModal) {
      console.log('Translation modal detected, dismissing...')
      
      // Try to click X button
      const closeButton = await page.$('button[aria-label*="Close"], button[aria-label*="Dismiss"], [aria-label*="Close"] button')
      if (closeButton) {
        await closeButton.click()
        await new Promise(resolve => setTimeout(resolve, 1000))
        console.log('Translation modal dismissed')
      } else {
        // Try pressing Escape
        await page.keyboard.press('Escape')
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    // Also check for cookie consent modal
    const cookieModal = await page.$('[data-testid="cookie-policy-modal"], [aria-label*="Cookie"], [aria-label*="privacy"]')
    if (cookieModal) {
      console.log('Cookie modal detected, accepting...')
      const acceptButton = await page.$('button:has-text("Accept"), button:has-text("OK"), button:has-text("Got it")')
      if (acceptButton) {
        await acceptButton.click()
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
    
    // Check for any other blocking modals
    const genericModal = await page.$('[role="dialog"][aria-modal="true"]')
    if (genericModal) {
      // Check if it's not one of our data modals (amenities, reviews, etc)
      const modalText = await page.evaluate(() => {
        const modal = document.querySelector('[role="dialog"][aria-modal="true"]')
        return modal?.textContent || ''
      })
      
      if (!modalText.includes('amenities') && !modalText.includes('reviews') && !modalText.includes('photos')) {
        console.log('Generic modal detected, attempting to dismiss...')
        await page.keyboard.press('Escape')
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
  } catch (error) {
    console.log('Error handling modals:', error.message)
  }
}

export async function waitForContentLoad(page: Page): Promise<void> {
  try {
    // Wait for main content indicators
    await Promise.race([
      page.waitForSelector('h1', { timeout: 10000 }),
      page.waitForSelector('[data-testid="listing-title"]', { timeout: 10000 }),
      page.waitForSelector('div[role="heading"]', { timeout: 10000 })
    ])
    
    // Dismiss any blocking modals
    await dismissTranslationModal(page)
    
    // Additional wait for dynamic content
    await new Promise(resolve => setTimeout(resolve, 2000))
  } catch (error) {
    console.log('Content load timeout, continuing anyway...')
  }
}