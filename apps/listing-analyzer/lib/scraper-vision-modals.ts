// Vision scraper with modal capture and storage optimization
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
  hostProfile?: string
}

interface ExtractedModalData {
  main?: any
  reviews?: any[]
  amenities?: any
  safety?: any
  cancellation?: any
  houseRules?: any
  description?: any
  hostProfile?: any
}

export async function scrapeWithModals(url: string): Promise<ComprehensiveAirbnbListing> {
  const apiKey = process.env.BROWSERLESS_API_KEY
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
  
  if (!apiKey || !geminiKey) {
    throw new Error('API keys not configured')
  }
  
  const listingId = extractListingId(url)
  console.log(`🎯 Starting modal capture for listing ${listingId}`)
  
  try {
    // Step 1: Capture all modal screenshots
    console.log('📸 Capturing modal screenshots...')
    const screenshots = await captureAllModals(url, apiKey)
    
    // Step 2: Process each screenshot immediately and extract data
    console.log('🤖 Processing screenshots with Gemini Vision...')
    const extractedData = await processScreenshotsImmediately(screenshots, geminiKey)
    
    // Step 3: Structure the data into comprehensive listing
    console.log('🔄 Structuring extracted data...')
    const listing = structureModalData(extractedData, url)
    
    console.log(`✅ Modal scraping complete: ${listing.meta?.dataCompleteness}% data extracted`)
    
    return listing
    
  } catch (error) {
    console.error('❌ Modal scraping failed:', error)
    throw error
  }
}

async function captureAllModals(url: string, apiKey: string): Promise<ModalScreenshots> {
  const functionEndpoint = `https://production-sfo.browserless.io/function?token=${apiKey}`
  
  console.log('🌐 Connecting to Browserless function API...')
  
  // The function code must be an ESM module with export default
  const functionCode = `
    export default async function ({ page }) {
      const screenshots = {};
      
      try {
        // Navigate to the listing
        console.log('Navigating to: ${url}');
        await page.goto('${url}', { 
          waitUntil: 'networkidle2',
          timeout: 30000 
        });
        
        // Wait for main content to load
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 3000)));
        
        // 1. Capture main page (compressed JPEG)
        console.log('📸 Capturing main page...');
        screenshots.main = await page.screenshot({ 
          fullPage: true,
          type: 'jpeg',
          quality: 75
        });
        
        // Helper function to capture modal
        async function captureModal(selectors, name, scrollable = false) {
          try {
            // Try multiple selectors
            let button = null;
            for (const selector of selectors) {
              button = await page.$(selector);
              if (button) break;
            }
            
            if (!button) {
              console.log('Button not found for ' + name);
              return;
            }
            
            console.log('Opening ' + name + ' modal...');
            await button.click();
            await page.waitForSelector('[role="dialog"], [aria-modal="true"]', { timeout: 5000 });
            await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));
            
            const modal = await page.$('[role="dialog"], [aria-modal="true"]');
            if (!modal) return;
            
            if (scrollable) {
              // Handle scrollable modals (reviews)
              const shots = [];
              let scrollCount = 0;
              const maxScrolls = 5; // Limit to control size
              
              while (scrollCount < maxScrolls) {
                // Capture current view
                const shot = await modal.screenshot({
                  type: 'jpeg',
                  quality: 70
                });
                shots.push(shot);
                
                // Try to scroll
                const scrolled = await modal.evaluate(el => {
                  const before = el.scrollTop;
                  el.scrollBy(0, 800);
                  return el.scrollTop > before;
                });
                
                if (!scrolled) break; // Reached end
                
                await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1500))); // Wait for content
                scrollCount++;
              }
              
              screenshots[name] = shots;
              console.log('Captured ' + shots.length + ' screenshots for ' + name);
            } else {
              // Single screenshot
              screenshots[name] = await modal.screenshot({
                type: 'jpeg',
                quality: 75
              });
            }
            
            // Close modal
            await page.keyboard.press('Escape');
            await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 500)));
            
          } catch (error) {
            console.log('Error capturing ' + name + ':', error.message);
            // Try to close any open modal
            await page.keyboard.press('Escape');
          }
        }
        
        // 2. Reviews - use the link instead of button
        try {
          const reviewLink = await page.$('a[href*="/reviews"]');
          if (reviewLink) {
            console.log('Opening reviews via link...');
            await reviewLink.click();
            await page.waitForSelector('[role="dialog"], [aria-modal="true"]', { timeout: 5000 });
            await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));
            
            const modal = await page.$('[role="dialog"], [aria-modal="true"]');
            if (modal) {
              // Handle scrollable reviews
              const shots = [];
              let scrollCount = 0;
              const maxScrolls = 5;
              
              while (scrollCount < maxScrolls) {
                const shot = await modal.screenshot({
                  type: 'jpeg',
                  quality: 70
                });
                shots.push(shot);
                
                const scrolled = await modal.evaluate(el => {
                  const before = el.scrollTop;
                  el.scrollBy(0, 800);
                  return el.scrollTop > before;
                });
                
                if (!scrolled) break;
                await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1500)));
                scrollCount++;
              }
              
              screenshots.reviews = shots;
              console.log('Captured ' + shots.length + ' review screenshots');
              
              // Close modal
              await page.keyboard.press('Escape');
              await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 500)));
            }
          } else {
            console.log('Reviews link not found');
          }
        } catch (e) {
          console.log('Error capturing reviews:', e.message);
          await page.keyboard.press('Escape');
        }
        
        // 3. Amenities modal - find button with text "Show all X amenities"
        try {
          const amenitiesButton = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const btn = buttons.find(b => b.innerText?.match(/Show all \\d+ amenities/i));
            if (btn) {
              btn.click();
              return true;
            }
            return false;
          });
          
          if (amenitiesButton) {
            console.log('Opening amenities modal...');
            await page.waitForSelector('[role="dialog"], [aria-modal="true"]', { timeout: 5000 });
            await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));
            
            const modal = await page.$('[role="dialog"], [aria-modal="true"]');
            if (modal) {
              screenshots.amenities = await modal.screenshot({
                type: 'jpeg',
                quality: 75
              });
              console.log('Captured amenities screenshot');
              
              // Close modal
              await page.keyboard.press('Escape');
              await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 500)));
            }
          } else {
            console.log('Amenities button not found');
          }
        } catch (e) {
          console.log('Error capturing amenities:', e.message);
          await page.keyboard.press('Escape');
        }
        
        // 4. Safety & Property modal - use aria-label
        try {
          const safetyButton = await page.$('button[aria-label="More information about safety and property"]');
          if (safetyButton) {
            console.log('Opening safety modal...');
            await safetyButton.click();
            await page.waitForSelector('[role="dialog"], [aria-modal="true"]', { timeout: 5000 });
            await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));
            
            const modal = await page.$('[role="dialog"], [aria-modal="true"]');
            if (modal) {
              screenshots.safety = await modal.screenshot({
                type: 'jpeg',
                quality: 75
              });
              console.log('Captured safety screenshot');
              
              await page.keyboard.press('Escape');
              await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 500)));
            }
          } else {
            console.log('Safety button not found');
          }
        } catch (e) {
          console.log('Error capturing safety:', e.message);
          await page.keyboard.press('Escape');
        }
        
        // 5. Cancellation Policy - use aria-label
        try {
          const cancelButton = await page.$('button[aria-label="More information about cancellation policy"]');
          if (cancelButton) {
            console.log('Opening cancellation modal...');
            await cancelButton.click();
            await page.waitForSelector('[role="dialog"], [aria-modal="true"]', { timeout: 5000 });
            await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));
            
            const modal = await page.$('[role="dialog"], [aria-modal="true"]');
            if (modal) {
              screenshots.cancellation = await modal.screenshot({
                type: 'jpeg',
                quality: 75
              });
              console.log('Captured cancellation screenshot');
              
              await page.keyboard.press('Escape');
              await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 500)));
            }
          } else {
            console.log('Cancellation button not found');
          }
        } catch (e) {
          console.log('Error capturing cancellation:', e.message);
          await page.keyboard.press('Escape');
        }
        
        // 6. House Rules - use aria-label  
        try {
          const rulesButton = await page.$('button[aria-label="More information about house rules"]');
          if (rulesButton) {
            console.log('Opening house rules modal...');
            await rulesButton.click();
            await page.waitForSelector('[role="dialog"], [aria-modal="true"]', { timeout: 5000 });
            await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));
            
            const modal = await page.$('[role="dialog"], [aria-modal="true"]');
            if (modal) {
              screenshots.houseRules = await modal.screenshot({
                type: 'jpeg',
                quality: 75
              });
              console.log('Captured house rules screenshot');
              
              await page.keyboard.press('Escape');
              await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 500)));
            }
          } else {
            console.log('House rules button not found');
          }
        } catch (e) {
          console.log('Error capturing house rules:', e.message);
          await page.keyboard.press('Escape');
        }
        
        // 7. Check for expanded description - use aria-label
        try {
          const showMoreBtn = await page.$('button[aria-label="Show more about this place"]');
          if (showMoreBtn) {
            console.log('Expanding description...');
            await showMoreBtn.click();
            await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));
            
            // Take screenshot of expanded area
            const descSection = await page.$('[data-section-id="DESCRIPTION"]');
            if (!descSection) {
              // Try alternative selector
              const aboutSection = await page.evaluate(() => {
                const headings = Array.from(document.querySelectorAll('h2'));
                const aboutHeading = headings.find(h => h.innerText?.includes('About'));
                return aboutHeading?.parentElement?.parentElement;
              });
              if (aboutSection) {
                screenshots.description = await page.screenshot({
                  type: 'jpeg',
                  quality: 75,
                  clip: await aboutSection.boundingBox()
                });
                console.log('Captured description screenshot');
              }
            } else {
              screenshots.description = await descSection.screenshot({
                type: 'jpeg',
                quality: 75
              });
              console.log('Captured description screenshot');
            }
          } else {
            console.log('Show more description button not found');
          }
        } catch (e) {
          console.log('Description error:', e.message);
        }
        
        // Convert to base64 with size limit
        const result = {};
        let totalSize = 0;
        const MAX_SIZE = 3.5 * 1024 * 1024; // 3.5MB limit
        
        for (const [key, value] of Object.entries(screenshots)) {
          if (Array.isArray(value)) {
            // Handle array of screenshots (reviews)
            result[key] = [];
            for (const img of value) {
              const base64 = img.toString('base64');
              if (totalSize + base64.length < MAX_SIZE) {
                result[key].push(base64);
                totalSize += base64.length;
              } else {
                console.log('Size limit reached at ' + key);
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
        
        console.log('Total size: ' + (totalSize / 1024 / 1024).toFixed(2) + 'MB');
        console.log('Captured modals:', Object.keys(result));
        
        return {
          data: result,
          type: 'application/json'
        };
        
      } catch (error) {
        console.error('Modal capture error:', error);
        return {
          data: { error: error.message },
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
  if (result.error || result.data?.error) {
    throw new Error(`Modal capture error: ${result.error || result.data?.error}`)
  }
  
  // Extract the actual data from the response
  return (result.data || result) as ModalScreenshots
}

async function processScreenshotsImmediately(
  screenshots: ModalScreenshots, 
  geminiKey: string
): Promise<ExtractedModalData> {
  const genAI = new GoogleGenerativeAI(geminiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  
  const extractedData: ExtractedModalData = {}
  
  // Process main page
  if (screenshots.main) {
    console.log('🔍 Processing main page...')
    extractedData.main = await extractFromScreenshot(model, screenshots.main, 'main')
    delete screenshots.main // Free memory
  }
  
  // Process reviews (multiple screenshots)
  if (screenshots.reviews && screenshots.reviews.length > 0) {
    console.log(`🔍 Processing ${screenshots.reviews.length} review screenshots...`)
    extractedData.reviews = []
    
    for (let i = 0; i < screenshots.reviews.length; i++) {
      const reviewData = await extractFromScreenshot(model, screenshots.reviews[i], 'reviews', i)
      extractedData.reviews.push(reviewData)
      delete screenshots.reviews[i] // Free memory after each
    }
  }
  
  // Process other modals
  const modalTypes = ['amenities', 'safety', 'cancellation', 'houseRules', 'description']
  
  for (const modalType of modalTypes) {
    if (screenshots[modalType]) {
      console.log(`🔍 Processing ${modalType}...`)
      extractedData[modalType] = await extractFromScreenshot(model, screenshots[modalType], modalType)
      delete screenshots[modalType] // Free memory
    }
  }
  
  return extractedData
}

async function extractFromScreenshot(
  model: any, 
  screenshotBase64: string, 
  modalType: string, 
  pageNum?: number
): Promise<any> {
  const prompt = getPromptForModal(modalType, pageNum)
  
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
      Extract ALL visible information from this Airbnb listing main page:
      - Title, property type, location
      - Price (base, cleaning fee, service fee, total)
      - Rating and review count
      - Host name and superhost status
      - Spaces (guests, bedrooms, beds, bathrooms)
      - Visible amenities
      - Any special badges or highlights
      
      Return comprehensive JSON with all data. Use null for missing data.
    `,
    
    reviews: `
      Extract from this reviews modal screenshot (page ${pageNum ? pageNum + 1 : 1}):
      
      1. If visible at top, extract:
         - Overall rating (X.X format)
         - Total review count
         - Category ratings (Cleanliness, Accuracy, Check-in, Communication, Location, Value)
      
      2. Extract ALL visible reviews:
         - Reviewer name
         - Review date
         - Complete review text
         - Host response if present
      
      3. If a review is cut off at bottom, mark as "partial": true
      
      Return JSON: {
        "overall": number or null,
        "totalCount": number or null,
        "categories": { "cleanliness": X.X, ... } or null,
        "reviews": [{ "name": "", "date": "", "text": "", "partial": false }]
      }
    `,
    
    amenities: `
      Extract ALL amenities from this modal, organized by category:
      
      Return JSON: {
        "essentials": ["item1", "item2"],
        "kitchen": [],
        "bathroom": [],
        "bedroom": [],
        "entertainment": [],
        "heating_cooling": [],
        "outdoor": [],
        "parking": [],
        "safety": [],
        "notIncluded": []
      }
    `,
    
    safety: `
      Extract all safety and property information:
      
      Return JSON: {
        "safetyDevices": {
          "smokeAlarm": true/false/null,
          "carbonMonoxideAlarm": true/false/null,
          "fireExtinguisher": true/false/null,
          "firstAidKit": true/false/null
        },
        "propertyInfo": ["item1", "item2"],
        "cameras": "description or null",
        "considerations": ["consideration1", "consideration2"]
      }
    `,
    
    cancellation: `
      Extract cancellation policy details:
      
      Return JSON: {
        "policyType": "Flexible/Moderate/Strict/etc",
        "fullRefundDeadline": "text",
        "partialRefundRules": ["rule1", "rule2"],
        "serviceFeeRefund": "text",
        "exceptions": "text"
      }
    `,
    
    houseRules: `
      Extract all house rules:
      
      Return JSON: {
        "checkIn": { "time": "", "method": "" },
        "checkOut": { "time": "" },
        "maxGuests": number,
        "children": "allowed/not allowed",
        "pets": "allowed/not allowed",
        "smoking": "allowed/not allowed",
        "parties": "allowed/not allowed",
        "additionalRules": ["rule1", "rule2"]
      }
    `,
    
    description: `
      Extract the full property description:
      
      Return JSON: {
        "overview": "main description text",
        "theSpace": "space description",
        "guestAccess": "access description",
        "otherNotes": "other things to note"
      }
    `
  }
  
  return prompts[modalType] || prompts.main
}

function structureModalData(extractedData: ExtractedModalData, url: string): ComprehensiveAirbnbListing {
  const mainData = extractedData.main || {}
  
  // Merge all review data
  let allReviews = []
  let reviewSummary = {}
  
  if (extractedData.reviews && extractedData.reviews.length > 0) {
    // First page might have summary
    if (extractedData.reviews[0]?.overall) {
      reviewSummary = {
        rating: extractedData.reviews[0].overall,
        totalCount: extractedData.reviews[0].totalCount,
        categories: extractedData.reviews[0].categories
      }
    }
    
    // Collect all reviews from all pages
    for (const page of extractedData.reviews) {
      if (page?.reviews) {
        allReviews = allReviews.concat(page.reviews)
      }
    }
  }
  
  // Calculate completeness
  const fieldsExtracted = countExtractedModalFields({
    mainData,
    reviews: allReviews,
    amenities: extractedData.amenities,
    safety: extractedData.safety,
    cancellation: extractedData.cancellation,
    houseRules: extractedData.houseRules
  })
  
  const dataCompleteness = Math.min(100, Math.round((fieldsExtracted / 50) * 100))
  
  return {
    id: extractListingId(url),
    url,
    title: mainData.title || 'Airbnb Listing',
    subtitle: mainData.subtitle,
    description: extractedData.description?.overview || mainData.description || 'See listing',
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
      currency: mainData.price?.currency || 'USD',
      cleaningFee: mainData.price?.cleaningFee,
      serviceFee: mainData.price?.serviceFee
    },
    
    location: {
      city: mainData.location?.city || 'Unknown',
      state: mainData.location?.state,
      country: mainData.location?.country || 'Unknown'
    },
    
    photos: [],
    
    amenities: {
      basic: [
        ...(extractedData.amenities?.essentials || []),
        ...(extractedData.amenities?.kitchen || []),
        ...(extractedData.amenities?.bathroom || []),
        ...(extractedData.amenities?.outdoor || [])
      ].filter(Boolean)
    },
    
    reviews: {
      summary: {
        rating: reviewSummary.rating || mainData.rating?.overall || 0,
        totalCount: reviewSummary.totalCount || mainData.rating?.reviewCount || 0,
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
      recentReviews: allReviews.slice(0, 100) // Limit to 100 reviews
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
      scrapeVersion: 'vision-modals-v1',
      dataCompleteness,
      modalsCaptured: Object.keys(extractedData).length
    }
  }
}

function extractListingId(url: string): string {
  const match = url.match(/rooms\/(\d+)/)
  return match ? match[1] : ''
}

function countExtractedModalFields(data: any): number {
  let count = 0
  
  // Main data fields
  if (data.mainData?.title) count++
  if (data.mainData?.price?.base) count++
  if (data.mainData?.rating?.overall) count++
  if (data.mainData?.host?.name) count++
  if (data.mainData?.location?.city) count++
  if (data.mainData?.spaces?.bedrooms) count++
  
  // Reviews
  if (data.reviews && data.reviews.length > 0) {
    count += Math.min(20, data.reviews.length) // Up to 20 points for reviews
  }
  
  // Amenities
  if (data.amenities) {
    const amenityCount = Object.values(data.amenities)
      .filter(arr => Array.isArray(arr))
      .reduce((sum, arr) => sum + arr.length, 0)
    count += Math.min(10, amenityCount) // Up to 10 points for amenities
  }
  
  // Safety
  if (data.safety?.safetyDevices) count += 3
  
  // Cancellation
  if (data.cancellation?.policyType) count += 2
  
  // House rules
  if (data.houseRules?.checkIn) count += 2
  
  return count
}