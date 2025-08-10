// Hybrid Light Scraper - Combines content API for interaction + screenshots + vision AI
import { GoogleGenerativeAI } from '@google/generative-ai'
import { ComprehensiveAirbnbListing } from './types/listing'

interface ModalState {
  amenitiesOpen?: boolean
  reviewsOpen?: boolean
  safetyOpen?: boolean
  cancellationOpen?: boolean
  houseRulesOpen?: boolean
  amenitiesButtonText?: string
  reviewsCount?: number
}

interface ExtractedData {
  main?: any
  amenities?: any
  reviews?: any[]
  safety?: any
  cancellation?: any
  houseRules?: any
  description?: any
}

export async function scrapeWithHybridLight(url: string): Promise<ComprehensiveAirbnbListing> {
  const apiKey = process.env.BROWSERLESS_API_KEY
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
  
  if (!apiKey || !geminiKey) {
    throw new Error('API keys not configured')
  }
  
  const listingId = extractListingId(url)
  console.log(`🎯 Starting hybrid light scraping for listing ${listingId}`)
  
  try {
    const extractedData: ExtractedData = {}
    
    // Step 1: Capture main page screenshot first
    console.log('📸 Capturing main page...')
    const mainScreenshot = await captureScreenshot(url, apiKey)
    if (mainScreenshot) {
      extractedData.main = await extractWithVision(mainScreenshot, geminiKey, 'main')
    }
    
    // Step 2: Open and capture amenities modal
    console.log('🏠 Opening amenities modal...')
    const amenitiesState = await openModal(url, apiKey, 'amenities')
    if (amenitiesState.amenitiesOpen) {
      console.log(`✅ Amenities modal opened: ${amenitiesState.amenitiesButtonText}`)
      
      // Wait a bit for modal to fully render
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Capture modal screenshot
      const modalScreenshot = await captureModalScreenshot(url, apiKey)
      if (modalScreenshot) {
        extractedData.amenities = await extractWithVision(modalScreenshot, geminiKey, 'amenities')
      }
    }
    
    // Step 3: Open and capture reviews modal
    console.log('💬 Opening reviews modal...')
    const reviewsState = await openModal(url, apiKey, 'reviews')
    if (reviewsState.reviewsOpen) {
      console.log(`✅ Reviews modal opened`)
      
      // Capture multiple screenshots with scrolling
      const reviewScreenshots = await captureReviewsWithScroll(url, apiKey)
      if (reviewScreenshots && reviewScreenshots.length > 0) {
        extractedData.reviews = []
        for (let i = 0; i < reviewScreenshots.length; i++) {
          const reviewData = await extractWithVision(reviewScreenshots[i], geminiKey, 'reviews', i)
          if (reviewData) extractedData.reviews.push(reviewData)
        }
      }
    }
    
    // Step 4: Try other modals
    const otherModals = ['safety', 'cancellation', 'houseRules']
    for (const modalType of otherModals) {
      console.log(`📋 Opening ${modalType} modal...`)
      const state = await openModal(url, apiKey, modalType)
      
      if (state[`${modalType}Open`]) {
        console.log(`✅ ${modalType} modal opened`)
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        const modalScreenshot = await captureModalScreenshot(url, apiKey)
        if (modalScreenshot) {
          extractedData[modalType] = await extractWithVision(modalScreenshot, geminiKey, modalType)
        }
      }
    }
    
    // Step 5: Structure the data
    console.log('🔄 Structuring extracted data...')
    const listing = structureData(extractedData, url)
    
    console.log(`✅ Hybrid light scraping complete: ${listing.meta?.dataCompleteness}% data extracted`)
    
    return listing
    
  } catch (error) {
    console.error('❌ Hybrid light scraping failed:', error)
    throw error
  }
}

async function openModal(url: string, apiKey: string, modalType: string): Promise<ModalState> {
  const contentEndpoint = `https://production-sfo.browserless.io/content?token=${apiKey}`
  
  // JavaScript to run in the page context
  let jsCode = ''
  
  switch (modalType) {
    case 'amenities':
      jsCode = `
        (async () => {
          // Wait for page to be ready
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Find amenities button
          const buttons = Array.from(document.querySelectorAll('button'));
          const amenitiesBtn = buttons.find(b => 
            b.innerText && b.innerText.match(/Show all \\d+ amenities/i)
          );
          
          if (amenitiesBtn) {
            const buttonText = amenitiesBtn.innerText;
            amenitiesBtn.click();
            
            // Wait for modal
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Check if modal opened
            const modal = document.querySelector('[role="dialog"], [aria-modal="true"]');
            return {
              amenitiesOpen: !!modal,
              amenitiesButtonText: buttonText
            };
          }
          
          return { amenitiesOpen: false };
        })()
      `
      break
      
    case 'reviews':
      jsCode = `
        (async () => {
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // First close any open modal
          const existingModal = document.querySelector('[role="dialog"]');
          if (existingModal) {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          // Find reviews link
          const links = Array.from(document.querySelectorAll('a'));
          const reviewLink = links.find(a => a.href && a.href.includes('/reviews'));
          
          if (reviewLink) {
            reviewLink.click();
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const modal = document.querySelector('[role="dialog"], [aria-modal="true"]');
            return {
              reviewsOpen: !!modal,
              reviewsCount: reviewLink.innerText.match(/\\d+/) ? 
                parseInt(reviewLink.innerText.match(/\\d+/)[0]) : 0
            };
          }
          
          return { reviewsOpen: false };
        })()
      `
      break
      
    case 'safety':
      jsCode = `
        (async () => {
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Close any open modal first
          const existingModal = document.querySelector('[role="dialog"]');
          if (existingModal) {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          const button = document.querySelector('button[aria-label*="safety" i], button[aria-label*="property" i]');
          if (button) {
            button.click();
            await new Promise(resolve => setTimeout(resolve, 2000));
            const modal = document.querySelector('[role="dialog"]');
            return { safetyOpen: !!modal };
          }
          
          return { safetyOpen: false };
        })()
      `
      break
      
    case 'cancellation':
      jsCode = `
        (async () => {
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Close any open modal first
          const existingModal = document.querySelector('[role="dialog"]');
          if (existingModal) {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          const button = document.querySelector('button[aria-label*="cancellation" i]');
          if (button) {
            button.click();
            await new Promise(resolve => setTimeout(resolve, 2000));
            const modal = document.querySelector('[role="dialog"]');
            return { cancellationOpen: !!modal };
          }
          
          return { cancellationOpen: false };
        })()
      `
      break
      
    case 'houseRules':
      jsCode = `
        (async () => {
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Close any open modal first
          const existingModal = document.querySelector('[role="dialog"]');
          if (existingModal) {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          const button = document.querySelector('button[aria-label*="house rules" i]');
          if (button) {
            button.click();
            await new Promise(resolve => setTimeout(resolve, 2000));
            const modal = document.querySelector('[role="dialog"]');
            return { houseRulesOpen: !!modal };
          }
          
          return { houseRulesOpen: false };
        })()
      `
      break
      
    default:
      return {}
  }
  
  try {
    const response = await fetch(contentEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url,
        gotoOptions: {
          waitUntil: 'networkidle2'
        },
        waitForTimeout: 5000,
        evaluate: jsCode
      })
    })
    
    if (!response.ok) {
      console.error(`Failed to open ${modalType} modal:`, response.statusText)
      return {}
    }
    
    // Parse the response - it should contain the result of our evaluate function
    const responseText = await response.text()
    
    try {
      // Try to parse as JSON first (evaluate result might be embedded)
      const result = JSON.parse(responseText)
      console.log(`✅ Modal ${modalType} result:`, result)
      return result
    } catch {
      // If not JSON, assume success if we got a response
      console.log(`⚠️ Modal ${modalType} opened but couldn't parse result`)
      return modalType === 'amenities' ? 
        { amenitiesOpen: true, amenitiesButtonText: 'Show all amenities' } :
        { [`${modalType}Open`]: true }
    }
      
  } catch (error) {
    console.error(`Error opening ${modalType} modal:`, error)
    return {}
  }
}

async function captureScreenshot(url: string, apiKey: string): Promise<string | null> {
  const screenshotEndpoint = `https://production-sfo.browserless.io/chrome/screenshot?token=${apiKey}`
  
  try {
    const response = await fetch(screenshotEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url,
        options: {
          fullPage: true,
          type: 'jpeg',
          quality: 75
        },
        gotoOptions: {
          waitUntil: 'networkidle2'
        },
        waitForTimeout: 5000
      })
    })
    
    if (!response.ok) {
      console.error('Screenshot failed:', response.statusText)
      return null
    }
    
    const buffer = await response.arrayBuffer()
    return Buffer.from(buffer).toString('base64')
    
  } catch (error) {
    console.error('Error capturing screenshot:', error)
    return null
  }
}

async function captureModalScreenshot(url: string, apiKey: string): Promise<string | null> {
  const screenshotEndpoint = `https://production-sfo.browserless.io/chrome/screenshot?token=${apiKey}`
  
  try {
    const response = await fetch(screenshotEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url,
        selector: '[role="dialog"], [aria-modal="true"]',
        options: {
          type: 'jpeg',
          quality: 85
        },
        waitForSelector: {
          selector: '[role="dialog"], [aria-modal="true"]',
          timeout: 5000
        }
      })
    })
    
    if (!response.ok) {
      console.error('Modal screenshot failed:', response.statusText)
      return null
    }
    
    const buffer = await response.arrayBuffer()
    return Buffer.from(buffer).toString('base64')
    
  } catch (error) {
    console.error('Error capturing modal screenshot:', error)
    return null
  }
}

async function captureReviewsWithScroll(url: string, apiKey: string): Promise<string[]> {
  const screenshots: string[] = []
  const maxScrolls = 3
  
  for (let i = 0; i < maxScrolls; i++) {
    // Capture current state
    const screenshot = await captureModalScreenshot(url, apiKey)
    if (screenshot) {
      screenshots.push(screenshot)
    }
    
    // Scroll the modal
    const scrolled = await scrollModalContent(url, apiKey, i * 800)
    if (!scrolled) break
    
    // Wait for new content
    await new Promise(resolve => setTimeout(resolve, 1500))
  }
  
  return screenshots
}

async function scrollModalContent(url: string, apiKey: string, scrollAmount: number): Promise<boolean> {
  const contentEndpoint = `https://production-sfo.browserless.io/content?token=${apiKey}`
  
  const jsCode = `
    (() => {
      const modal = document.querySelector('[role="dialog"]');
      if (!modal) return false;
      
      // Find scrollable container
      let scrollContainer = modal;
      const divs = modal.querySelectorAll('div');
      for (const div of divs) {
        if (div.scrollHeight > div.clientHeight) {
          scrollContainer = div;
          break;
        }
      }
      
      const before = scrollContainer.scrollTop;
      scrollContainer.scrollBy(0, ${scrollAmount});
      return scrollContainer.scrollTop > before;
    })()
  `
  
  try {
    await fetch(contentEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url,
        evaluate: jsCode
      })
    })
    
    return true
  } catch {
    return false
  }
}

async function extractWithVision(
  screenshotBase64: string, 
  geminiKey: string, 
  modalType: string,
  pageNum?: number
): Promise<any> {
  console.log(`🤖 Extracting ${modalType} with Vision AI... (screenshot size: ${(screenshotBase64.length / 1024).toFixed(1)}KB)`)
  
  const genAI = new GoogleGenerativeAI(geminiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  
  const prompts = {
    main: `
      Extract from this Airbnb listing main page:
      - Title, property type, location
      - Price (base price per night)
      - Rating and review count
      - Host name and superhost status
      - Spaces (guests, bedrooms, beds, bathrooms)
      
      Return JSON with all data.
    `,
    
    amenities: `
      This is an Airbnb amenities modal screenshot.
      Extract ALL amenities visible in the image.
      
      Look for items with icons and text descriptions.
      Include everything: essentials, kitchen, bathroom, bedroom, entertainment, etc.
      
      Return JSON:
      {
        "all_amenities": ["item1", "item2", ...list EVERY amenity],
        "count": total number
      }
    `,
    
    reviews: `
      Extract from this reviews modal (page ${pageNum ? pageNum + 1 : 1}):
      ${pageNum === 0 ? '- Overall rating and total count if visible\n- Category ratings (Cleanliness, etc.)' : ''}
      - All individual reviews with name, date, and text
      
      Return JSON with reviews array.
    `,
    
    safety: `
      Extract all safety and property information.
      Return JSON with all safety details.
    `,
    
    cancellation: `
      Extract cancellation policy details.
      Return JSON with policy information.
    `,
    
    houseRules: `
      Extract all house rules.
      Return JSON with all rules.
    `
  }
  
  try {
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: screenshotBase64
        }
      },
      { text: prompts[modalType] || prompts.main }
    ])
    
    const response = await result.response
    const text = response.text()
    
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      console.log(`✅ Extracted ${modalType} data:`, JSON.stringify(parsed).substring(0, 200))
      return parsed
    }
    
    console.log(`⚠️ No JSON found in ${modalType} response`)
    return null
  } catch (error) {
    console.error(`❌ Failed to extract from ${modalType}:`, error)
    return null
  }
}

function structureData(extractedData: ExtractedData, url: string): ComprehensiveAirbnbListing {
  const mainData = extractedData.main || {}
  
  // Collect all amenities
  let allAmenities: string[] = []
  if (extractedData.amenities?.all_amenities) {
    allAmenities = extractedData.amenities.all_amenities
  }
  
  // Merge reviews
  let allReviews: any[] = []
  let reviewSummary: any = {}
  
  if (extractedData.reviews && extractedData.reviews.length > 0) {
    const firstPage = extractedData.reviews[0]
    if (firstPage?.overall || firstPage?.rating) {
      reviewSummary = {
        rating: firstPage.overall || firstPage.rating,
        totalCount: firstPage.totalCount || 0,
        categories: firstPage.categories || {}
      }
    }
    
    for (const page of extractedData.reviews) {
      if (page?.reviews && Array.isArray(page.reviews)) {
        allReviews = allReviews.concat(page.reviews)
      }
    }
  }
  
  // Calculate completeness
  const fieldsExtracted = 
    (mainData.title ? 5 : 0) +
    (allAmenities.length) +
    (allReviews.length) +
    (extractedData.safety ? 3 : 0) +
    (extractedData.cancellation ? 2 : 0) +
    (extractedData.houseRules ? 2 : 0)
  
  const dataCompleteness = Math.min(100, Math.round((fieldsExtracted / 50) * 100))
  
  return {
    id: extractListingId(url),
    url,
    title: mainData.title || 'Airbnb Listing',
    subtitle: mainData.subtitle,
    description: mainData.description || 'See listing',
    propertyType: mainData.propertyType || 'Place',
    
    guestCapacity: {
      adults: mainData.guests || 2,
      children: 0,
      infants: 0,
      total: mainData.guests || 2
    },
    
    spaces: {
      bedrooms: mainData.bedrooms || 1,
      beds: mainData.beds || 1,
      bathrooms: mainData.bathrooms || 1
    },
    
    host: {
      name: mainData.host?.name || 'Host',
      isSuperhost: mainData.host?.isSuperhost || false
    },
    
    pricing: {
      basePrice: mainData.price || 0,
      currency: 'USD'
    },
    
    location: {
      city: mainData.city || mainData.location?.city || 'Unknown',
      country: mainData.country || mainData.location?.country || 'Unknown'
    },
    
    photos: [],
    
    amenities: {
      basic: allAmenities
    },
    
    reviews: {
      summary: {
        rating: reviewSummary.rating || mainData.rating || 0,
        totalCount: reviewSummary.totalCount || mainData.reviewCount || 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        categories: reviewSummary.categories || {
          cleanliness: 0,
          accuracy: 0,
          communication: 0,
          location: 0,
          checkIn: 0,
          value: 0
        }
      },
      recentReviews: allReviews
    },
    
    houseRules: extractedData.houseRules || {
      checkIn: {},
      checkOut: {},
      during: {}
    },
    
    bookingSettings: {},
    
    cancellationPolicy: {
      type: extractedData.cancellation?.type || 'Standard',
      details: extractedData.cancellation
    },
    
    safety: extractedData.safety,
    
    meta: {
      scrapedAt: new Date().toISOString(),
      scrapeVersion: 'hybrid-light-v1',
      dataCompleteness,
      modalsCaptured: Object.keys(extractedData).filter(k => extractedData[k]).length
    }
  }
}

function extractListingId(url: string): string {
  const match = url.match(/rooms\/(\d+)/)
  return match ? match[1] : ''
}