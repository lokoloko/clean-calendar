// Native Puppeteer modal scraper - uses native selectors and click methods
import { GoogleGenerativeAI } from '@google/generative-ai'
import { ComprehensiveAirbnbListing } from './types/listing'

interface ModalScreenshots {
  main?: string
  reviews?: string[]
  amenities?: string
  safety?: string
  cancellation?: string
  houseRules?: string
  description?: string
  debugInfo?: any
}

export async function scrapeWithNativeSelectors(url: string): Promise<ComprehensiveAirbnbListing> {
  const apiKey = process.env.BROWSERLESS_API_KEY
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
  
  if (!apiKey || !geminiKey) {
    throw new Error('API keys not configured')
  }
  
  const listingId = extractListingId(url)
  console.log(`🎯 Starting native selector modal capture for listing ${listingId}`)
  
  try {
    // Step 1: Capture all modal screenshots using native Puppeteer methods
    console.log('📸 Capturing modal screenshots with native selectors...')
    const screenshots = await captureModalsNative(url, apiKey)
    
    // Log what we captured
    const capturedModals = Object.keys(screenshots).filter(k => k !== 'debugInfo')
    console.log(`📊 Captured modals: ${capturedModals.join(', ')}`)
    
    if (screenshots.debugInfo) {
      console.log('📝 Debug logs:', screenshots.debugInfo.logs)
      console.log('✅ Modals captured:', screenshots.debugInfo.modalsCaptured)
    }
    
    // Step 2: Process screenshots with Vision AI
    console.log('🤖 Processing screenshots with Gemini Vision...')
    const extractedData = await processScreenshots(screenshots, geminiKey)
    
    // Step 3: Structure the data
    console.log('🔄 Structuring extracted data...')
    const listing = structureData(extractedData, url)
    
    console.log(`✅ Modal scraping complete: ${listing.meta?.dataCompleteness}% data extracted`)
    
    return listing
    
  } catch (error) {
    console.error('❌ Modal scraping failed:', error)
    throw error
  }
}

async function captureModalsNative(url: string, apiKey: string): Promise<ModalScreenshots> {
  const functionEndpoint = `https://production-sfo.browserless.io/function?token=${apiKey}`
  
  console.log('🌐 Connecting to Browserless function API...')
  
  // ESM module with native Puppeteer methods
  const functionCode = `
    export default async function ({ page }) {
      const screenshots = {};
      const debug = { logs: [], modalsCaptured: [] };
      
      try {
        // Navigate to listing
        debug.logs.push('Navigating to: ${url}');
        await page.goto('${url}', { 
          waitUntil: 'networkidle2',
          timeout: 30000 
        });
        
        // Wait for page to fully load
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // 1. Capture main page
        debug.logs.push('Capturing main page...');
        screenshots.main = await page.screenshot({ 
          fullPage: true,
          type: 'jpeg',
          quality: 75
        });
        debug.logs.push('Main page: ' + screenshots.main.length + ' bytes');
        
        // 2. Amenities modal - find button by text
        debug.logs.push('Looking for amenities button...');
        const buttons = await page.$$('button');
        let amenitiesFound = false;
        
        for (const button of buttons) {
          const text = await button.evaluate(el => el.innerText);
          if (text && text.match(/Show all \\d+ amenities/i)) {
            debug.logs.push('Found amenities button: ' + text);
            await button.click();
            amenitiesFound = true;
            break;
          }
        }
        
        if (amenitiesFound) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          const modal = await page.$('[role="dialog"], [aria-modal="true"]');
          
          if (modal) {
            debug.logs.push('Amenities modal opened, capturing...');
            screenshots.amenities = await modal.screenshot({
              type: 'jpeg',
              quality: 85
            });
            debug.modalsCaptured.push('amenities: ' + screenshots.amenities.length + ' bytes');
            
            // Close modal
            await page.keyboard.press('Escape');
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } else {
          debug.logs.push('Amenities button not found');
        }
        
        // 3. Reviews modal with infinite scroll
        debug.logs.push('Looking for reviews link...');
        const reviewLink = await page.$('a[href*="/reviews"]');
        
        if (reviewLink) {
          debug.logs.push('Found reviews link, clicking...');
          await reviewLink.click();
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const modal = await page.$('[role="dialog"], [aria-modal="true"]');
          if (modal) {
            debug.logs.push('Reviews modal opened, capturing with scroll...');
            
            const reviewShots = [];
            let scrollCount = 0;
            const maxScrolls = 5;
            
            while (scrollCount < maxScrolls) {
              // Capture current view
              const shot = await modal.screenshot({
                type: 'jpeg',
                quality: 75
              });
              reviewShots.push(shot);
              debug.logs.push('Review screenshot ' + (scrollCount + 1) + ': ' + shot.length + ' bytes');
              
              // Try to scroll within modal
              const scrolled = await page.evaluate(() => {
                const modalEl = document.querySelector('[role="dialog"]');
                if (modalEl) {
                  // Find scrollable container within modal
                  let scrollContainer = modalEl;
                  const divs = modalEl.querySelectorAll('div');
                  for (const div of divs) {
                    if (div.scrollHeight > div.clientHeight && div.style.overflow !== 'hidden') {
                      scrollContainer = div;
                      break;
                    }
                  }
                  
                  const before = scrollContainer.scrollTop;
                  scrollContainer.scrollBy(0, 800);
                  return scrollContainer.scrollTop > before;
                }
                return false;
              });
              
              if (!scrolled) {
                debug.logs.push('Reached end of reviews');
                break;
              }
              
              // Wait for new content to load
              await new Promise(resolve => setTimeout(resolve, 1500));
              scrollCount++;
            }
            
            screenshots.reviews = reviewShots;
            debug.modalsCaptured.push('reviews: ' + reviewShots.length + ' screenshots');
            
            // Close modal
            await page.keyboard.press('Escape');
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } else {
          debug.logs.push('Reviews link not found');
        }
        
        // 4. Description - expand if needed
        debug.logs.push('Looking for description expand button...');
        const showMoreBtn = await page.$('button[aria-label="Show more about this place"]');
        
        if (showMoreBtn) {
          debug.logs.push('Expanding description...');
          await showMoreBtn.click();
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Find the description section
          const descSection = await page.$('[data-section-id="DESCRIPTION"]');
          if (descSection) {
            screenshots.description = await descSection.screenshot({
              type: 'jpeg',
              quality: 75
            });
            debug.modalsCaptured.push('description: ' + screenshots.description.length + ' bytes');
          }
        }
        
        // 5. Other modals using aria-labels
        const modalConfigs = [
          { 
            selector: 'button[aria-label="More information about house rules"]',
            name: 'houseRules'
          },
          {
            selector: 'button[aria-label="More information about safety and property"]',
            name: 'safety'
          },
          {
            selector: 'button[aria-label="More information about cancellation policy"]',
            name: 'cancellation'
          }
        ];
        
        for (const config of modalConfigs) {
          debug.logs.push('Looking for ' + config.name + ' button...');
          const button = await page.$(config.selector);
          
          if (button) {
            debug.logs.push('Found ' + config.name + ' button, clicking...');
            await button.click();
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const modal = await page.$('[role="dialog"], [aria-modal="true"]');
            if (modal) {
              screenshots[config.name] = await modal.screenshot({
                type: 'jpeg',
                quality: 75
              });
              debug.modalsCaptured.push(config.name + ': ' + screenshots[config.name].length + ' bytes');
              
              await page.keyboard.press('Escape');
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          } else {
            debug.logs.push(config.name + ' button not found');
          }
        }
        
        // Convert to base64 with size limit
        const result = {};
        let totalSize = 0;
        const MAX_SIZE = 3.5 * 1024 * 1024;
        
        for (const [key, value] of Object.entries(screenshots)) {
          if (Array.isArray(value)) {
            // Handle review screenshots array
            result[key] = [];
            for (const img of value) {
              const base64 = img.toString('base64');
              if (totalSize + base64.length < MAX_SIZE) {
                result[key].push(base64);
                totalSize += base64.length;
              } else {
                debug.logs.push('Size limit reached at ' + key);
                break;
              }
            }
          } else if (value) {
            // Single screenshot
            const base64 = value.toString('base64');
            if (totalSize + base64.length < MAX_SIZE) {
              result[key] = base64;
              totalSize += base64.length;
            }
          }
        }
        
        debug.logs.push('Total size: ' + (totalSize / 1024 / 1024).toFixed(2) + 'MB');
        result.debugInfo = debug;
        
        return {
          data: result,
          type: 'application/json'
        };
        
      } catch (error) {
        debug.logs.push('Error: ' + error.message);
        return {
          data: { 
            error: error.message, 
            debugInfo: debug,
            screenshots: screenshots
          },
          type: 'application/json'
        };
      }
    }
  `;
  
  const response = await fetch(functionEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/javascript'
    },
    body: functionCode
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Browserless function failed: ${error}`)
  }
  
  const result = await response.json()
  
  // Don't throw on error if we have screenshots
  if (result.data?.error && !result.data?.screenshots) {
    throw new Error(`Modal capture error: ${result.data.error}`)
  }
  
  return (result.data || result) as ModalScreenshots
}

async function processScreenshots(
  screenshots: ModalScreenshots, 
  geminiKey: string
): Promise<any> {
  const genAI = new GoogleGenerativeAI(geminiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  
  const extractedData: any = {}
  
  // Process main page
  if (screenshots.main) {
    console.log('🔍 Processing main page...')
    const mainPrompt = `
      Extract from this Airbnb listing main page:
      - Title, property type, location (city, state, country)
      - Price (base price per night if visible)
      - Rating and review count
      - Host name and superhost status
      - Spaces (guests, bedrooms, beds, bathrooms)
      
      Return JSON with all found data.
    `
    extractedData.main = await extractFromScreenshot(model, screenshots.main, mainPrompt)
  }
  
  // Process amenities with detailed prompt
  if (screenshots.amenities) {
    console.log('🔍 Processing amenities modal...')
    const amenitiesPrompt = `
      This is an Airbnb amenities modal screenshot.
      Extract ALL amenities visible, including:
      - Items with icons
      - Text descriptions
      - Categories (Bathroom, Kitchen, Bedroom, etc.)
      - Not included items (if shown)
      
      Return JSON:
      {
        "all_amenities": ["item1", "item2", ...list ALL items],
        "count": total number
      }
    `
    extractedData.amenities = await extractFromScreenshot(model, screenshots.amenities, amenitiesPrompt)
  }
  
  // Process reviews (multiple screenshots)
  if (screenshots.reviews && screenshots.reviews.length > 0) {
    console.log(`🔍 Processing ${screenshots.reviews.length} review screenshots...`)
    extractedData.reviews = []
    
    for (let i = 0; i < screenshots.reviews.length; i++) {
      const reviewPrompt = `
        Extract from this reviews modal (page ${i + 1}):
        ${i === 0 ? '- Overall rating and total count (if visible at top)\n- Category ratings (Cleanliness, Accuracy, etc.) if shown' : ''}
        - All individual reviews with:
          - Reviewer name
          - Review date
          - Complete review text
        
        Return JSON with reviews array.
      `
      
      const reviewData = await extractFromScreenshot(model, screenshots.reviews[i], reviewPrompt)
      extractedData.reviews.push(reviewData)
    }
  }
  
  // Process other modals
  if (screenshots.houseRules) {
    console.log('🔍 Processing house rules...')
    const rulesPrompt = `
      Extract all house rules including:
      - Check-in/out times
      - Guest policies (children, pets, parties, smoking)
      - Additional rules
      
      Return JSON with all rules.
    `
    extractedData.houseRules = await extractFromScreenshot(model, screenshots.houseRules, rulesPrompt)
  }
  
  if (screenshots.safety) {
    console.log('🔍 Processing safety information...')
    const safetyPrompt = `
      Extract safety and property information including:
      - Safety devices (smoke alarm, CO detector, etc.)
      - Property features
      - Considerations or warnings
      
      Return JSON with all safety info.
    `
    extractedData.safety = await extractFromScreenshot(model, screenshots.safety, safetyPrompt)
  }
  
  if (screenshots.cancellation) {
    console.log('🔍 Processing cancellation policy...')
    const cancelPrompt = `
      Extract cancellation policy details including:
      - Policy type
      - Refund rules and deadlines
      - Exceptions
      
      Return JSON with policy details.
    `
    extractedData.cancellation = await extractFromScreenshot(model, screenshots.cancellation, cancelPrompt)
  }
  
  if (screenshots.description) {
    console.log('🔍 Processing description...')
    const descPrompt = `
      Extract the full property description text.
      
      Return JSON: { "description": "full text" }
    `
    extractedData.description = await extractFromScreenshot(model, screenshots.description, descPrompt)
  }
  
  return extractedData
}

async function extractFromScreenshot(
  model: any, 
  screenshotBase64: string, 
  prompt: string
): Promise<any> {
  try {
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: screenshotBase64
        }
      },
      { text: prompt }
    ])
    
    const response = await result.response
    const text = response.text()
    
    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    
    return null
  } catch (error) {
    console.error('Failed to extract:', error)
    return null
  }
}

function structureData(extractedData: any, url: string): ComprehensiveAirbnbListing {
  const mainData = extractedData.main || {}
  
  // Collect all amenities
  let allAmenities: string[] = []
  if (extractedData.amenities?.all_amenities) {
    allAmenities = extractedData.amenities.all_amenities
  }
  
  // Merge reviews from multiple screenshots
  let allReviews: any[] = []
  let reviewSummary: any = {}
  
  if (extractedData.reviews && extractedData.reviews.length > 0) {
    // First screenshot might have summary
    const firstPage = extractedData.reviews[0]
    if (firstPage?.overall || firstPage?.rating) {
      reviewSummary = {
        rating: firstPage.overall || firstPage.rating,
        totalCount: firstPage.totalCount || firstPage.total || 0,
        categories: firstPage.categories || {}
      }
    }
    
    // Collect all individual reviews
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
    (extractedData.houseRules ? 3 : 0) +
    (extractedData.safety ? 3 : 0) +
    (extractedData.cancellation ? 2 : 0) +
    (extractedData.description ? 2 : 0)
  
  const dataCompleteness = Math.min(100, Math.round((fieldsExtracted / 50) * 100))
  
  return {
    id: extractListingId(url),
    url,
    title: mainData.title || 'Airbnb Listing',
    subtitle: mainData.subtitle,
    description: extractedData.description?.description || mainData.description || 'See listing',
    propertyType: mainData.propertyType || mainData.property_type || 'Place',
    
    guestCapacity: {
      adults: mainData.guests || mainData.spaces?.guests || 2,
      children: 0,
      infants: 0,
      total: mainData.guests || mainData.spaces?.guests || 2
    },
    
    spaces: {
      bedrooms: mainData.bedrooms || mainData.spaces?.bedrooms || 1,
      beds: mainData.beds || mainData.spaces?.beds || 1,
      bathrooms: mainData.bathrooms || mainData.spaces?.bathrooms || 1
    },
    
    host: {
      name: mainData.host?.name || mainData.hostName || 'Host',
      isSuperhost: mainData.host?.isSuperhost || mainData.isSuperhost || false
    },
    
    pricing: {
      basePrice: mainData.price || mainData.basePrice || 0,
      currency: mainData.currency || 'USD'
    },
    
    location: {
      city: mainData.city || mainData.location?.city || 'Unknown',
      state: mainData.state || mainData.location?.state,
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
      type: extractedData.cancellation?.type || extractedData.cancellation?.policyType || 'Standard',
      details: extractedData.cancellation
    },
    
    safety: extractedData.safety,
    
    meta: {
      scrapedAt: new Date().toISOString(),
      scrapeVersion: 'vision-native-v1',
      dataCompleteness,
      modalsCaptured: Object.keys(extractedData).filter(k => extractedData[k]).length
    }
  }
}

function extractListingId(url: string): string {
  const match = url.match(/rooms\/(\d+)/)
  return match ? match[1] : ''
}