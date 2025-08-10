// Modal extraction helpers for comprehensive Airbnb data scraping
import { Page } from 'puppeteer-core'

// Helper to find button by text pattern
export async function findButtonByText(page: Page, textPattern: string): Promise<any> {
  return await page.evaluateHandle((pattern) => {
    const buttons = Array.from(document.querySelectorAll('button'))
    const regex = new RegExp(pattern, 'i')
    
    for (const button of buttons) {
      const text = button.textContent || ''
      const ariaLabel = button.getAttribute('aria-label') || ''
      if (regex.test(text) || regex.test(ariaLabel)) {
        return button
      }
    }
    return null
  }, textPattern)
}

// Human-like click with mouse movement
export async function clickWithHumanBehavior(page: Page, element: any): Promise<void> {
  if (!element) return
  
  try {
    // Get element position
    const box = await element.boundingBox()
    if (box) {
      // Move mouse to element
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200))
    }
    
    // Click element
    await element.click()
  } catch (e) {
    // Fallback to evaluate click
    await page.evaluate((el) => el.click(), element)
  }
}

// Wait for modal to appear
export async function waitForModal(page: Page, timeout = 5000): Promise<boolean> {
  try {
    await page.waitForSelector('[role="dialog"], [aria-modal="true"]', { timeout })
    await new Promise(resolve => setTimeout(resolve, 1000)) // Let modal fully render
    return true
  } catch {
    return false
  }
}

// Close modal
export async function closeModal(page: Page): Promise<void> {
  try {
    // Try ESC key first
    await page.keyboard.press('Escape')
    await new Promise(resolve => setTimeout(resolve, 500))
  } catch {
    // Try clicking close button
    const closeButton = await page.$('[aria-label*="close"], button[aria-label*="Close"]')
    if (closeButton) {
      await closeButton.click()
    }
  }
}

// Scroll modal content and return new height
export async function scrollModalContent(page: Page): Promise<number> {
  return await page.evaluate(() => {
    const modal = document.querySelector('[role="dialog"], [aria-modal="true"]')
    if (!modal) return 0
    
    // Find scrollable container within modal
    const scrollables = modal.querySelectorAll('[style*="overflow"], [class*="scroll"]')
    let scrollContainer = modal
    
    // Find the actual scrollable container
    for (const el of scrollables) {
      const style = window.getComputedStyle(el)
      if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
        scrollContainer = el
        break
      }
    }
    
    // Scroll the container
    const previousHeight = scrollContainer.scrollHeight
    scrollContainer.scrollBy(0, 500)
    
    return scrollContainer.scrollHeight
  })
}

// Extract amenities with scrolling
export async function extractAllAmenities(page: Page): Promise<string[]> {
  const amenities = new Set<string>()
  let previousHeight = 0
  let currentHeight = 0
  let scrollAttempts = 0
  const maxScrolls = 30
  
  do {
    previousHeight = currentHeight
    
    // Extract visible amenities
    const newAmenities = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"], [aria-modal="true"]')
      if (!modal) return []
      
      const items: string[] = []
      const foundTexts = new Set<string>()
      
      // Strategy 1: Look for list items in the modal
      const listItems = modal.querySelectorAll('li, [role="listitem"], div[dir="ltr"]')
      listItems.forEach(item => {
        // Check if this looks like an amenity (has an icon or is in a list)
        const text = item.textContent?.trim() || ''
        const hasIcon = item.querySelector('svg, img, [aria-hidden="true"]')
        
        if (text && text.length > 2 && text.length < 150 && !foundTexts.has(text)) {
          // Filter out navigation and UI elements
          if (!text.match(/Show (all|more)/i) && 
              !text.match(/^(What this place offers|Amenities)$/i) &&
              !text.includes('amenities') &&
              !text.includes('Search by amenity')) {
            foundTexts.add(text)
            items.push(text)
          }
        }
      })
      
      // Strategy 2: If no items found, look for divs with specific patterns
      if (items.length === 0) {
        const divs = modal.querySelectorAll('div')
        divs.forEach(div => {
          // Only process leaf nodes (no children or only text)
          if (div.children.length <= 1) {
            const text = div.textContent?.trim() || ''
            
            // Check if it matches amenity patterns
            const amenityPatterns = [
              /^(Wifi|Kitchen|Parking|TV|Washer|Dryer|Pool|Gym)/i,
              /^(Air conditioning|Heating|Hot tub|Workspace)/i,
              /^(Coffee|Microwave|Refrigerator|Dishwasher)/i,
              /^(Hair dryer|Iron|Shampoo|Towels|Soap)/i,
              /^(Smoke alarm|Carbon monoxide|First aid)/i,
              /^(Private|Shared|Free|Paid)/i
            ]
            
            if (text && text.length > 2 && text.length < 100 && !foundTexts.has(text)) {
              for (const pattern of amenityPatterns) {
                if (pattern.test(text)) {
                  foundTexts.add(text)
                  items.push(text)
                  break
                }
              }
            }
          }
        })
      }
      
      // Strategy 3: Look for elements with specific data attributes or classes
      const dataElements = modal.querySelectorAll('[data-testid], [id*="amenity"], [class*="amenity"]')
      dataElements.forEach(el => {
        const text = el.textContent?.trim() || ''
        if (text && text.length > 2 && text.length < 100 && !foundTexts.has(text)) {
          // Additional filtering
          if (!text.match(/^\d+$/) && // Not just numbers
              !text.match(/^[A-Z]$/) && // Not just single letters
              !text.includes('Show')) {
            foundTexts.add(text)
            items.push(text)
          }
        }
      })
      
      console.log(`Found ${items.length} amenities in modal`)
      return items
    })
    
    // Add new amenities
    newAmenities.forEach(a => amenities.add(a))
    
    // Scroll the modal
    currentHeight = await scrollModalContent(page)
    scrollAttempts++
    
    // Wait for new content to load
    await new Promise(resolve => setTimeout(resolve, 1000))
    
  } while (currentHeight > previousHeight && scrollAttempts < maxScrolls)
  
  return Array.from(amenities)
}

// Extract all photos from gallery modal
export async function extractAllPhotos(page: Page): Promise<string[]> {
  const photos: string[] = []
  
  // Wait for gallery to load
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  // Extract all photo URLs
  const photoUrls = await page.evaluate(() => {
    const modal = document.querySelector('[role="dialog"], [aria-modal="true"]')
    if (!modal) return []
    
    const urls: string[] = []
    
    // Find all images in modal
    const images = modal.querySelectorAll('img[src*="airbnb"], img[data-original-uri]')
    images.forEach(img => {
      const src = (img as HTMLImageElement).src || img.getAttribute('data-original-uri')
      if (src && !src.includes('profile') && !src.includes('user')) {
        urls.push(src)
      }
    })
    
    return urls
  })
  
  return photoUrls
}

// Extract complete house rules
export async function extractHouseRules(page: Page): Promise<any> {
  return await page.evaluate(() => {
    const modal = document.querySelector('[role="dialog"], [aria-modal="true"]')
    if (!modal) return {}
    
    const rules: any = {
      checkIn: '',
      checkOut: '',
      maxGuests: 0,
      rules: [],
      additionalRules: [],
      childrenAllowed: true,
      petsAllowed: false,
      smokingAllowed: false,
      partiesAllowed: false
    }
    
    // Extract all text content from modal
    const allText = modal.textContent || ''
    
    // Extract check-in/out times
    const checkInMatch = allText.match(/Check.?in:?\s*([0-9]+:?[0-9]*\s*[APM]+)/i)
    const checkOutMatch = allText.match(/Check.?out:?\s*([0-9]+:?[0-9]*\s*[APM]+)/i)
    
    if (checkInMatch) rules.checkIn = checkInMatch[1]
    if (checkOutMatch) rules.checkOut = checkOutMatch[1]
    
    // Extract specific rules
    if (allText.match(/No smoking/i)) rules.smokingAllowed = false
    if (allText.match(/No pets/i)) rules.petsAllowed = false
    if (allText.match(/No parties/i)) rules.partiesAllowed = false
    if (allText.match(/No children/i)) rules.childrenAllowed = false
    
    // Extract all rule items
    const ruleElements = modal.querySelectorAll('li, div[role="listitem"]')
    ruleElements.forEach(el => {
      const text = el.textContent?.trim()
      if (text && text.length > 5 && text.length < 200) {
        rules.rules.push(text)
      }
    })
    
    return rules
  })
}

// Extract location details
export async function extractLocationDetails(page: Page): Promise<any> {
  return await page.evaluate(() => {
    const modal = document.querySelector('[role="dialog"], [aria-modal="true"]')
    if (!modal) return {}
    
    const location: any = {
      neighborhood: '',
      gettingAround: [],
      nearbyAttractions: [],
      publicTransit: []
    }
    
    // Extract neighborhood
    const neighborhoodEl = modal.querySelector('h2, h3')
    if (neighborhoodEl) {
      location.neighborhood = neighborhoodEl.textContent?.trim() || ''
    }
    
    // Extract all location information
    const sections = modal.querySelectorAll('section, div[role="region"]')
    sections.forEach(section => {
      const heading = section.querySelector('h3, h4')?.textContent?.toLowerCase() || ''
      const items = Array.from(section.querySelectorAll('li, p')).map(el => el.textContent?.trim() || '')
      
      if (heading.includes('getting around')) {
        location.gettingAround = items
      } else if (heading.includes('nearby') || heading.includes('attractions')) {
        location.nearbyAttractions = items
      } else if (heading.includes('transit') || heading.includes('transportation')) {
        location.publicTransit = items
      }
    })
    
    return location
  })
}

// Main function to extract from any modal
export async function extractFromModal(
  page: Page,
  buttonPattern: string,
  extractorFn: (page: Page) => Promise<any>
): Promise<any> {
  try {
    // Find and click the button
    const button = await findButtonByText(page, buttonPattern)
    if (!button) {
      console.log(`Button not found: ${buttonPattern}`)
      return null
    }
    
    // Click with human behavior
    await clickWithHumanBehavior(page, button)
    
    // Wait for modal
    const modalAppeared = await waitForModal(page)
    if (!modalAppeared) {
      console.log('Modal did not appear')
      return null
    }
    
    // Extract data
    const data = await extractorFn(page)
    
    // Close modal
    await closeModal(page)
    
    return data
  } catch (error) {
    console.log('Error extracting from modal:', error.message)
    return null
  }
}