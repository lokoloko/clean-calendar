// Hybrid Function Scraper - Uses Browserless function API with screenshots
import { GoogleGenerativeAI } from '@google/generative-ai'
import { ComprehensiveAirbnbListing } from './types/listing'

interface ExtractedData {
  main?: any
  amenities?: any
  reviews?: any[]
  safety?: any
  cancellation?: any
  houseRules?: any
  description?: any
}

export async function scrapeWithHybridFunction(url: string): Promise<ComprehensiveAirbnbListing> {
  const apiKey = process.env.BROWSERLESS_API_KEY
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
  
  if (!apiKey || !geminiKey) {
    throw new Error('API keys not configured')
  }
  
  const listingId = extractListingId(url)
  console.log(`🎯 Starting hybrid function scraping for listing ${listingId}`)
  
  try {
    // Step 1: Capture main page screenshot
    console.log('📸 Capturing main page...')
    const mainScreenshot = await captureScreenshot(url, apiKey)
    
    const extractedData: ExtractedData = {}
    if (mainScreenshot) {
      extractedData.main = await extractWithVision(mainScreenshot, geminiKey, 'main')
    }
    
    // Step 2: Use function API to capture modals
    console.log('🔄 Capturing modals with function API...')
    const modalScreenshots = await captureAllModals(url, apiKey)
    
    // Step 3: Extract data from modal screenshots
    if (modalScreenshots.amenities) {
      console.log('🏠 Extracting amenities...')
      extractedData.amenities = await extractWithVision(modalScreenshots.amenities, geminiKey, 'amenities')
    }
    
    if (modalScreenshots.reviews && modalScreenshots.reviews.length > 0) {
      console.log('💬 Extracting reviews...')
      extractedData.reviews = []
      for (let i = 0; i < modalScreenshots.reviews.length; i++) {
        const reviewData = await extractWithVision(modalScreenshots.reviews[i], geminiKey, 'reviews', i)
        if (reviewData) extractedData.reviews.push(reviewData)
      }
    }
    
    if (modalScreenshots.safety) {
      console.log('🛡️ Extracting safety...')
      extractedData.safety = await extractWithVision(modalScreenshots.safety, geminiKey, 'safety')
    }
    
    if (modalScreenshots.cancellation) {
      console.log('📋 Extracting cancellation...')
      extractedData.cancellation = await extractWithVision(modalScreenshots.cancellation, geminiKey, 'cancellation')
    }
    
    if (modalScreenshots.houseRules) {
      console.log('📋 Extracting house rules...')
      extractedData.houseRules = await extractWithVision(modalScreenshots.houseRules, geminiKey, 'houseRules')
    }
    
    // Step 4: Structure the data
    console.log('🔄 Structuring extracted data...')
    const listing = structureData(extractedData, url)
    
    console.log(`✅ Hybrid function scraping complete: ${listing.meta?.dataCompleteness}% data extracted`)
    
    return listing
    
  } catch (error) {
    console.error('❌ Hybrid function scraping failed:', error)
    throw error
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

async function captureAllModals(url: string, apiKey: string): Promise<any> {
  const functionEndpoint = `https://production-sfo.browserless.io/function?token=${apiKey}`
  
  // ESM module code to run in browser
  const functionCode = `
export default async function({ page }) {
  console.log('Starting modal capture...');
  
  const screenshots = {};
  
  try {
    // Go to the page
    await page.goto('${url}', { waitUntil: 'networkidle2' });
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 3000)));
    
    // Helper to take screenshot
    async function captureModal(name) {
      try {
        const screenshot = await page.screenshot({
          type: 'jpeg',
          quality: 85,
          fullPage: false
        });
        return screenshot.toString('base64');
      } catch (e) {
        console.error('Screenshot error for ' + name + ':', e);
        return null;
      }
    }
    
    // Capture amenities modal
    try {
      console.log('Opening amenities modal...');
      const amenitiesButton = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(b => b.innerText && b.innerText.match(/Show all \\d+ amenities/i));
      });
      
      if (amenitiesButton) {
        await amenitiesButton.click();
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));
        
        const modalExists = await page.$('[role="dialog"]');
        if (modalExists) {
          screenshots.amenities = await captureModal('amenities');
          
          // Close modal
          await page.keyboard.press('Escape');
          await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));
        }
      }
    } catch (e) {
      console.error('Amenities error:', e);
    }
    
    // Capture reviews modal with scrolling
    try {
      console.log('Opening reviews modal...');
      const reviewsLink = await page.evaluateHandle(() => {
        const links = Array.from(document.querySelectorAll('a'));
        return links.find(a => a.href && a.href.includes('/reviews'));
      });
      
      if (reviewsLink) {
        await reviewsLink.click();
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));
        
        const modalExists = await page.$('[role="dialog"]');
        if (modalExists) {
          screenshots.reviews = [];
          
          // Capture multiple pages with scrolling
          for (let i = 0; i < 3; i++) {
            const screenshot = await captureModal('reviews-' + i);
            if (screenshot) {
              screenshots.reviews.push(screenshot);
            }
            
            // Scroll the modal
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
            await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1500)));
          }
          
          // Close modal
          await page.keyboard.press('Escape');
          await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));
        }
      }
    } catch (e) {
      console.error('Reviews error:', e);
    }
    
    // Capture other modals (safety, cancellation, house rules)
    const otherModals = [
      { name: 'safety', selector: 'button[aria-label*="safety" i], button[aria-label*="property" i]' },
      { name: 'cancellation', selector: 'button[aria-label*="cancellation" i]' },
      { name: 'houseRules', selector: 'button[aria-label*="house rules" i]' }
    ];
    
    for (const modalInfo of otherModals) {
      try {
        console.log('Opening ' + modalInfo.name + ' modal...');
        const button = await page.$(modalInfo.selector);
        
        if (button) {
          await button.click();
          await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));
          
          const modalExists = await page.$('[role="dialog"]');
          if (modalExists) {
            screenshots[modalInfo.name] = await captureModal(modalInfo.name);
            
            // Close modal
            await page.keyboard.press('Escape');
            await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));
          }
        }
      } catch (e) {
        console.error(modalInfo.name + ' error:', e);
      }
    }
    
  } catch (error) {
    console.error('Modal capture error:', error);
  }
  
  return {
    data: screenshots,
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
        context: { url }
      })
    })
    
    if (!response.ok) {
      console.error('Function API failed:', response.statusText)
      return {}
    }
    
    const result = await response.json()
    console.log(`✅ Captured ${Object.keys(result).length} modal types`)
    console.log('Modal data keys:', Object.keys(result))
    console.log('Modal data sample:', JSON.stringify(result).substring(0, 500))
    return result
    
  } catch (error) {
    console.error('Error capturing modals:', error)
    return {}
  }
}

async function extractWithVision(
  screenshotBase64: string, 
  geminiKey: string, 
  modalType: string,
  pageNum?: number
): Promise<any> {
  console.log(`🤖 Extracting ${modalType} with Vision AI... (size: ${(screenshotBase64.length / 1024).toFixed(1)}KB)`)
  
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
    
    console.log(`Vision response for ${modalType}:`, text.substring(0, 300))
    
    // Try to extract JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0])
        console.log(`✅ Extracted ${modalType}:`, JSON.stringify(parsed).substring(0, 150) + '...')
        return parsed
      } catch (e) {
        console.log(`⚠️ Failed to parse JSON for ${modalType}`)
      }
    }
    
    // If no JSON, try to extract structured data
    if (modalType === 'main' && text.includes('title') || text.includes('Title')) {
      // Try to extract basic info from text
      const titleMatch = text.match(/[Tt]itle:?\s*([^\n]+)/)
      const priceMatch = text.match(/[Pp]rice:?\s*\$?(\d+)/)
      const ratingMatch = text.match(/[Rr]ating:?\s*([\d.]+)/)
      
      if (titleMatch || priceMatch) {
        return {
          title: titleMatch?.[1]?.trim(),
          price: priceMatch ? parseInt(priceMatch[1]) : undefined,
          rating: ratingMatch ? parseFloat(ratingMatch[1]) : undefined
        }
      }
    }
    
    console.log(`⚠️ No structured data found in ${modalType} response`)
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
    propertyType: mainData.propertyType || mainData.property_type || 'Place',
    
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
      name: mainData.host?.name || mainData.host_name || 'Host',
      isSuperhost: mainData.host?.isSuperhost || mainData.superhost || false
    },
    
    pricing: {
      basePrice: typeof mainData.price === 'number' ? mainData.price : 
                 (mainData.price?.match(/\d+/) ? parseInt(mainData.price.match(/\d+/)[0]) : 150),
      currency: 'USD'
    },
    
    location: {
      city: mainData.city || mainData.location?.split(',')[0] || 'Unknown',
      country: mainData.country || mainData.location?.split(',')[1]?.trim() || 'Unknown'
    },
    
    photos: [],
    
    amenities: {
      basic: allAmenities
    },
    
    reviews: {
      summary: {
        rating: reviewSummary.rating || mainData.rating || 0,
        totalCount: reviewSummary.totalCount || mainData.reviewCount || mainData.review_count || 0,
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
      scrapeVersion: 'hybrid-function-v1',
      dataCompleteness,
      modalsCaptured: Object.keys(extractedData).filter(k => extractedData[k] && k !== 'main').length
    }
  }
}

function extractListingId(url: string): string {
  const match = url.match(/rooms\/(\d+)/)
  return match ? match[1] : ''
}