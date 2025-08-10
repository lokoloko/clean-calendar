// Working Function API Implementation with Modal Extraction
import { GoogleGenerativeAI } from '@google/generative-ai'
import { ComprehensiveAirbnbListing } from './types/listing'

interface ModalScreenshots {
  amenities?: string
  reviews?: string[]
  safety?: string
  cancellation?: string
  houseRules?: string
  description?: string
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

export async function scrapeWithWorkingFunction(url: string): Promise<ComprehensiveAirbnbListing> {
  const apiKey = process.env.BROWSERLESS_API_KEY
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
  
  if (!apiKey || !geminiKey) {
    throw new Error('API keys not configured')
  }
  
  const listingId = extractListingId(url)
  console.log(`🎯 Starting working function scraping for listing ${listingId}`)
  
  try {
    // Step 1: Capture main page and modals using function API
    console.log('📸 Capturing page and modals...')
    const screenshots = await captureAllScreenshots(url, apiKey)
    
    // Step 2: Extract data from screenshots using Vision AI
    const extractedData: ExtractedData = {}
    
    if (screenshots.main) {
      console.log('🤖 Extracting main page data...')
      extractedData.main = await extractWithVision(screenshots.main, geminiKey, 'main')
    }
    
    if (screenshots.amenities) {
      console.log('🏠 Extracting amenities...')
      extractedData.amenities = await extractWithVision(screenshots.amenities, geminiKey, 'amenities')
    }
    
    if (screenshots.reviews && screenshots.reviews.length > 0) {
      console.log('💬 Extracting reviews...')
      extractedData.reviews = []
      for (let i = 0; i < screenshots.reviews.length; i++) {
        const reviewData = await extractWithVision(screenshots.reviews[i], geminiKey, 'reviews', i)
        if (reviewData) extractedData.reviews.push(reviewData)
      }
    }
    
    if (screenshots.safety) {
      console.log('🛡️ Extracting safety info...')
      extractedData.safety = await extractWithVision(screenshots.safety, geminiKey, 'safety')
    }
    
    if (screenshots.cancellation) {
      console.log('📋 Extracting cancellation policy...')
      extractedData.cancellation = await extractWithVision(screenshots.cancellation, geminiKey, 'cancellation')
    }
    
    if (screenshots.houseRules) {
      console.log('📋 Extracting house rules...')
      extractedData.houseRules = await extractWithVision(screenshots.houseRules, geminiKey, 'houseRules')
    }
    
    // Step 3: Structure the data
    console.log('🔄 Structuring extracted data...')
    const listing = structureData(extractedData, url)
    
    console.log(`✅ Scraping complete: ${listing.meta?.dataCompleteness}% data extracted`)
    console.log(`📊 Modals captured: ${listing.meta?.modalsCaptured}`)
    
    return listing
    
  } catch (error) {
    console.error('❌ Scraping failed:', error)
    throw error
  }
}

async function captureAllScreenshots(url: string, apiKey: string): Promise<any> {
  const functionEndpoint = `https://production-sfo.browserless.io/function?token=${apiKey}`
  
  // ESM module code using patterns that work
  const functionCode = `
export default async function({ page }) {
  const screenshots = {
    main: null,
    amenities: null,
    reviews: [],
    safety: null,
    cancellation: null,
    houseRules: null
  };
  
  const logs = [];
  
  try {
    // Helper function for waiting
    const wait = async (ms) => {
      await page.evaluate((ms) => new Promise(resolve => setTimeout(resolve, ms)), ms);
    };
    
    // Helper function to dismiss modals
    const dismissModal = async () => {
      try {
        await page.keyboard.press('Escape');
        await wait(500);
      } catch (e) {}
    };
    
    // Navigate to page
    logs.push('Navigating to page...');
    await page.goto('${url}', { waitUntil: 'networkidle2' });
    await wait(3000);
    
    // Dismiss any initial modals (translation, cookies, etc.)
    await dismissModal();
    await wait(500);
    
    // Capture main page screenshot
    logs.push('Capturing main page...');
    screenshots.main = await page.screenshot({
      type: 'jpeg',
      quality: 75,
      encoding: 'base64',
      fullPage: true
    });
    
    // AMENITIES MODAL
    try {
      logs.push('Opening amenities modal...');
      
      // Find and click amenities button
      const amenitiesClicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => 
          b.innerText && b.innerText.match(/Show all \\d+ amenities/i)
        );
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      });
      
      if (amenitiesClicked) {
        await wait(2000);
        
        // Check if modal opened
        const modalExists = await page.$('[role="dialog"]');
        if (modalExists) {
          logs.push('Amenities modal opened, capturing...');
          
          // Scroll to load all amenities
          await page.evaluate(() => {
            const modal = document.querySelector('[role="dialog"]');
            if (modal) {
              const scrollable = modal.querySelector('[style*="overflow"]') || modal;
              scrollable.scrollTop = scrollable.scrollHeight;
            }
          });
          await wait(1000);
          
          screenshots.amenities = await page.screenshot({
            type: 'jpeg',
            quality: 85,
            encoding: 'base64',
            fullPage: false
          });
          
          await dismissModal();
          await wait(1000);
        }
      }
    } catch (e) {
      logs.push('Amenities error: ' + e.message);
    }
    
    // REVIEWS MODAL
    try {
      logs.push('Opening reviews modal...');
      
      const reviewsClicked = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        const link = links.find(a => a.href && a.href.includes('/reviews'));
        if (link) {
          link.click();
          return true;
        }
        
        // Try button with reviews text
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => 
          b.innerText && b.innerText.match(/\\d+ review/i)
        );
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      });
      
      if (reviewsClicked) {
        await wait(2000);
        
        const modalExists = await page.$('[role="dialog"]');
        if (modalExists) {
          logs.push('Reviews modal opened, capturing pages...');
          
          // Capture multiple pages with scrolling
          for (let i = 0; i < 3; i++) {
            const screenshot = await page.screenshot({
              type: 'jpeg',
              quality: 85,
              encoding: 'base64',
              fullPage: false
            });
            screenshots.reviews.push(screenshot);
            
            // Scroll for more reviews
            const scrolled = await page.evaluate(() => {
              const modal = document.querySelector('[role="dialog"]');
              if (!modal) return false;
              
              let scrollContainer = modal;
              const divs = modal.querySelectorAll('div');
              for (const div of divs) {
                if (div.scrollHeight > div.clientHeight) {
                  scrollContainer = div;
                  break;
                }
              }
              
              const before = scrollContainer.scrollTop;
              scrollContainer.scrollBy(0, 800);
              return scrollContainer.scrollTop > before;
            });
            
            if (!scrolled) break;
            await wait(1500);
          }
          
          await dismissModal();
          await wait(1000);
        }
      }
    } catch (e) {
      logs.push('Reviews error: ' + e.message);
    }
    
    // OTHER MODALS (Safety, Cancellation, House Rules)
    const otherModals = [
      { 
        name: 'safety', 
        patterns: ['safety', 'property', 'Safety & property']
      },
      { 
        name: 'cancellation', 
        patterns: ['cancellation', 'Cancellation policy', 'refund']
      },
      { 
        name: 'houseRules', 
        patterns: ['house rules', 'House rules', 'rules']
      }
    ];
    
    for (const modalInfo of otherModals) {
      try {
        logs.push('Opening ' + modalInfo.name + ' modal...');
        
        const clicked = await page.evaluate((patterns) => {
          const buttons = Array.from(document.querySelectorAll('button'));
          for (const pattern of patterns) {
            const btn = buttons.find(b => {
              const text = b.innerText || '';
              const aria = b.getAttribute('aria-label') || '';
              return text.toLowerCase().includes(pattern.toLowerCase()) ||
                     aria.toLowerCase().includes(pattern.toLowerCase());
            });
            if (btn) {
              btn.click();
              return true;
            }
          }
          return false;
        }, modalInfo.patterns);
        
        if (clicked) {
          await wait(2000);
          
          const modalExists = await page.$('[role="dialog"]');
          if (modalExists) {
            logs.push(modalInfo.name + ' modal opened, capturing...');
            screenshots[modalInfo.name] = await page.screenshot({
              type: 'jpeg',
              quality: 85,
              encoding: 'base64',
              fullPage: false
            });
            
            await dismissModal();
            await wait(1000);
          }
        }
      } catch (e) {
        logs.push(modalInfo.name + ' error: ' + e.message);
      }
    }
    
    logs.push('All captures complete');
    
  } catch (error) {
    logs.push('Fatal error: ' + error.message);
  }
  
  // Count successful captures
  const captureCount = Object.values(screenshots).filter(v => 
    v !== null && (Array.isArray(v) ? v.length > 0 : true)
  ).length;
  
  return {
    data: {
      screenshots,
      logs,
      stats: {
        mainCaptured: !!screenshots.main,
        amenitiesCaptured: !!screenshots.amenities,
        reviewsPages: screenshots.reviews.length,
        safetyCaptured: !!screenshots.safety,
        cancellationCaptured: !!screenshots.cancellation,
        houseRulesCaptured: !!screenshots.houseRules,
        totalModals: captureCount
      }
    },
    type: 'application/json'
  };
}
  `.trim()
  
  try {
    const response = await fetch(functionEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code: functionCode,
        context: {}
      })
    })
    
    if (!response.ok) {
      throw new Error(`Function API failed: ${response.statusText}`)
    }
    
    const result = await response.json()
    
    if (result.data) {
      console.log('📋 Capture logs:')
      result.data.logs?.forEach((log: string) => console.log(`  - ${log}`))
      
      console.log('\n📊 Capture stats:', result.data.stats)
      
      return result.data.screenshots
    }
    
    return {}
    
  } catch (error) {
    console.error('Error in function API:', error)
    throw error
  }
}

async function extractWithVision(
  screenshotBase64: string, 
  geminiKey: string, 
  modalType: string,
  pageNum?: number
): Promise<any> {
  if (!screenshotBase64) return null
  
  console.log(`  Extracting ${modalType}... (${(screenshotBase64.length / 1024).toFixed(1)}KB)`)
  
  const genAI = new GoogleGenerativeAI(geminiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  
  const prompts = {
    main: `
      Analyze this Airbnb listing page and extract:
      - Title of the property
      - Property type (apartment, house, etc.)
      - Location (city, state/country)
      - Price per night (number only)
      - Rating (number)
      - Review count (number)
      - Host name
      - Is superhost (true/false)
      - Number of guests, bedrooms, beds, bathrooms
      
      Return ONLY valid JSON like:
      {
        "title": "...",
        "propertyType": "...",
        "location": "...",
        "price": 123,
        "rating": 4.5,
        "reviewCount": 100,
        "host": { "name": "...", "isSuperhost": false },
        "spaces": { "guests": 2, "bedrooms": 1, "beds": 1, "bathrooms": 1 }
      }
    `,
    
    amenities: `
      This is an Airbnb amenities modal. Extract ALL amenities you can see.
      
      Return ONLY valid JSON:
      {
        "amenities": ["item1", "item2", ...],
        "count": total_number
      }
    `,
    
    reviews: `
      Extract reviews from this modal${pageNum ? ' (page ' + (pageNum + 1) + ')' : ''}.
      ${pageNum === 0 ? 'Include overall rating and category scores if visible.' : ''}
      
      Return ONLY valid JSON:
      {
        ${pageNum === 0 ? '"overall": { "rating": 4.5, "total": 100, "categories": {...} },' : ''}
        "reviews": [
          { "name": "...", "date": "...", "text": "..." }
        ]
      }
    `,
    
    safety: `
      Extract safety and property information.
      Return ONLY valid JSON with all safety details you can see.
    `,
    
    cancellation: `
      Extract cancellation policy.
      Return ONLY valid JSON:
      {
        "type": "...",
        "details": "..."
      }
    `,
    
    houseRules: `
      Extract house rules.
      Return ONLY valid JSON:
      {
        "checkIn": "...",
        "checkOut": "...",
        "rules": ["rule1", "rule2", ...]
      }
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
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0])
      } catch (e) {
        console.log(`  ⚠️ Failed to parse JSON for ${modalType}`)
      }
    }
    
    return null
  } catch (error) {
    console.error(`  ❌ Vision extraction failed for ${modalType}:`, error)
    return null
  }
}

function structureData(extractedData: ExtractedData, url: string): ComprehensiveAirbnbListing {
  const mainData = extractedData.main || {}
  
  // Collect all amenities
  let allAmenities: string[] = []
  if (extractedData.amenities?.amenities) {
    allAmenities = extractedData.amenities.amenities
  }
  
  // Merge reviews
  let allReviews: any[] = []
  let reviewSummary: any = {}
  
  if (extractedData.reviews && extractedData.reviews.length > 0) {
    const firstPage = extractedData.reviews[0]
    if (firstPage?.overall) {
      reviewSummary = firstPage.overall
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
  
  // Count modals captured
  let modalsCaptured = 0
  if (extractedData.amenities) modalsCaptured++
  if (extractedData.reviews?.length > 0) modalsCaptured++
  if (extractedData.safety) modalsCaptured++
  if (extractedData.cancellation) modalsCaptured++
  if (extractedData.houseRules) modalsCaptured++
  
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
      basePrice: mainData.price || 150,
      currency: 'USD'
    },
    
    location: {
      city: mainData.location?.split(',')[0]?.trim() || 'Unknown',
      country: mainData.location?.split(',')[1]?.trim() || 'Unknown'
    },
    
    photos: [],
    
    amenities: {
      basic: allAmenities
    },
    
    reviews: {
      summary: {
        rating: reviewSummary.rating || mainData.rating || 0,
        totalCount: reviewSummary.total || mainData.reviewCount || 0,
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
      details: extractedData.cancellation?.details
    },
    
    safety: extractedData.safety,
    
    meta: {
      scrapedAt: new Date().toISOString(),
      scrapeVersion: 'working-function-v1',
      dataCompleteness,
      modalsCaptured
    }
  }
}

function extractListingId(url: string): string {
  const match = url.match(/rooms\/(\d+)/)
  return match ? match[1] : ''
}