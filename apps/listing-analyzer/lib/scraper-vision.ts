// Vision-based scraper using Browserless screenshots and Gemini Vision AI
import { GoogleGenerativeAI } from '@google/generative-ai'
import { ComprehensiveAirbnbListing } from './types/listing'
import fs from 'fs/promises'
import path from 'path'

interface ScreenshotSet {
  mainPage: Buffer
  reviewsModal?: Buffer
  amenitiesModal?: Buffer
  descriptionExpanded?: Buffer
  houseRulesModal?: Buffer
  safetyModal?: Buffer
  neighborhoodSection?: Buffer
  hostProfile?: Buffer
  photoGallery?: Buffer[]
  timestamp: Date
  listingId: string
}

interface ExtractedSection {
  data: any
  confidence: number
  source: string
}

// Screenshot storage directory
const SCREENSHOT_DIR = process.env.SCREENSHOT_DIR || '/tmp/listing-screenshots'

export async function scrapeWithVision(url: string): Promise<ComprehensiveAirbnbListing> {
  const listingId = extractListingId(url)
  
  console.log(`🎯 Starting vision-based scraping for listing ${listingId}`)
  
  try {
    // Step 1: Capture all screenshots
    console.log('📸 Capturing screenshots...')
    const screenshots = await captureAllScreenshots(url)
    
    // Step 2: Store screenshots for re-analysis
    console.log('💾 Storing screenshots...')
    await storeScreenshots(screenshots)
    
    // Step 3: Extract data using Vision AI
    console.log('🤖 Extracting data with Gemini Vision...')
    const extractedData = await extractDataFromScreenshots(screenshots)
    
    // Step 4: Merge and structure the data
    console.log('🔄 Merging extracted data...')
    const listing = structureListingData(extractedData, url)
    
    console.log(`✅ Vision scraping complete: ${listing.meta?.dataCompleteness}% data extracted`)
    
    return listing
    
  } catch (error) {
    console.error('❌ Vision scraping failed:', error)
    throw error
  }
}

async function captureAllScreenshots(url: string): Promise<ScreenshotSet> {
  const apiKey = process.env.BROWSERLESS_API_KEY
  
  if (!apiKey) {
    throw new Error('Browserless API key not configured')
  }
  
  const listingId = extractListingId(url)
  
  console.log('🌐 Connecting to Browserless...')
  
  // Use correct /chrome/screenshot endpoint from OpenAPI docs
  const screenshotEndpoint = `https://production-sfo.browserless.io/chrome/screenshot?token=${apiKey}`
  
  const response = await fetch(screenshotEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      url,
      options: {
        fullPage: true,
        type: 'png'
      },
      gotoOptions: {
        waitUntil: 'networkidle2'
      },
      waitForTimeout: 5000,  // Wait 5 seconds for content to load
      scrollPage: true,  // Scroll to trigger lazy loading
      bestAttempt: true  // Continue even on errors
    })
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Browserless screenshot failed: ${error}`)
  }
  
  // Screenshot endpoint returns the image directly as binary
  const screenshotBuffer = Buffer.from(await response.arrayBuffer())
  
  // For now, we just capture the main page
  // TODO: Add modal capturing with Browserless function API
  const screenshots: ScreenshotSet = {
    mainPage: screenshotBuffer,
    timestamp: new Date(),
    listingId
  }
  
  console.log(`📸 Captured main page screenshot (${screenshotBuffer.length} bytes)`)
  
  return screenshots
}

async function storeScreenshots(screenshots: ScreenshotSet): Promise<void> {
  const dir = path.join(SCREENSHOT_DIR, screenshots.listingId)
  
  try {
    // Create directory if it doesn't exist
    await fs.mkdir(dir, { recursive: true })
    
    // Store each screenshot
    const timestamp = Date.now()
    
    await fs.writeFile(
      path.join(dir, `main-${timestamp}.png`),
      screenshots.mainPage
    )
    
    if (screenshots.reviewsModal) {
      await fs.writeFile(
        path.join(dir, `reviews-${timestamp}.png`),
        screenshots.reviewsModal
      )
    }
    
    if (screenshots.amenitiesModal) {
      await fs.writeFile(
        path.join(dir, `amenities-${timestamp}.png`),
        screenshots.amenitiesModal
      )
    }
    
    if (screenshots.descriptionExpanded) {
      await fs.writeFile(
        path.join(dir, `description-${timestamp}.png`),
        screenshots.descriptionExpanded
      )
    }
    
    // Store metadata
    const metadata = {
      listingId: screenshots.listingId,
      timestamp: screenshots.timestamp,
      files: Object.keys(screenshots).filter(k => k !== 'listingId' && k !== 'timestamp')
    }
    
    await fs.writeFile(
      path.join(dir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    )
    
    console.log(`💾 Stored screenshots in ${dir}`)
    
  } catch (error) {
    console.warn('Could not store screenshots:', error)
    // Continue even if storage fails
  }
}

async function extractDataFromScreenshots(screenshots: ScreenshotSet): Promise<ExtractedSection[]> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
  
  if (!apiKey) {
    throw new Error('Gemini API key not configured')
  }
  
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-1.5-flash' // Fast model for initial implementation
  })
  
  const extractedSections: ExtractedSection[] = []
  
  // Extract from main page
  if (screenshots.mainPage && screenshots.mainPage.length > 0) {
    console.log('🔍 Extracting from main page...')
    
    const mainPagePrompt = `
    You are an expert at extracting data from Airbnb listing screenshots. Analyze this image carefully and extract ALL visible information.
    
    Look for and extract:
    1. Title - The main property title (usually large text at top)
    2. Property type - Look for "Entire place", "Private room", "Shared room", etc.
    3. Location - City, state, country (often near title or in breadcrumb)
    4. Host info - Name (after "Hosted by" or profile section), Superhost badge
    5. Price - Look for $ symbol, per night price, cleaning fee, service fee, total price
    6. Ratings - Star rating (X.X format), number of reviews
    7. Property details - guests, bedrooms, beds, baths (usually as "X guests · X bedrooms · X beds · X bath")
    8. Amenities - Any visible amenities like Wifi, Kitchen, Free parking, Pool, etc.
    9. Description text - Any visible description paragraph
    10. Check-in/out dates if shown
    11. Availability or booking status
    12. Photos count if shown
    13. Any special badges (Rare find, Guest favorite, etc.)
    14. Review highlights or recent review snippets
    15. House rules preview if visible
    
    Return a comprehensive JSON object with all found data. Use null for data not visible. Be very thorough - extract EVERYTHING you can see:
    
    {
      "title": "exact title text",
      "subtitle": "any subtitle if present",
      "propertyType": "Entire place/Private room/Shared room/etc",
      "specialBadges": ["Superhost", "Rare find", "Guest favorite"],
      "price": {
        "base": number or null,
        "currency": "USD/EUR/etc",
        "cleaningFee": number or null,
        "serviceFee": number or null,
        "totalPrice": number or null,
        "priceString": "exact price text shown"
      },
      "rating": {
        "overall": number (e.g., 4.95),
        "reviewCount": number,
        "reviewString": "exact review text (e.g., '4.95 · 127 reviews')"
      },
      "host": {
        "name": "host name",
        "isSuperhost": boolean,
        "profileVisible": boolean,
        "yearsHosting": number or null
      },
      "location": {
        "city": "city",
        "state": "state/region",
        "country": "country",
        "neighborhood": "neighborhood if shown",
        "fullLocation": "complete location string"
      },
      "spaces": {
        "guests": number,
        "bedrooms": number,
        "beds": number,
        "bathrooms": number,
        "propertySize": "size if shown",
        "spaceString": "exact space description (e.g., '6 guests · 2 bedrooms · 3 beds · 2 baths')"
      },
      "amenities": {
        "highlighted": ["top amenities shown prominently"],
        "icons": ["amenities shown with icons"],
        "count": "total amenities count if shown (e.g., 'Show all 42 amenities')"
      },
      "description": {
        "preview": "visible description text",
        "hasMore": boolean indicating if 'Show more' button exists
      },
      "availability": {
        "checkIn": "date if shown",
        "checkOut": "date if shown",
        "minimumStay": "minimum nights if shown"
      },
      "photos": {
        "mainPhoto": "description of main photo",
        "totalCount": "number if shown (e.g., 'Show all 23 photos')",
        "gridVisible": boolean
      },
      "reviews": {
        "highlights": ["review snippet texts if visible"],
        "categories": {
          "cleanliness": number or null,
          "accuracy": number or null,
          "checkIn": number or null,
          "communication": number or null,
          "location": number or null,
          "value": number or null
        }
      },
      "bookingInfo": {
        "instantBook": boolean or null,
        "rareFind": boolean,
        "guestFavorite": boolean,
        "bookingCount": "X guests have booked recently" if shown
      }
    }
    
    Be extremely thorough and extract every piece of text and data visible in the screenshot.
    `
    
    try {
      const result = await model.generateContent([
        {
          inlineData: {
            mimeType: 'image/png',
            data: screenshots.mainPage.toString('base64')
          }
        },
        { text: mainPagePrompt }
      ])
      
      const response = await result.response
      const text = response.text()
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0])
        
        // Log a summary of what was extracted
        console.log('📊 Extracted data summary:', {
          title: data.title ? '✓' : '✗',
          price: data.price?.base || data.price?.totalPrice ? '✓' : '✗',
          rating: data.rating?.overall ? '✓' : '✗',
          reviews: data.rating?.reviewCount ? '✓' : '✗',
          host: data.host?.name ? '✓' : '✗',
          location: data.location?.city ? '✓' : '✗',
          spaces: data.spaces?.guests ? '✓' : '✗',
          amenitiesCount: data.amenities?.highlighted?.length || 0,
          descriptionLength: data.description?.preview?.length || 0
        })
        
        extractedSections.push({
          data,
          confidence: 0.9,
          source: 'mainPage'
        })
        console.log('✅ Extracted main page data')
      }
    } catch (error) {
      console.error('Failed to extract from main page:', error)
    }
  }
  
  // Extract from reviews modal
  if (screenshots.reviewsModal && screenshots.reviewsModal.length > 0) {
    console.log('🔍 Extracting from reviews modal...')
    
    const reviewsPrompt = `
    Analyze this Airbnb reviews modal screenshot and extract:
    
    {
      "ratings": {
        "cleanliness": number (X.X),
        "accuracy": number,
        "checkIn": number,
        "communication": number,
        "location": number,
        "value": number
      },
      "reviews": [
        {
          "author": "reviewer name",
          "date": "review date",
          "text": "review text (full)",
          "hostResponse": "response if any"
        }
      ],
      "highlights": ["most mentioned positive aspects"]
    }
    
    Extract ALL visible reviews and exact rating scores.
    `
    
    try {
      const result = await model.generateContent([
        {
          inlineData: {
            mimeType: 'image/png',
            data: screenshots.reviewsModal.toString('base64')
          }
        },
        { text: reviewsPrompt }
      ])
      
      const response = await result.response
      const text = response.text()
      
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0])
        extractedSections.push({
          data,
          confidence: 0.85,
          source: 'reviewsModal'
        })
        console.log('✅ Extracted reviews data')
      }
    } catch (error) {
      console.error('Failed to extract from reviews:', error)
    }
  }
  
  // Extract from amenities modal
  if (screenshots.amenitiesModal && screenshots.amenitiesModal.length > 0) {
    console.log('🔍 Extracting from amenities modal...')
    
    const amenitiesPrompt = `
    Analyze this amenities modal and list ALL amenities shown, categorized:
    
    {
      "essentials": ["list all basic amenities"],
      "kitchen": ["all kitchen items"],
      "bathroom": ["bathroom amenities"],
      "bedroom": ["bedroom items"],
      "entertainment": ["TV, games, etc"],
      "heating_cooling": ["AC, heating, etc"],
      "outdoor": ["patio, pool, etc"],
      "parking": ["parking options"],
      "safety": ["smoke alarm, etc"],
      "notIncluded": ["crossed out or not included items"]
    }
    
    Be comprehensive - list EVERY amenity visible.
    `
    
    try {
      const result = await model.generateContent([
        {
          inlineData: {
            mimeType: 'image/png',
            data: screenshots.amenitiesModal.toString('base64')
          }
        },
        { text: amenitiesPrompt }
      ])
      
      const response = await result.response
      const text = response.text()
      
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0])
        extractedSections.push({
          data,
          confidence: 0.9,
          source: 'amenitiesModal'
        })
        console.log('✅ Extracted amenities data')
      }
    } catch (error) {
      console.error('Failed to extract amenities:', error)
    }
  }
  
  return extractedSections
}

function structureListingData(sections: ExtractedSection[], url: string): ComprehensiveAirbnbListing {
  // Merge all extracted sections into comprehensive listing
  const mainData = sections.find(s => s.source === 'mainPage')?.data || {}
  const reviewsData = sections.find(s => s.source === 'reviewsModal')?.data || {}
  const amenitiesData = sections.find(s => s.source === 'amenitiesModal')?.data || {}
  
  // Calculate data completeness based on extracted fields
  const fieldsExtracted = countExtractedFields({ mainData, reviewsData, amenitiesData })
  const dataCompleteness = Math.min(100, Math.round((fieldsExtracted / 30) * 100))
  
  return {
    id: extractListingId(url),
    url,
    title: mainData.title || 'Airbnb Listing',
    subtitle: mainData.subtitle,
    description: mainData.description?.preview || mainData.description || 'See listing for details',
    propertyType: mainData.propertyType || 'Entire place',
    
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
      isSuperhost: mainData.host?.isSuperhost || false,
      responseRate: mainData.host?.responseRate,
      responseTime: mainData.host?.responseTime,
      languages: mainData.host?.languages
    },
    
    pricing: {
      basePrice: mainData.price?.base || mainData.price?.totalPrice || 0,
      currency: mainData.price?.currency || 'USD',
      cleaningFee: mainData.price?.cleaningFee,
      serviceFee: mainData.price?.serviceFee
    },
    
    location: {
      city: mainData.location?.city || 'Unknown',
      state: mainData.location?.state,
      country: mainData.location?.country || 'Unknown',
      neighborhood: mainData.location?.neighborhood
    },
    
    photos: mainData.photos?.totalCount ? 
      Array(parseInt(mainData.photos.totalCount.match(/\d+/)?.[0] || '0')).fill({ url: '', caption: '' }) : 
      [],
    
    amenities: {
      basic: [
        ...(mainData.amenities?.highlighted || []),
        ...(mainData.amenities?.icons || []),
        ...(amenitiesData.essentials || []),
        ...(amenitiesData.kitchen || []),
        ...(amenitiesData.bathroom || []),
        ...(amenitiesData.bedroom || []),
        ...(amenitiesData.entertainment || []),
        ...(amenitiesData.outdoor || []),
        ...(amenitiesData.safety || [])
      ].filter(Boolean)
    },
    
    reviews: {
      summary: {
        rating: mainData.rating?.overall || reviewsData.ratings?.overall || 0,
        totalCount: mainData.rating?.reviewCount || 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        categories: {
          cleanliness: mainData.reviews?.categories?.cleanliness || reviewsData.ratings?.cleanliness || 0,
          accuracy: mainData.reviews?.categories?.accuracy || reviewsData.ratings?.accuracy || 0,
          communication: mainData.reviews?.categories?.communication || reviewsData.ratings?.communication || 0,
          location: mainData.reviews?.categories?.location || reviewsData.ratings?.location || 0,
          checkIn: mainData.reviews?.categories?.checkIn || reviewsData.ratings?.checkIn || 0,
          value: mainData.reviews?.categories?.value || reviewsData.ratings?.value || 0
        }
      },
      recentReviews: mainData.reviews?.highlights?.map((text: string) => ({
        text,
        author: 'Guest',
        date: 'Recent'
      })) || reviewsData.reviews || []
    },
    
    houseRules: {
      checkIn: {},
      checkOut: {},
      during: {}
    },
    
    bookingSettings: {},
    
    cancellationPolicy: {
      type: 'Standard'
    },
    
    meta: {
      scrapedAt: new Date().toISOString(),
      scrapeVersion: 'vision-v1',
      dataCompleteness
    }
  }
}

function extractListingId(url: string): string {
  const match = url.match(/rooms\/(\d+)/)
  return match ? match[1] : ''
}

function countExtractedFields(data: any): number {
  let count = 0
  
  const checkField = (obj: any, path: string) => {
    const keys = path.split('.')
    let current = obj
    
    for (const key of keys) {
      if (current && current[key] !== undefined && current[key] !== null) {
        current = current[key]
      } else {
        return false
      }
    }
    
    // Check if the value is meaningful (not empty string, not 0 for non-numeric fields)
    if (typeof current === 'string' && current.trim() === '') return false
    if (Array.isArray(current) && current.length === 0) return false
    
    return true
  }
  
  // Check main fields
  if (checkField(data, 'mainData.title')) count++
  if (checkField(data, 'mainData.subtitle')) count++
  if (checkField(data, 'mainData.propertyType')) count++
  if (checkField(data, 'mainData.price.base') || checkField(data, 'mainData.price.totalPrice')) count++
  if (checkField(data, 'mainData.price.cleaningFee')) count++
  if (checkField(data, 'mainData.price.serviceFee')) count++
  if (checkField(data, 'mainData.rating.overall')) count++
  if (checkField(data, 'mainData.rating.reviewCount')) count++
  if (checkField(data, 'mainData.host.name')) count++
  if (checkField(data, 'mainData.host.isSuperhost')) count++
  if (checkField(data, 'mainData.location.city')) count++
  if (checkField(data, 'mainData.location.state')) count++
  if (checkField(data, 'mainData.location.country')) count++
  if (checkField(data, 'mainData.location.neighborhood')) count++
  if (checkField(data, 'mainData.spaces.guests')) count++
  if (checkField(data, 'mainData.spaces.bedrooms')) count++
  if (checkField(data, 'mainData.spaces.beds')) count++
  if (checkField(data, 'mainData.spaces.bathrooms')) count++
  if (checkField(data, 'mainData.description')) count++
  if (checkField(data, 'mainData.photos.totalCount')) count++
  
  // Check amenities
  if (checkField(data, 'mainData.amenities.highlighted')) {
    count += Math.min(5, data.mainData.amenities.highlighted.length)
  }
  if (checkField(data, 'mainData.amenities.icons')) {
    count += Math.min(5, data.mainData.amenities.icons.length)
  }
  
  // Check review categories
  if (checkField(data, 'mainData.reviews.categories.cleanliness')) count++
  if (checkField(data, 'mainData.reviews.categories.accuracy')) count++
  if (checkField(data, 'mainData.reviews.categories.checkIn')) count++
  if (checkField(data, 'mainData.reviews.categories.communication')) count++
  if (checkField(data, 'mainData.reviews.categories.location')) count++
  if (checkField(data, 'mainData.reviews.categories.value')) count++
  
  // Check review highlights
  if (checkField(data, 'mainData.reviews.highlights')) {
    count += Math.min(3, data.mainData.reviews.highlights.length)
  }
  
  // Check booking info
  if (checkField(data, 'mainData.bookingInfo.instantBook')) count++
  if (checkField(data, 'mainData.bookingInfo.rareFind')) count++
  
  return count
}

// Re-analyze existing screenshots
export async function reanalyzeScreenshots(listingId: string): Promise<ComprehensiveAirbnbListing | null> {
  const dir = path.join(SCREENSHOT_DIR, listingId)
  
  try {
    // Load metadata
    const metadataPath = path.join(dir, 'metadata.json')
    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'))
    
    // Find most recent screenshots
    const files = await fs.readdir(dir)
    const screenshots: ScreenshotSet = {
      mainPage: Buffer.alloc(0),
      timestamp: new Date(metadata.timestamp),
      listingId
    }
    
    for (const file of files) {
      if (file.startsWith('main-')) {
        screenshots.mainPage = await fs.readFile(path.join(dir, file))
      } else if (file.startsWith('reviews-')) {
        screenshots.reviewsModal = await fs.readFile(path.join(dir, file))
      } else if (file.startsWith('amenities-')) {
        screenshots.amenitiesModal = await fs.readFile(path.join(dir, file))
      } else if (file.startsWith('description-')) {
        screenshots.descriptionExpanded = await fs.readFile(path.join(dir, file))
      }
    }
    
    // Re-analyze with Vision AI
    console.log(`🔄 Re-analyzing screenshots for ${listingId}`)
    const extractedData = await extractDataFromScreenshots(screenshots)
    
    // Reconstruct listing URL (approximate)
    const url = `https://www.airbnb.com/rooms/${listingId}`
    
    return structureListingData(extractedData, url)
    
  } catch (error) {
    console.error(`Could not re-analyze ${listingId}:`, error)
    return null
  }
}