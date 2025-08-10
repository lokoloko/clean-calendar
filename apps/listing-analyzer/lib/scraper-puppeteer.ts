// Puppeteer-based scraper using Browserless.io WebSocket connection
import puppeteer from 'puppeteer-core'
import { ComprehensiveAirbnbListing, AirbnbListingData } from './types/listing'
import { dismissTranslationModal, waitForContentLoad } from './modal-handler'
import { 
  extractFromModal, 
  extractAllAmenities, 
  extractAllPhotos, 
  extractHouseRules,
  extractLocationDetails,
  findButtonByText,
  clickWithHumanBehavior,
  waitForModal,
  closeModal,
  scrollModalContent
} from './modal-extractors'

export async function scrapeAirbnbWithPuppeteer(url: string): Promise<ComprehensiveAirbnbListing> {
  const apiKey = process.env.BROWSERLESS_API_KEY
  
  if (!apiKey) {
    throw new Error('Browserless API key not configured')
  }

  // Configure stealth mode and anti-detection settings
  const launchArgs = {
    stealth: true,
    headless: false, // Run in headful mode for better evasion
    blockAds: true,
    args: [
      '--window-size=1920,1080',
      '--lang=en-US',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ]
  }

  const browser = await puppeteer.connect({
    browserWSEndpoint: `wss://production-sfo.browserless.io?token=${apiKey}&launch=${encodeURIComponent(JSON.stringify(launchArgs))}`
  })

  try {
    console.log('Starting Puppeteer scrape with stealth mode:', url)
    
    const page = await browser.newPage()
    
    // Set viewport for consistent rendering
    await page.setViewport({ width: 1920, height: 1080 })
    
    // Add extra headers to appear more human-like
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    })
    
    // Override navigator properties to hide automation
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
      })
      
      // Mock plugins and mimeTypes
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5]
      })
      
      // Mock permissions
      const originalQuery = window.navigator.permissions.query
      window.navigator.permissions.query = (parameters: any) => (
        parameters.name === 'notifications' 
          ? Promise.resolve({ state: 'denied' } as PermissionStatus)
          : originalQuery(parameters)
      )
    })
    
    // Random delay before navigation (human-like)
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000))
    
    // Navigate to the listing
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    })
    
    // Wait for content and dismiss any blocking modals
    await waitForContentLoad(page)
    
    // Simulate mouse movement for human-like behavior
    await page.mouse.move(100, 100)
    await page.mouse.move(200, 300)
    
    // Extract amenities from modal with complete scrolling
    let amenitiesFromModal: string[] = []
    try {
      // Try multiple patterns for amenities button
      let amenitiesButton = await findButtonByText(page, 'Show all .* amenities?')
      if (!amenitiesButton) {
        amenitiesButton = await findButtonByText(page, 'amenities')
      }
      
      if (amenitiesButton) {
        console.log('Found amenities button, clicking...')
        
        // Human-like delay and click
        await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000))
        await clickWithHumanBehavior(page, amenitiesButton)
        
        // Wait for modal
        const modalAppeared = await waitForModal(page)
        if (modalAppeared) {
          console.log('Amenities modal appeared, extracting all amenities...')
          
          // Extract all amenities with scrolling
          amenitiesFromModal = await extractAllAmenities(page)
          console.log(`Extracted ${amenitiesFromModal.length} total amenities from modal`)
          
          // Close modal
          await closeModal(page)
        }
      }
    } catch (e: any) {
      console.log('Could not extract amenities:', e.message)
    }
    
    // Extract photos from gallery modal
    let photosFromModal: string[] = []
    try {
      const photosButton = await findButtonByText(page, 'Show all .* photo')
      if (photosButton) {
        console.log('Found photos button, clicking...')
        
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1500 + 500))
        await clickWithHumanBehavior(page, photosButton)
        
        const modalAppeared = await waitForModal(page)
        if (modalAppeared) {
          console.log('Photos modal appeared, extracting all photos...')
          photosFromModal = await extractAllPhotos(page)
          console.log(`Extracted ${photosFromModal.length} photos from gallery`)
          await closeModal(page)
        }
      }
    } catch (e: any) {
      console.log('Could not extract photos:', e.message)
    }
    
    // Extract complete house rules
    let houseRulesFromModal: any = {}
    try {
      const rulesButton = await findButtonByText(page, '(Show more|house rules|rules)')
      if (rulesButton) {
        console.log('Found house rules button, clicking...')
        
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1500 + 500))
        await clickWithHumanBehavior(page, rulesButton)
        
        const modalAppeared = await waitForModal(page)
        if (modalAppeared) {
          console.log('House rules modal appeared, extracting...')
          houseRulesFromModal = await extractHouseRules(page)
          console.log('Extracted house rules:', houseRulesFromModal)
          await closeModal(page)
        }
      }
    } catch (e: any) {
      console.log('Could not extract house rules:', e.message)
    }
    
    // Try to expand reviews section and extract all reviews
    let reviewsFromModal: any[] = []
    try {
      // Look for "Show all X reviews" button - this launches the modal
      const buttons = await page.$$('button')
      let reviewButton = null
      
      for (const button of buttons) {
        const text = await page.evaluate(el => el.textContent, button)
        // Look for pattern "Show all ## reviews" 
        if (text && text.match(/Show all \d+ reviews?/i)) {
          reviewButton = button
          console.log(`Found review button with text: "${text}"`)
          break
        }
      }
      
      if (reviewButton) {
        try {
          // Human-like delay before clicking
          await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000))
          
          // Move mouse to button before clicking (human-like)
          const box = await reviewButton.boundingBox()
          if (box) {
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
            await new Promise(resolve => setTimeout(resolve, 300))
          }
          
          // Use page.evaluate to click the button more reliably
          await page.evaluate((btn) => {
            btn.click()
          }, reviewButton)
          console.log('Clicked reviews button, waiting for modal...')
          
          // Wait for modal to appear
          await page.waitForSelector('[role="dialog"], [aria-modal="true"]', { timeout: 5000 })
          console.log('Reviews modal appeared')
          
          // Give modal time to fully render
          await new Promise(resolve => setTimeout(resolve, 2000))
          
          // Find the scrollable container within the modal
          const scrollableSelector = await page.evaluate(() => {
            const modal = document.querySelector('[role="dialog"], [aria-modal="true"]')
            if (!modal) return null
            
            // Find element with overflow-y: auto or scroll
            const elements = modal.querySelectorAll('*')
            for (const el of elements) {
              const style = window.getComputedStyle(el)
              if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
                // Return a selector that can find this element
                if (el.id) return `#${el.id}`
                if (el.className) return `.${el.className.split(' ')[0]}`
                return null
              }
            }
            return null
          })
          
          console.log('Scrollable container:', scrollableSelector || 'modal itself')
          
          // Progressive loading: scroll and extract reviews
          let previousReviewCount = 0
          let currentReviewCount = 0
          let scrollAttempts = 0
          const maxScrollAttempts = 50
          let allReviewsCollected: any[] = []
          
          do {
            previousReviewCount = currentReviewCount
            
            // Scroll the modal
            await page.evaluate((selector) => {
              if (selector) {
                const container = document.querySelector(selector)
                if (container) {
                  // Scroll in smaller increments for infinite scroll
                  container.scrollBy(0, 500)
                  return
                }
              }
              // Fallback to modal scrolling
              const modal = document.querySelector('[role="dialog"], [aria-modal="true"]')
              if (modal) {
                const scrollables = modal.querySelectorAll('[style*="overflow-y"], [style*="overflow: auto"]')
                if (scrollables.length > 0) {
                  // Try each scrollable container
                  scrollables.forEach(s => s.scrollBy(0, 500))
                } else {
                  modal.scrollBy(0, 500)
                }
              }
            }, scrollableSelector)
            
            // Wait for new content to load (shorter wait for faster scrolling)
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            // Extract reviews from modal with better selectors
            const newReviews = await page.evaluate(() => {
              const modal = document.querySelector('[role="dialog"], [aria-modal="true"]')
              if (!modal) return []
              
              const reviews: any[] = []
              
              // Multiple strategies for finding review containers
              const reviewSelectors = [
                '[data-review-id]',
                '[aria-labelledby*="review"]',
                'div[style*="border-bottom"]', // Reviews often have borders
                'div._1f21esa', // Common review container class
                'div[class*="review"]',
                'div[id*="review"]'
              ]
              
              // Try each selector
              for (const selector of reviewSelectors) {
                const containers = modal.querySelectorAll(selector)
                
                containers.forEach(container => {
                  // Skip if already processed (by checking if text was extracted)
                  const containerText = container.textContent || ''
                  if (reviews.some(r => containerText.includes(r.text))) return
                  
                  const reviewData: any = {}
                  
                  // Look for author - usually in an h3 or bold text
                  const authorElements = container.querySelectorAll('h3, h4, strong, b, [class*="name"], [class*="author"]')
                  for (const el of authorElements) {
                    const text = el.textContent?.trim()
                    if (text && text.length > 1 && text.length < 50 && !text.match(/\d{4}/)) {
                      reviewData.author = text
                      break
                    }
                  }
                  
                  // Look for date
                  const datePattern = /(\w+\s+\d{4}|\d+\s+(day|week|month|year)s?\s+ago|Yesterday|Today)/i
                  const dateMatch = containerText.match(datePattern)
                  reviewData.date = dateMatch ? dateMatch[0] : ''
                  
                  // Extract review text - look for the longest span/div that's not metadata
                  let reviewText = ''
                  const textElements = container.querySelectorAll('span, div')
                  
                  textElements.forEach(el => {
                    const text = el.textContent?.trim() || ''
                    // Check if this looks like review content
                    if (text.length > 50 && 
                        !text.match(/Show (more|less)/i) &&
                        !text.match(/Translated from/i) &&
                        !text.match(/Response from/i) &&
                        (!reviewData.author || !text.includes(reviewData.author)) &&
                        (!reviewData.date || !text.includes(reviewData.date))) {
                      
                      // Check if this element contains other elements (likely parent)
                      const childCount = el.querySelectorAll('*').length
                      if (childCount < 5) { // Not too many children
                        if (text.length > reviewText.length) {
                          reviewText = text
                        }
                      }
                    }
                  })
                  
                  // Fallback: if no good text found, try getting all text minus metadata
                  if (!reviewText) {
                    const allText = containerText
                      .replace(reviewData.author || '', '')
                      .replace(reviewData.date || '', '')
                      .replace(/Show (more|less)/gi, '')
                      .replace(/Translated from.*/gi, '')
                      .trim()
                    
                    if (allText.length > 50) {
                      reviewText = allText
                    }
                  }
                  
                  reviewData.text = reviewText
                  reviewData.author = reviewData.author || 'Guest'
                  
                  // Only add if we have meaningful content
                  if (reviewData.text && reviewData.text.length > 20) {
                    reviews.push(reviewData)
                  }
                })
                
                // If we found a good number of reviews, stop trying other selectors
                if (reviews.length > 5) break
              }
              
              // If we have too few reviews, try a more aggressive approach
              if (reviews.length < 5) {
                // Look for any div with substantial text content
                const allDivs = modal.querySelectorAll('div')
                const potentialReviews: any[] = []
                
                allDivs.forEach(div => {
                  const text = div.textContent?.trim() || ''
                  // Check if it has review-like characteristics
                  if (text.length > 100 && text.length < 2000 &&
                      (text.match(/stayed|visit|place|host|room|location|clean/i) ||
                       text.match(/\d+\s+(day|week|month|year)s?\s+ago/i))) {
                    
                    // Make sure it's not a parent containing multiple reviews
                    const childDivs = div.querySelectorAll('div')
                    if (childDivs.length < 10) {
                      potentialReviews.push({
                        author: 'Guest',
                        date: text.match(/(\w+\s+\d{4}|\d+\s+(day|week|month|year)s?\s+ago)/i)?.[0] || '',
                        text: text.substring(0, 500) // Limit length
                      })
                    }
                  }
                })
                
                // Add unique reviews
                potentialReviews.forEach(review => {
                  if (!reviews.some(r => r.text === review.text)) {
                    reviews.push(review)
                  }
                })
              }
              
              // Deduplicate by text
              const uniqueReviews = reviews.filter((review, index, self) =>
                index === self.findIndex(r => r.text === review.text)
              )
              
              return uniqueReviews
            })
            
            // Merge new reviews with existing ones
            newReviews.forEach(newReview => {
              const isDuplicate = allReviewsCollected.some(r => 
                r.text === newReview.text || 
                (r.author === newReview.author && r.date === newReview.date)
              )
              if (!isDuplicate) {
                allReviewsCollected.push(newReview)
              }
            })
            
            reviewsFromModal = allReviewsCollected
            currentReviewCount = allReviewsCollected.length
            scrollAttempts++
            
            console.log(`Scroll attempt ${scrollAttempts}: ${currentReviewCount} total reviews collected`)
            
          } while (currentReviewCount > previousReviewCount && scrollAttempts < maxScrollAttempts)
          
          console.log(`Extracted ${reviewsFromModal.length} total reviews from modal`)
          
          // Close modal
          await page.keyboard.press('Escape')
          await new Promise(resolve => setTimeout(resolve, 1000))
          
        } catch (modalError: any) {
          console.log('Error with reviews modal:', modalError.message)
        }
      }
    } catch (e: any) {
      console.log('Could not expand reviews:', e.message)
    }
    
    // Extract comprehensive data using page.evaluate for efficiency
    const data = await page.evaluate((amenitiesFromModal, reviewsFromModal, photosFromModal, houseRulesFromModal) => {
      // Helper function to safely get text
      const getText = (selector: string): string | null => {
        const el = document.querySelector(selector)
        return el ? el.textContent?.trim() || null : null
      }
      
      const getAllTexts = (selector: string): string[] => {
        return Array.from(document.querySelectorAll(selector)).map(el => el.textContent?.trim() || '').filter(Boolean)
      }
      
      // Try to extract data from structured data first
      let structuredData: any = {}
      try {
        const ldJsonScripts = document.querySelectorAll('script[type="application/ld+json"]')
        ldJsonScripts.forEach(script => {
          try {
            const data = JSON.parse(script.textContent || '{}')
            if (data['@type'] === 'LodgingBusiness' || data['@type'] === 'Product' || data.name) {
              structuredData = { ...structuredData, ...data }
            }
          } catch (e) {
            // Invalid JSON, skip
          }
        })
      } catch (e) {
        // Error parsing structured data
      }
      
      // Extract from meta tags
      const metaPrice = document.querySelector('meta[property="product:price:amount"], meta[property="og:price:amount"]')
      const metaCurrency = document.querySelector('meta[property="product:price:currency"], meta[property="og:price:currency"]')
      const metaTitle = document.querySelector('meta[property="og:title"], meta[name="title"]')
      const metaDescription = document.querySelector('meta[property="og:description"], meta[name="description"]')
      
      // Extract title and subtitle
      const title = structuredData.name || metaTitle?.getAttribute('content') || getText('h1')
      const subtitle = getText('h2')
      
      // Extract rating and reviews
      let rating = null
      let reviewCount = null
      
      // Try multiple selectors for ratings
      const ratingSelectors = [
        '[aria-label*="rating"]',
        'button[aria-label*="review"]',
        'span._17p6nbba', // Common rating class
        '[data-testid="reviews-summary"]',
        'div._1s11ltsf', // Review summary container
        'span._12si43g' // Star rating text
      ]
      
      for (const selector of ratingSelectors) {
        const element = document.querySelector(selector)
        if (element) {
          const ariaLabel = element.getAttribute('aria-label') || ''
          const text = element.textContent || ''
          const fullText = ariaLabel + ' ' + text
          
          // Look for rating pattern like "4.95" or "4.95 stars"
          const ratingMatch = fullText.match(/(\d+\.?\d*)\s*(star|rating|out)/i)
          if (ratingMatch && !rating) {
            rating = parseFloat(ratingMatch[1])
          }
          
          // Look for review count like "123 reviews"
          const reviewMatch = fullText.match(/(\d+)\s*review/i)
          if (reviewMatch && !reviewCount) {
            reviewCount = parseInt(reviewMatch[1])
          }
        }
      }
      
      // If still no rating, check for star rating in any element
      if (!rating) {
        const starElements = document.querySelectorAll('[aria-label*="star"], [aria-label*="Star"]')
        for (const el of starElements) {
          const label = el.getAttribute('aria-label') || ''
          const match = label.match(/(\d+\.?\d*)\s*star/i)
          if (match) {
            rating = parseFloat(match[1])
            break
          }
        }
      }
      
      // Extract price - use multiple sources
      let price = null
      
      // 1. Try structured data first
      if (structuredData.offers?.price) {
        price = parseFloat(structuredData.offers.price)
      } else if (structuredData.priceRange) {
        const match = structuredData.priceRange.match(/\$(\d+)/)
        if (match) price = parseInt(match[1])
      }
      
      // 2. Try meta tags
      if (!price && metaPrice) {
        price = parseFloat(metaPrice.getAttribute('content') || '')
      }
      
      // 3. Try specific price selectors
      if (!price) {
        const priceSelectors = [
          'span._tyxjp1', // Common Airbnb price class
          'span._1y74zjx', // Another price class
          'div._1jo4hgw', // Price container
          'span[aria-label*="price"]',
          'div[aria-label*="price"]',
          '[data-testid="price"] span',
          'div._mm360j span', // Price wrapper
          'span._1ks8cgb', // Price text
          'div._i5duul', // Price section
          'div._le6wlg' // Price display
        ]
        
        for (const selector of priceSelectors) {
          try {
            const priceEl = document.querySelector(selector)
            if (priceEl) {
              const text = priceEl.textContent || ''
              // Look for various price patterns
              const patterns = [
                /\$(\d+(?:,\d{3})*)/,  // $150 or $1,500
                /(\d+(?:,\d{3})*)\s*USD/i,  // 150 USD
                /Total.*?\$(\d+)/i  // Total before taxes $150
              ]
              
              for (const pattern of patterns) {
                const match = text.match(pattern)
                if (match) {
                  price = parseInt(match[1].replace(/,/g, ''))
                  break
                }
              }
              
              if (price) break
            }
          } catch (e) {
            // Some selectors might not be valid, continue
          }
        }
      }
      
      // 4. Fallback: look through all spans for price pattern
      if (!price) {
        const allSpans = document.querySelectorAll('span')
        for (const el of allSpans) {
          const text = el.textContent || ''
          // Look for price pattern like "$150 night" or "$150 / night"
          if (text.includes('$') && (text.includes('night') || text.includes('total') || text.includes('before'))) {
            const match = text.match(/\$(\d+(?:,\d{3})*)/)
            if (match) {
              price = parseInt(match[1].replace(/,/g, ''))
              break
            }
          }
        }
      }
      
      // 5. Try to find price in any element with dollar sign
      if (!price) {
        const allElements = document.querySelectorAll('*')
        for (const el of allElements) {
          if (el.children.length === 0) { // Leaf nodes only
            const text = el.textContent || ''
            if (text.match(/^\$\d+/) && text.length < 20) {
              const match = text.match(/\$(\d+)/)
              if (match) {
                price = parseInt(match[1])
                break
              }
            }
          }
        }
      }
      
      // Extract property details
      // Find div containing "guests"
      let propertyInfo = null
      const allDivs = document.querySelectorAll('div')
      for (const div of allDivs) {
        if (div.textContent && div.textContent.includes('guest')) {
          propertyInfo = div.textContent.trim()
          break
        }
      }
      
      let guests = null, bedrooms = null, beds = null, bathrooms = null
      if (propertyInfo) {
        const guestMatch = propertyInfo.match(/(\d+)\s*guest/i)
        const bedroomMatch = propertyInfo.match(/(\d+)\s*bedroom/i)
        const bedMatch = propertyInfo.match(/(\d+)\s*bed(?!room)/i)
        const bathMatch = propertyInfo.match(/(\d+)\s*bath/i)
        
        if (guestMatch) guests = parseInt(guestMatch[1])
        if (bedroomMatch) bedrooms = parseInt(bedroomMatch[1])
        if (bedMatch) beds = parseInt(bedMatch[1])
        if (bathMatch) bathrooms = parseInt(bathMatch[1])
      }
      
      // Extract host information
      let hostName = null
      let isSuperhost = false
      
      // Try multiple selectors for host info
      const hostSelectors = [
        '[data-testid="host-profile"]',
        'div:has-text("Hosted by")',
        'section[aria-labelledby*="host"]',
        'div._1ez5s2o', // Host section container
        'h2:has-text("Hosted by")',
        'div._cv5qq4'  // Host profile container
      ]
      
      for (const selector of hostSelectors) {
        try {
          const hostEl = document.querySelector(selector)
          if (hostEl) {
            const text = hostEl.textContent || ''
            // Extract host name from "Hosted by John" pattern
            const nameMatch = text.match(/Hosted by\s+([A-Za-z\s]+?)(?:\.|,|$|\n|Superhost)/i)
            if (nameMatch) {
              hostName = nameMatch[1].trim()
              break
            }
          }
        } catch (e) {
          // Some selectors might fail, continue
        }
      }
      
      // If no host name found, try looking for profile section
      if (!hostName) {
        const profileLinks = document.querySelectorAll('a[href*="/users/show"]')
        if (profileLinks.length > 0) {
          const profileText = profileLinks[0].textContent?.trim()
          if (profileText && !profileText.includes('Show')) {
            hostName = profileText
          }
        }
      }
      
      // Check for Superhost badge
      const superhostSelectors = [
        '[data-testid="superhost-badge"]',
        'div:has-text("Superhost")',
        'span._1mhorg9', // Superhost badge class
        '[aria-label*="Superhost"]'
      ]
      
      for (const selector of superhostSelectors) {
        try {
          const element = document.querySelector(selector)
          if (element) {
            const text = element.textContent || ''
            const ariaLabel = element.getAttribute('aria-label') || ''
            if (text.includes('Superhost') || ariaLabel.includes('Superhost')) {
              isSuperhost = true
              break
            }
          }
        } catch (e) {
          // Continue if selector fails
        }
      }
      
      // Extract all amenities (combine from page and modal)
      const pageAmenities = getAllTexts('[id*="amenity"], div[data-section-id="AMENITIES"] button')
      // Amenities from modal passed as parameter
      const amenities = [...new Set([...pageAmenities, ...amenitiesFromModal])]
      
      // Extract review categories
      const reviewCategories: Record<string, number> = {}
      const categories = ['Cleanliness', 'Accuracy', 'Communication', 'Location', 'Check-in', 'Value']
      
      // Look for category ratings
      categories.forEach(cat => {
        // Find all divs and look for the category name followed by a rating
        const allDivs = document.querySelectorAll('div, span')
        for (const el of allDivs) {
          const text = el.textContent || ''
          if (text.includes(cat)) {
            // Look for a number near this category
            const parent = el.parentElement
            if (parent) {
              const parentText = parent.textContent || ''
              const match = parentText.match(/(\d+\.?\d*)/)
              if (match) {
                reviewCategories[cat.toLowerCase().replace('-', '')] = parseFloat(match[1])
                break
              }
            }
          }
        }
      })
      
      // Extract individual reviews - combine modal reviews with any on page
      // Reviews from modal were passed as parameter
      const pageReviews: any[] = []
      
      // Try to find reviews on the page (usually just a few visible ones)
      const reviewElements = document.querySelectorAll('[data-testid*="review"], [aria-label*="review"]')
      
      reviewElements.forEach(el => {
        // Try to find author name
        let author = 'Guest'
        const h3 = el.querySelector('h3')
        if (h3) author = h3.textContent?.trim() || author
        
        // Try to find date
        let date = ''
        const timeEl = el.querySelector('time')
        if (timeEl) {
          date = timeEl.textContent?.trim() || ''
        } else {
          // Look for date patterns in text
          const text = el.textContent || ''
          const dateMatch = text.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/)
          if (dateMatch) date = dateMatch[0]
        }
        
        // Try to find review text
        let reviewText = ''
        // Look for spans or divs that contain longer text
        const textElements = el.querySelectorAll('span, div')
        for (const textEl of textElements) {
          const text = textEl.textContent?.trim() || ''
          if (text.length > 50 && !text.includes(author) && !text.includes(date)) {
            reviewText = text
            break
          }
        }
        
        if (reviewText && reviewText.length > 20) {
          pageReviews.push({
            author: author,
            date: date,
            text: reviewText
          })
        }
      })
      
      // Combine modal reviews with page reviews, preferring modal reviews (more complete)
      const allReviews = [...reviewsFromModal]
      
      // Add page reviews that aren't duplicates
      pageReviews.forEach(pageReview => {
        const isDuplicate = allReviews.some(r => 
          r.text === pageReview.text || 
          (r.author === pageReview.author && r.date === pageReview.date)
        )
        if (!isDuplicate) {
          allReviews.push(pageReview)
        }
      })
      
      const reviews = allReviews.slice(0, 500) // Get up to 500 reviews
      
      // Extract house rules - combine from page and modal
      let checkIn = houseRulesFromModal?.checkIn || null
      let checkOut = houseRulesFromModal?.checkOut || null
      let noSmoking = !houseRulesFromModal?.smokingAllowed
      let noPets = !houseRulesFromModal?.petsAllowed
      let noParties = !houseRulesFromModal?.partiesAllowed
      
      // Fallback to page extraction if modal didn't provide data
      if (!checkIn || !checkOut) {
        const allDivsForRules = document.querySelectorAll('div')
        for (const div of allDivsForRules) {
          const text = div.textContent || ''
          if (!checkIn && text.includes('Check-in') && (text.includes('After') || text.includes('PM'))) {
            checkIn = text.trim()
          }
          if (!checkOut && text.includes('Checkout') && (text.includes('Before') || text.includes('AM'))) {
            checkOut = text.trim()
          }
        }
      }
      
      // Also check page for rules if not found in modal
      if (!houseRulesFromModal || Object.keys(houseRulesFromModal).length === 0) {
        const allDivsForRules = document.querySelectorAll('div')
        for (const div of allDivsForRules) {
          const text = div.textContent || ''
          if (text.includes('No smoking')) noSmoking = true
          if (text.includes('No pets')) noPets = true
          if (text.includes('No parties')) noParties = true
        }
      }
      
      // Extract photos - combine from page and modal
      const pagePhotos = Array.from(document.querySelectorAll('img[data-original-uri], picture img[src*="airbnb"]')).map(img => ({
        url: (img as HTMLImageElement).src || img.getAttribute('data-original-uri'),
        alt: (img as HTMLImageElement).alt
      }))
      
      // Add photos from modal if available
      const allPhotos = [...pagePhotos]
      if (photosFromModal && photosFromModal.length > 0) {
        photosFromModal.forEach(url => {
          if (!allPhotos.some(p => p.url === url)) {
            allPhotos.push({ url, alt: '' })
          }
        })
      }
      const photos = allPhotos
      
      // Get full description
      const descriptionEl = document.querySelector('[data-section-id="DESCRIPTION"]')
      const description = descriptionEl ? descriptionEl.textContent?.trim() || '' : ''
      
      return {
        title,
        subtitle,
        description,
        rating,
        reviewCount,
        price,
        guests,
        bedrooms,
        beds,
        bathrooms,
        hostName,
        isSuperhost,
        amenities: amenities.filter(a => a && a.length > 2 && a.length < 100),
        reviewCategories,
        reviews,
        checkIn,
        checkOut,
        houseRules: {
          noSmoking,
          noPets,
          noParties
        },
        photos: photos.slice(0, 100), // Increased limit for modal photos
        htmlLength: document.documentElement.innerHTML.length
      }
    }, amenitiesFromModal, reviewsFromModal, photosFromModal, houseRulesFromModal) // Pass all modal data as parameters
    
    console.log('Extraction complete:', {
      reviewsFound: data.reviews.length,
      amenitiesFound: data.amenities.length,
      photosFound: data.photos.length
    })
    
    await page.close()
    
    return parsePuppeteerResponse(url, data)
  } catch (error) {
    console.error('Puppeteer scraping error:', error)
    throw error
  } finally {
    await browser.close()
  }
}

function parsePuppeteerResponse(url: string, data: any): ComprehensiveAirbnbListing {
  const listing: ComprehensiveAirbnbListing = {
    id: extractListingId(url),
    url,
    title: data.title || 'Airbnb Listing',
    subtitle: data.subtitle,
    description: data.description || '',
    propertyType: 'Entire place',
    
    guestCapacity: {
      adults: data.guests || 4,
      children: 0,
      infants: 0,
      total: data.guests || 4
    },
    
    spaces: {
      bedrooms: data.bedrooms || 1,
      beds: data.beds || 1,
      bathrooms: data.bathrooms || 1
    },
    
    host: {
      name: data.hostName || 'Host',
      isSuperhost: data.isSuperhost || false
    },
    
    pricing: {
      basePrice: data.price || 150,
      currency: 'USD'
    },
    
    location: {
      city: 'Unknown',
      country: 'USA'
    },
    
    photos: data.photos || [],
    
    amenities: {
      basic: data.amenities || []
    },
    
    reviews: {
      summary: {
        rating: data.rating || 4.5,
        totalCount: data.reviewCount || 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        categories: data.reviewCategories || {}
      },
      recentReviews: data.reviews || []
    },
    
    houseRules: {
      checkIn: {
        time: extractCheckTime(data.checkIn)
      },
      checkOut: {
        time: extractCheckTime(data.checkOut)
      },
      during: {
        smoking: !data.houseRules?.noSmoking,
        pets: !data.houseRules?.noPets,
        parties: !data.houseRules?.noParties
      }
    },
    
    bookingSettings: {},
    
    cancellationPolicy: {
      type: 'Standard'
    },
    
    meta: {
      scrapedAt: new Date().toISOString(),
      scrapeVersion: '3.0-puppeteer',
      dataCompleteness: calculateCompleteness(data)
    }
  }
  
  // Categorize amenities
  if (data.amenities && data.amenities.length > 0) {
    const categories: Record<string, string[]> = {
      kitchen: [],
      bathroom: [],
      entertainment: [],
      outdoor: [],
      safety: []
    }
    
    const categoryKeywords: Record<string, string[]> = {
      kitchen: ['Kitchen', 'Microwave', 'Refrigerator', 'Coffee', 'Dishwasher', 'Oven', 'Stove'],
      bathroom: ['Hair dryer', 'Shampoo', 'Hot water', 'Towels'],
      entertainment: ['TV', 'Netflix', 'Cable', 'Games'],
      outdoor: ['Pool', 'Hot tub', 'BBQ', 'Patio', 'Garden', 'Beach'],
      safety: ['Smoke alarm', 'Carbon monoxide', 'Fire extinguisher', 'First aid']
    }
    
    data.amenities.forEach((amenity: string) => {
      Object.entries(categoryKeywords).forEach(([category, keywords]) => {
        if (keywords.some(k => amenity.toLowerCase().includes(k.toLowerCase()))) {
          categories[category].push(amenity)
        }
      })
    })
    
    Object.entries(categories).forEach(([category, items]) => {
      if (items.length > 0) {
        (listing.amenities as any)[category] = items
      }
    })
  }
  
  return listing
}

function extractListingId(url: string): string {
  const match = url.match(/rooms\/(\d+)/)
  return match ? match[1] : ''
}

function extractCheckTime(text?: string): string | undefined {
  if (!text) return undefined
  const match = text.match(/(\d{1,2}:\d{2}\s*[AP]M|\d{1,2}\s*[AP]M)/i)
  return match ? match[1] : undefined
}

function calculateCompleteness(data: any): number {
  let score = 0
  const fields = [
    data.title,
    data.price,
    data.rating,
    data.reviewCount,
    data.amenities?.length > 0,
    data.reviews?.length > 0,
    data.reviewCategories && Object.keys(data.reviewCategories).length > 0,
    data.photos?.length > 0,
    data.hostName,
    data.description
  ]
  
  fields.forEach(field => {
    if (field) score += 10
  })
  
  return score
}

// Convert to simplified format for backward compatibility
export function puppeteerToSimplified(comprehensive: ComprehensiveAirbnbListing): AirbnbListingData {
  return {
    url: comprehensive.url,
    title: comprehensive.title,
    description: comprehensive.description,
    price: comprehensive.pricing.basePrice,
    rating: comprehensive.reviews.summary.rating,
    reviewCount: comprehensive.reviews.summary.totalCount,
    amenities: comprehensive.amenities.basic || [],
    propertyType: comprehensive.propertyType,
    hostName: comprehensive.host.name,
    isSuperhost: comprehensive.host.isSuperhost,
    location: `${comprehensive.location.city}, ${comprehensive.location.country}`,
    photos: comprehensive.photos.length,
    
    // Enhanced fields
    subtitle: comprehensive.subtitle,
    hostResponseRate: comprehensive.host.responseRate,
    hostResponseTime: comprehensive.host.responseTime,
    cleaningFee: comprehensive.pricing.cleaningFee,
    serviceFee: comprehensive.pricing.serviceFee,
    checkIn: comprehensive.houseRules.checkIn.time,
    checkOut: comprehensive.houseRules.checkOut.time,
    minimumStay: comprehensive.bookingSettings.minimumStay,
    instantBook: comprehensive.bookingSettings.instantBook,
    reviewCategories: comprehensive.reviews.summary.categories,
    recentReviews: comprehensive.reviews.recentReviews?.slice(0, 10).map(r => ({
      author: r.author,
      date: r.date,
      text: r.text
    })),
    houseRules: {
      smoking: comprehensive.houseRules.during.smoking || false,
      pets: comprehensive.houseRules.during.pets || false,
      parties: comprehensive.houseRules.during.parties || false
    },
    lastScraped: comprehensive.meta.scrapedAt,
    dataQuality: comprehensive.meta.dataCompleteness
  }
}