// Hybrid modal scraper - uses reliable selectors and captures full modal screenshots
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

export async function scrapeWithModalsHybrid(url: string): Promise<ComprehensiveAirbnbListing> {
  const apiKey = process.env.BROWSERLESS_API_KEY
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
  
  if (!apiKey || !geminiKey) {
    throw new Error('API keys not configured')
  }
  
  const listingId = extractListingId(url)
  console.log(`🎯 Starting hybrid modal capture for listing ${listingId}`)
  
  try {
    // Step 1: Capture all modal screenshots with better selectors
    console.log('📸 Capturing modal screenshots...')
    const screenshots = await captureAllModalsHybrid(url, apiKey)
    
    // Log what we actually captured
    const capturedModals = Object.keys(screenshots).filter(k => k !== 'debugInfo')
    console.log(`📊 Captured modals: ${capturedModals.join(', ')}`)
    
    if (screenshots.debugInfo) {
      console.log('Debug info:', screenshots.debugInfo)
    }
    
    // Step 2: Process each screenshot immediately and extract data
    console.log('🤖 Processing screenshots with Gemini Vision...')
    const extractedData = await processScreenshots(screenshots, geminiKey)
    
    // Step 3: Structure the data into comprehensive listing
    console.log('🔄 Structuring extracted data...')
    const listing = structureData(extractedData, url)
    
    console.log(`✅ Modal scraping complete: ${listing.meta?.dataCompleteness}% data extracted`)
    
    return listing
    
  } catch (error) {
    console.error('❌ Modal scraping failed:', error)
    throw error
  }
}

async function captureAllModalsHybrid(url: string, apiKey: string): Promise<ModalScreenshots> {
  const functionEndpoint = `https://production-sfo.browserless.io/function?token=${apiKey}`
  
  console.log('🌐 Connecting to Browserless function API...')
  
  // The function code must be an ESM module with export default
  const functionCode = `
    export default async function ({ page }) {
      const screenshots = {};
      const debug = { logs: [], modalsCaptured: [] };
      
      try {
        // Navigate to the listing
        debug.logs.push('Navigating to: ${url}');
        await page.goto('${url}', { 
          waitUntil: 'networkidle2',
          timeout: 30000 
        });
        
        // Wait for main content to load
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 5000)));
        
        // 1. Capture main page (full page)
        debug.logs.push('Capturing main page...');
        screenshots.main = await page.screenshot({ 
          fullPage: true,
          type: 'jpeg',
          quality: 75
        });
        debug.logs.push('Main page captured: ' + screenshots.main.length + ' bytes');
        
        // 2. Amenities modal - try multiple approaches
        debug.logs.push('Looking for amenities...');
        
        // Use page.evaluate to click directly in the browser context
        let amenitiesOpened = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const btn = buttons.find(b => b.innerText?.match(/Show all \\d+ amenities/i));
          if (btn) {
            btn.click();
            return true;
          }
          return false;
        });
        
        if (amenitiesOpened) {
          debug.logs.push('Clicked amenities button');
        }
        
        if (amenitiesOpened) {
          debug.logs.push('Waiting for amenities modal...');
          await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));
          
          const modalExists = await page.$('[role="dialog"], [aria-modal="true"]');
          if (modalExists) {
            debug.logs.push('Amenities modal found, capturing...');
            
            // Capture the ENTIRE modal
            const modalScreenshot = await modalExists.screenshot({
              type: 'jpeg',
              quality: 85  // Higher quality for text
            });
            
            screenshots.amenities = modalScreenshot;
            debug.modalsCaptured.push('amenities (' + modalScreenshot.length + ' bytes)');
            
            // Get some debug info about what's in the modal
            const modalInfo = await page.evaluate(() => {
              const modal = document.querySelector('[role="dialog"], [aria-modal="true"]');
              if (modal) {
                const allText = modal.innerText;
                const lines = allText.split('\\n').filter(l => l.trim().length > 0);
                return {
                  totalLines: lines.length,
                  sampleLines: lines.slice(0, 10),
                  modalHeight: modal.offsetHeight,
                  modalWidth: modal.offsetWidth
                };
              }
              return null;
            });
            
            debug.amenitiesInfo = modalInfo;
            
            // Close modal
            await page.keyboard.press('Escape');
            await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 500)));
          } else {
            debug.logs.push('Amenities modal did not appear');
          }
        }
        
        // 3. Reviews - try link approach
        debug.logs.push('Looking for reviews...');
        const reviewsOpened = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a'));
          const link = links.find(a => a.href?.includes('/reviews'));
          if (link) {
            link.click();
            return true;
          }
          return false;
        });
        
        if (reviewsOpened) {
          debug.logs.push('Clicked reviews link');
          await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));
          
          const modalExists = await page.$('[role="dialog"], [aria-modal="true"]');
          if (modalExists) {
            debug.logs.push('Reviews modal found, capturing scrollable content...');
            
            // Capture multiple screenshots for scrollable content
            const shots = [];
            let scrollCount = 0;
            const maxScrolls = 3; // Reduced for testing
            
            // Just use the modal itself for screenshots
            
            while (scrollCount < maxScrolls) {
              const shot = await modalExists.screenshot({
                type: 'jpeg',
                quality: 75
              });
              shots.push(shot);
              debug.logs.push('Review screenshot ' + (scrollCount + 1) + ': ' + shot.length + ' bytes');
              
              // Try to scroll the modal content
              const scrolled = await page.evaluate(() => {
                const modal = document.querySelector('[role="dialog"], [aria-modal="true"]');
                if (modal) {
                  const scrollable = modal.querySelector('[style*="overflow"]') || modal;
                  const before = scrollable.scrollTop;
                  scrollable.scrollBy(0, 600);
                  return scrollable.scrollTop > before;
                }
                return false;
              });
              
              if (!scrolled) {
                debug.logs.push('Reached end of reviews');
                break;
              }
              
              await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1500)));
              scrollCount++;
            }
            
            screenshots.reviews = shots;
            debug.modalsCaptured.push('reviews (' + shots.length + ' screenshots)');
            
            await page.keyboard.press('Escape');
            await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 500)));
          } else {
            debug.logs.push('Reviews modal did not appear');
          }
        } else {
          debug.logs.push('Reviews link not found');
        }
        
        // 4. Other modals using aria-labels
        const modalButtons = [
          { 
            label: 'More information about safety and property',
            name: 'safety'
          },
          {
            label: 'More information about cancellation policy',
            name: 'cancellation'
          },
          {
            label: 'More information about house rules',
            name: 'houseRules'
          }
        ];
        
        for (const { label, name } of modalButtons) {
          debug.logs.push('Looking for ' + name + ' button...');
          const button = await page.$('button[aria-label="' + label + '"]');
          
          if (button) {
            debug.logs.push('Found ' + name + ' button, clicking...');
            await button.click();
            await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));
            
            const modalExists = await page.$('[role="dialog"], [aria-modal="true"]');
            if (modalExists) {
              const modalScreenshot = await modalExists.screenshot({
                type: 'jpeg',
                quality: 75
              });
              screenshots[name] = modalScreenshot;
              debug.modalsCaptured.push(name + ' (' + modalScreenshot.length + ' bytes)');
              
              await page.keyboard.press('Escape');
              await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 500)));
            } else {
              debug.logs.push(name + ' modal did not appear');
            }
          } else {
            debug.logs.push(name + ' button not found');
          }
        }
        
        // Convert to base64 with size limit
        const result = {};
        let totalSize = 0;
        const MAX_SIZE = 3.5 * 1024 * 1024; // 3.5MB limit
        
        for (const [key, value] of Object.entries(screenshots)) {
          if (key === 'debugInfo') continue;
          
          if (Array.isArray(value)) {
            // Handle array of screenshots (reviews)
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
        screenshots.debugInfo = debug;
        
        // Still return what we captured
        const result = {};
        let totalSize = 0;
        const MAX_SIZE = 3.5 * 1024 * 1024;
        
        for (const [key, value] of Object.entries(screenshots)) {
          if (key === 'debugInfo') continue;
          
          if (value && value.length) {
            const base64 = value.toString('base64');
            if (totalSize + base64.length < MAX_SIZE) {
              result[key] = base64;
              totalSize += base64.length;
            }
          }
        }
        
        result.debugInfo = debug;
        return {
          data: result,
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
  
  // The function returns { data, type } format
  // Don't throw on error if we have debug info - we want to see what happened
  if ((result.error || result.data?.error) && !result.data?.debugInfo) {
    throw new Error(`Modal capture error: ${result.error || result.data?.error}`)
  }
  
  // Extract the actual data from the response
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
    extractedData.main = await extractFromScreenshot(model, screenshots.main, 'main')
  }
  
  // Process amenities with specific prompt
  if (screenshots.amenities) {
    console.log('🔍 Processing amenities modal...')
    const amenitiesPrompt = `
      This is a screenshot of an Airbnb amenities modal.
      Extract ALL amenities you can see in the image.
      
      Look for:
      - Items with icons
      - Text descriptions
      - Categories like "Bathroom", "Bedroom and laundry", "Kitchen and dining", etc.
      - Both included and not included amenities
      
      Return JSON with ALL amenities organized by category:
      {
        "bathroom": ["item1", "item2"],
        "bedroom_laundry": ["item1", "item2"],
        "kitchen_dining": ["item1", "item2"],
        "heating_cooling": ["item1", "item2"],
        "entertainment": ["item1", "item2"],
        "internet_office": ["item1", "item2"],
        "parking": ["item1", "item2"],
        "outdoor": ["item1", "item2"],
        "services": ["item1", "item2"],
        "safety": ["item1", "item2"],
        "notIncluded": ["item1", "item2"],
        "other": ["item1", "item2"]
      }
      
      Be VERY thorough - extract EVERY amenity visible in the image.
    `
    
    extractedData.amenities = await extractFromScreenshot(model, screenshots.amenities, 'custom', amenitiesPrompt)
  }
  
  // Process reviews
  if (screenshots.reviews && screenshots.reviews.length > 0) {
    console.log(`🔍 Processing ${screenshots.reviews.length} review screenshots...`)
    
    // Debug what we have
    if (typeof screenshots.reviews[0] === 'number') {
      console.log('WARNING: Reviews are numbers, not base64 strings!')
      console.log('First review type:', typeof screenshots.reviews[0])
      console.log('First review length:', screenshots.reviews[0])
    }
    
    extractedData.reviews = []
    
    for (let i = 0; i < screenshots.reviews.length; i++) {
      // Make sure we have a valid base64 string
      const screenshot = screenshots.reviews[i]
      if (screenshot && typeof screenshot === 'string') {
        const reviewData = await extractFromScreenshot(model, screenshot, 'reviews', null, i)
        extractedData.reviews.push(reviewData)
      }
    }
  }
  
  // Process other modals
  const modalTypes = ['safety', 'cancellation', 'houseRules']
  for (const modalType of modalTypes) {
    if (screenshots[modalType]) {
      console.log(`🔍 Processing ${modalType}...`)
      extractedData[modalType] = await extractFromScreenshot(model, screenshots[modalType], modalType)
    }
  }
  
  return extractedData
}

async function extractFromScreenshot(
  model: any, 
  screenshotBase64: string, 
  modalType: string,
  customPrompt?: string,
  pageNum?: number
): Promise<any> {
  const prompt = customPrompt || getPromptForModal(modalType, pageNum)
  
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
    console.error(`Failed to extract from ${modalType}:`, error)
    return null
  }
}

function getPromptForModal(modalType: string, pageNum?: number): string {
  const prompts = {
    main: `
      Extract ALL visible information from this Airbnb listing main page.
      Return comprehensive JSON with all data. Use null for missing data.
    `,
    
    reviews: `
      Extract from this reviews modal screenshot (page ${pageNum ? pageNum + 1 : 1}).
      Extract ALL visible reviews with names, dates, and complete text.
      Return JSON with reviews array.
    `,
    
    safety: `
      Extract all safety and property information from this modal.
      Return JSON with all safety devices, property info, and considerations.
    `,
    
    cancellation: `
      Extract cancellation policy details.
      Return JSON with policy type, refund rules, and exceptions.
    `,
    
    houseRules: `
      Extract all house rules from this modal.
      Return JSON with check-in/out times, guest policies, and additional rules.
    `
  }
  
  return prompts[modalType] || prompts.main
}

function structureData(extractedData: any, url: string): ComprehensiveAirbnbListing {
  const mainData = extractedData.main || {}
  
  // Merge all amenities from the modal
  let allAmenities: string[] = []
  if (extractedData.amenities) {
    Object.values(extractedData.amenities).forEach((items: any) => {
      if (Array.isArray(items)) {
        allAmenities = allAmenities.concat(items)
      }
    })
  }
  
  // Count extracted fields for completeness
  const fieldsExtracted = 
    (mainData.title ? 5 : 0) +
    (allAmenities.length) +
    (extractedData.reviews ? extractedData.reviews.length * 2 : 0) +
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
      adults: mainData.spaces?.guests || 2,
      children: 0,
      infants: 0,
      total: mainData.spaces?.guests || 2
    },
    
    spaces: {
      bedrooms: mainData.spaces?.bedrooms || 1,
      beds: mainData.spaces?.beds || 1,
      bathrooms: mainData.spaces?.bathrooms || 1
    },
    
    host: {
      name: mainData.host?.name || 'Host',
      isSuperhost: mainData.host?.isSuperhost || false
    },
    
    pricing: {
      basePrice: mainData.price?.base || 0,
      currency: mainData.price?.currency || 'USD'
    },
    
    location: {
      city: mainData.location?.city || 'Unknown',
      country: mainData.location?.country || 'Unknown'
    },
    
    photos: [],
    
    amenities: {
      basic: allAmenities
    },
    
    reviews: {
      summary: {
        rating: mainData.rating?.overall || 0,
        totalCount: mainData.rating?.reviewCount || 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        categories: {
          cleanliness: 0,
          accuracy: 0,
          communication: 0,
          location: 0,
          checkIn: 0,
          value: 0
        }
      },
      recentReviews: []
    },
    
    houseRules: extractedData.houseRules || {
      checkIn: {},
      checkOut: {},
      during: {}
    },
    
    bookingSettings: {},
    
    cancellationPolicy: {
      type: extractedData.cancellation?.policyType || 'Standard',
      details: extractedData.cancellation
    },
    
    safety: extractedData.safety,
    
    meta: {
      scrapedAt: new Date().toISOString(),
      scrapeVersion: 'vision-modals-hybrid-v1',
      dataCompleteness,
      modalsCaptured: Object.keys(extractedData).length
    }
  }
}

function extractListingId(url: string): string {
  const match = url.match(/rooms\/(\d+)/)
  return match ? match[1] : ''
}