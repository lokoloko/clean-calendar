// Browserless.io HTTP /scrape API implementation for fast, comprehensive extraction
import { ComprehensiveAirbnbListing, AirbnbListingData } from './types/listing'

const SCRAPE_ENDPOINT = 'https://production-sfo.browserless.io/scrape'

interface ScrapeElement {
  selector: string
  timeout?: number
}

interface ScrapeOptions {
  url: string
  elements: ScrapeElement[]
  waitForTimeout?: number
  waitForSelector?: {
    selector: string
    timeout?: number
  }
  waitForFunction?: string
  gotoOptions?: {
    timeout?: number
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2'
  }
}

interface ElementResult {
  selector: string
  results: Array<{
    attributes: Record<string, string>
    text: string
    html: string
    width: number
    height: number
    top: number
    left: number
  }>
}

export async function scrapeAirbnbWithHttpApi(url: string): Promise<ComprehensiveAirbnbListing> {
  const apiKey = process.env.BROWSERLESS_API_KEY
  
  if (!apiKey) {
    throw new Error('Browserless API key not configured')
  }

  console.log('Starting HTTP /scrape API extraction:', url)

  // Define comprehensive selectors for all data points
  const scrapeOptions: ScrapeOptions = {
    url,
    elements: [
      // Title and subtitle
      { selector: 'h1', timeout: 5000 },
      { selector: 'h2' },
      
      // Price selectors - multiple strategies
      { selector: 'span._tyxjp1' },
      { selector: 'span._1y74zjx' },
      { selector: 'div._1jo4hgw' },
      { selector: 'span[aria-label*="price"]' },
      { selector: 'div[aria-label*="price"]' },
      { selector: '[data-testid="price"] span' },
      { selector: 'span:has-text("$"):has-text("night")' },
      
      // Rating and reviews
      { selector: '[aria-label*="rating"]' },
      { selector: 'button[aria-label*="review"]' },
      { selector: 'span._17p6nbba' },
      { selector: '[data-testid="reviews-summary"]' },
      { selector: 'div._1s11ltsf' },
      
      // Host information
      { selector: '[data-testid="host-profile"]' },
      { selector: 'div:has-text("Hosted by")' },
      { selector: 'div._1ez5s2o' },
      { selector: '[data-testid="superhost-badge"]' },
      
      // Property details
      { selector: 'div:has-text("guests"):has-text("bedroom")' },
      { selector: 'ol li span' }, // Often contains guest/bed info
      
      // Amenities buttons (for modal triggers)
      { selector: 'button:has-text("Show all"):has-text("amenities")' },
      { selector: 'button[aria-label*="amenities"]' },
      
      // Reviews button (for modal trigger)
      { selector: 'button:has-text("Show all"):has-text("reviews")' },
      
      // Description section
      { selector: '[data-section-id="DESCRIPTION"]' },
      { selector: 'div[data-plugin-in-point-id="DESCRIPTION"]' },
      
      // Amenities on page
      { selector: '[id*="amenity"]' },
      { selector: 'div[data-section-id="AMENITIES"] button' },
      
      // Reviews on page
      { selector: '[data-testid*="review"]' },
      { selector: '[aria-label*="review"]' },
      { selector: 'div[data-review-id]' },
      
      // Photos
      { selector: 'img[data-original-uri]' },
      { selector: 'img[src*="airbnb"]' },
      { selector: 'picture img' },
      
      // House rules
      { selector: 'div:has-text("Check-in")' },
      { selector: 'div:has-text("Checkout")' },
      { selector: 'div:has-text("House rules")' },
      
      // Location
      { selector: '[data-section-id="LOCATION"]' },
      { selector: 'div:has-text("Where you"):has-text("be")' },
      
      // Review categories
      { selector: 'div:has-text("Cleanliness"):has(span)' },
      { selector: 'div:has-text("Accuracy"):has(span)' },
      { selector: 'div:has-text("Communication"):has(span)' },
      { selector: 'div:has-text("Location"):has(span)' },
      { selector: 'div:has-text("Check-in"):has(span)' },
      { selector: 'div:has-text("Value"):has(span)' }
    ],
    waitForSelector: { selector: 'h1', timeout: 10000 }, // Wait for title to ensure page loaded
    waitForTimeout: 3000, // Additional wait for dynamic content
    gotoOptions: {
      timeout: 30000,
      waitUntil: 'networkidle2'
    }
  }

  try {
    const response = await fetch(`${SCRAPE_ENDPOINT}?token=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(scrapeOptions)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('HTTP API error:', response.status, errorText)
      throw new Error(`HTTP API failed: ${response.status}`)
    }

    const result = await response.json()
    console.log('HTTP API response received, parsing data...')

    return parseHttpApiResponse(url, result)
  } catch (error) {
    console.error('HTTP API scraping error:', error)
    throw error
  }
}

function parseHttpApiResponse(url: string, data: any): ComprehensiveAirbnbListing {
  const elements = data.data || []
  
  // Create a map of selector to results for easy access
  const elementMap: Record<string, any[]> = {}
  elements.forEach((element: ElementResult) => {
    elementMap[element.selector] = element.results || []
  })

  // Extract title
  const title = elementMap['h1']?.[0]?.text || 'Airbnb Listing'
  const subtitle = elementMap['h2']?.[0]?.text

  // Extract price from multiple possible selectors
  let price: number | null = null
  const priceSelectors = [
    'span._tyxjp1',
    'span._1y74zjx', 
    'div._1jo4hgw',
    'span[aria-label*="price"]',
    'div[aria-label*="price"]',
    '[data-testid="price"] span',
    'span:has-text("$"):has-text("night")'
  ]
  
  for (const selector of priceSelectors) {
    const priceElements = elementMap[selector]
    if (priceElements && priceElements.length > 0) {
      for (const elem of priceElements) {
        const text = elem.text || ''
        const match = text.match(/\$(\d+(?:,\d{3})*)/)
        if (match) {
          price = parseInt(match[1].replace(/,/g, ''))
          break
        }
      }
      if (price) break
    }
  }

  // Extract rating and review count
  let rating: number | null = null
  let reviewCount: number | null = null
  
  const ratingSelectors = [
    '[aria-label*="rating"]',
    'button[aria-label*="review"]',
    'span._17p6nbba',
    '[data-testid="reviews-summary"]',
    'div._1s11ltsf'
  ]

  for (const selector of ratingSelectors) {
    const ratingElements = elementMap[selector]
    if (ratingElements && ratingElements.length > 0) {
      for (const elem of ratingElements) {
        const text = elem.text || ''
        const ariaLabel = elem.attributes?.['aria-label'] || ''
        const fullText = `${text} ${ariaLabel}`
        
        if (!rating) {
          const ratingMatch = fullText.match(/(\d+\.?\d*)\s*(star|rating)/i)
          if (ratingMatch) rating = parseFloat(ratingMatch[1])
        }
        
        if (!reviewCount) {
          const reviewMatch = fullText.match(/(\d+)\s*review/i)
          if (reviewMatch) reviewCount = parseInt(reviewMatch[1])
        }
      }
    }
  }

  // Extract host information
  let hostName = 'Host'
  let isSuperhost = false
  
  const hostElements = elementMap['div:has-text("Hosted by")'] || elementMap['[data-testid="host-profile"]']
  if (hostElements && hostElements.length > 0) {
    const hostText = hostElements[0].text
    const nameMatch = hostText.match(/Hosted by\s+([A-Za-z\s]+?)(?:\.|,|$|\n|Superhost)/i)
    if (nameMatch) hostName = nameMatch[1].trim()
    if (hostText.includes('Superhost')) isSuperhost = true
  }

  if (elementMap['[data-testid="superhost-badge"]']?.length > 0) {
    isSuperhost = true
  }

  // Extract property details
  let guests = 4, bedrooms = 1, beds = 1, bathrooms = 1
  const propertyElements = elementMap['div:has-text("guests"):has-text("bedroom")'] || elementMap['ol li span']
  if (propertyElements && propertyElements.length > 0) {
    const propertyText = propertyElements[0].text
    const guestMatch = propertyText.match(/(\d+)\s*guest/i)
    const bedroomMatch = propertyText.match(/(\d+)\s*bedroom/i)
    const bedMatch = propertyText.match(/(\d+)\s*bed(?!room)/i)
    const bathMatch = propertyText.match(/(\d+)\s*bath/i)
    
    if (guestMatch) guests = parseInt(guestMatch[1])
    if (bedroomMatch) bedrooms = parseInt(bedroomMatch[1])
    if (bedMatch) beds = parseInt(bedMatch[1])
    if (bathMatch) bathrooms = parseInt(bathMatch[1])
  }

  // Extract amenities
  const amenities: string[] = []
  const amenitySelectors = ['[id*="amenity"]', 'div[data-section-id="AMENITIES"] button']
  
  for (const selector of amenitySelectors) {
    const amenityElements = elementMap[selector]
    if (amenityElements) {
      amenityElements.forEach((elem: any) => {
        const text = elem.text?.trim()
        if (text && text.length > 2 && text.length < 100 && !text.includes('Show all')) {
          amenities.push(text)
        }
      })
    }
  }

  // Extract reviews
  const reviews: any[] = []
  const reviewSelectors = ['[data-testid*="review"]', '[aria-label*="review"]', 'div[data-review-id]']
  
  for (const selector of reviewSelectors) {
    const reviewElements = elementMap[selector]
    if (reviewElements) {
      reviewElements.forEach((elem: any) => {
        const html = elem.html || ''
        const text = elem.text || ''
        
        // Try to extract author from HTML structure
        const authorMatch = html.match(/<h3[^>]*>([^<]+)<\/h3>/i)
        const author = authorMatch ? authorMatch[1] : 'Guest'
        
        // Extract date
        const dateMatch = text.match(/(\w+\s+\d{4}|\d+\s+(day|week|month|year)s?\s+ago)/i)
        const date = dateMatch ? dateMatch[0] : ''
        
        // Extract review text (remove author and date from full text)
        let reviewText = text
          .replace(author, '')
          .replace(date, '')
          .trim()
        
        if (reviewText.length > 50) {
          reviews.push({
            author,
            date,
            text: reviewText.substring(0, 500)
          })
        }
      })
    }
  }

  // Extract photos
  const photos: any[] = []
  const photoSelectors = ['img[data-original-uri]', 'img[src*="airbnb"]', 'picture img']
  
  for (const selector of photoSelectors) {
    const photoElements = elementMap[selector]
    if (photoElements) {
      photoElements.forEach((elem: any) => {
        const src = elem.attributes?.src || elem.attributes?.['data-original-uri']
        const alt = elem.attributes?.alt || ''
        if (src && !src.includes('profile') && !src.includes('user')) {
          photos.push({ url: src, alt })
        }
      })
    }
  }

  // Extract house rules
  let checkIn = '', checkOut = ''
  let noSmoking = false, noPets = false, noParties = false
  
  const checkInElements = elementMap['div:has-text("Check-in")']
  if (checkInElements && checkInElements.length > 0) {
    const text = checkInElements[0].text
    const timeMatch = text.match(/(\d{1,2}:\d{2}\s*[AP]M|\d{1,2}\s*[AP]M)/i)
    if (timeMatch) checkIn = timeMatch[1]
  }
  
  const checkOutElements = elementMap['div:has-text("Checkout")']
  if (checkOutElements && checkOutElements.length > 0) {
    const text = checkOutElements[0].text
    const timeMatch = text.match(/(\d{1,2}:\d{2}\s*[AP]M|\d{1,2}\s*[AP]M)/i)
    if (timeMatch) checkOut = timeMatch[1]
  }
  
  const rulesElements = elementMap['div:has-text("House rules")']
  if (rulesElements && rulesElements.length > 0) {
    const rulesText = rulesElements[0].text
    if (rulesText.includes('No smoking')) noSmoking = true
    if (rulesText.includes('No pets')) noPets = true
    if (rulesText.includes('No parties')) noParties = true
  }

  // Extract description
  let description = ''
  const descElements = elementMap['[data-section-id="DESCRIPTION"]'] || elementMap['div[data-plugin-in-point-id="DESCRIPTION"]']
  if (descElements && descElements.length > 0) {
    description = descElements[0].text || ''
  }

  // Extract review categories
  const reviewCategories: Record<string, number> = {}
  const categories = ['Cleanliness', 'Accuracy', 'Communication', 'Location', 'Check-in', 'Value']
  
  categories.forEach(category => {
    const selector = `div:has-text("${category}"):has(span)`
    const categoryElements = elementMap[selector]
    if (categoryElements && categoryElements.length > 0) {
      const text = categoryElements[0].text
      const match = text.match(/(\d+\.?\d*)/)
      if (match) {
        reviewCategories[category.toLowerCase().replace('-', '')] = parseFloat(match[1])
      }
    }
  })

  console.log('HTTP API extraction complete:', {
    title,
    price,
    rating,
    reviewCount,
    amenitiesCount: amenities.length,
    reviewsCount: reviews.length,
    photosCount: photos.length
  })

  // Build comprehensive listing object
  const listing: ComprehensiveAirbnbListing = {
    id: extractListingId(url),
    url,
    title,
    subtitle,
    description,
    propertyType: 'Entire place',
    
    guestCapacity: {
      adults: guests,
      children: 0,
      infants: 0,
      total: guests
    },
    
    spaces: {
      bedrooms,
      beds,
      bathrooms
    },
    
    host: {
      name: hostName,
      isSuperhost
    },
    
    pricing: {
      basePrice: price || 150,
      currency: 'USD'
    },
    
    location: {
      city: 'Unknown',
      country: 'USA'
    },
    
    photos: photos.slice(0, 100),
    
    amenities: {
      basic: [...new Set(amenities)]
    },
    
    reviews: {
      summary: {
        rating: rating || 4.5,
        totalCount: reviewCount || 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        categories: Object.keys(reviewCategories).length > 0 ? reviewCategories as any : {
        cleanliness: 0,
        accuracy: 0,
        communication: 0,
        location: 0,
        checkIn: 0,
        value: 0
      }
      },
      recentReviews: reviews.slice(0, 50)
    },
    
    houseRules: {
      checkIn: {
        time: checkIn
      },
      checkOut: {
        time: checkOut
      },
      during: {
        smoking: !noSmoking,
        pets: !noPets,
        parties: !noParties
      }
    },
    
    bookingSettings: {},
    
    cancellationPolicy: {
      type: 'Standard'
    },
    
    meta: {
      scrapedAt: new Date().toISOString(),
      scrapeVersion: '4.0-http-api',
      dataCompleteness: calculateCompleteness({
        title,
        price,
        rating,
        reviewCount,
        amenities,
        reviews,
        photos,
        hostName,
        description,
        reviewCategories
      })
    }
  }
  
  return listing
}

function extractListingId(url: string): string {
  const match = url.match(/rooms\/(\d+)/)
  return match ? match[1] : ''
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
    data.hostName && data.hostName !== 'Host',
    data.description
  ]
  
  fields.forEach(field => {
    if (field) score += 10
  })
  
  return score
}

// Convert to simplified format for backward compatibility
export function httpApiToSimplified(comprehensive: ComprehensiveAirbnbListing): AirbnbListingData {
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
    
    subtitle: comprehensive.subtitle,
    checkIn: comprehensive.houseRules.checkIn.time,
    checkOut: comprehensive.houseRules.checkOut.time,
    reviewCategories: comprehensive.reviews.summary.categories,
    recentReviews: comprehensive.reviews.recentReviews?.slice(0, 10),
    houseRules: {
      smoking: comprehensive.houseRules.during.smoking || false,
      pets: comprehensive.houseRules.during.pets || false,
      parties: comprehensive.houseRules.during.parties || false
    },
    lastScraped: comprehensive.meta.scrapedAt,
    dataQuality: comprehensive.meta.dataCompleteness
  }
}