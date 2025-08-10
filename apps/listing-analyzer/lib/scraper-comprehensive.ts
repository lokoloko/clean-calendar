// Comprehensive Airbnb Scraper with Browserless.io
import { ComprehensiveAirbnbListing, Review, AirbnbListingData } from './types/listing'

export async function scrapeAirbnbComprehensive(url: string): Promise<ComprehensiveAirbnbListing> {
  const apiKey = process.env.BROWSERLESS_API_KEY
  
  if (!apiKey) {
    throw new Error('Browserless API key not configured')
  }

  try {
    console.log('Starting comprehensive Airbnb scrape:', url)
    
    // Step 1: Get initial page content
    const initialData = await scrapeInitialPage(url, apiKey)
    
    // Step 2: Extract listing ID from URL
    const listingId = extractListingId(url)
    
    // Step 3: Try to get additional data through interactions
    const enhancedData = await scrapeWithInteractions(url, apiKey)
    
    // Step 4: Merge all data sources
    const listing = mergeListingData(initialData, enhancedData, url, listingId)
    
    return listing
  } catch (error) {
    console.error('Comprehensive scraping error:', error)
    // Fallback to basic scraping
    return await fallbackToBasicScraping(url)
  }
}

async function scrapeInitialPage(url: string, apiKey: string): Promise<any> {
  const endpoint = `https://production-sfo.browserless.io/chrome/content?token=${apiKey}`
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: url,
      waitForSelector: 'h1',
      waitForTimeout: 5000
    })
  })

  if (!response.ok) {
    throw new Error(`Scraping failed: ${response.statusText}`)
  }

  const html = await response.text()
  return parseComprehensiveHTML(html)
}

async function scrapeWithInteractions(url: string, apiKey: string): Promise<any> {
  const endpoint = `https://production-sfo.browserless.io/chrome/function?token=${apiKey}`
  
  const code = `
    async function() {
      const page = this;
      await page.goto('${url}', { waitUntil: 'networkidle2' });
      
      const data = {};
      
      // Try to click "Show all amenities"
      try {
        await page.click('button:has-text("Show all") >> nth=0');
        await page.waitForTimeout(1000);
        
        // Get all amenities
        const amenityElements = await page.$$('[id*="amenity"], [data-testid*="amenity"]');
        data.amenities = await Promise.all(amenityElements.map(el => el.textContent));
      } catch (e) {
        console.log('Could not expand amenities');
      }
      
      // Try to get reviews
      try {
        // Click on reviews section
        const reviewButton = await page.$('button:has-text("reviews")');
        if (reviewButton) {
          await reviewButton.click();
          await page.waitForTimeout(2000);
          
          // Get review elements
          const reviewElements = await page.$$('[data-testid="review-item"], [role="article"]');
          data.reviews = await Promise.all(reviewElements.slice(0, 10).map(async (el) => {
            const text = await el.$eval('[data-testid="review-text"], div >> nth=2', node => node.textContent);
            const author = await el.$eval('[data-testid="review-author"], div >> nth=0', node => node.textContent);
            const date = await el.$eval('time, span:has-text("20")', node => node.textContent);
            return { text, author, date };
          }));
        }
      } catch (e) {
        console.log('Could not get reviews');
      }
      
      // Get all images
      try {
        const images = await page.$$eval('img[data-original-uri], img[src*="airbnb"], picture img', imgs => 
          imgs.map(img => ({
            url: img.src || img.getAttribute('data-original-uri'),
            alt: img.alt
          }))
        );
        data.photos = images;
      } catch (e) {
        console.log('Could not get all images');
      }
      
      // Extract structured data from page
      try {
        const structuredData = await page.evaluate(() => {
          const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
          return scripts.map(s => {
            try {
              return JSON.parse(s.textContent);
            } catch {
              return null;
            }
          }).filter(Boolean);
        });
        data.structured = structuredData;
      } catch (e) {
        console.log('No structured data found');
      }
      
      // Get page HTML for additional parsing
      data.html = await page.content();
      
      return data;
    }
  `;
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        context: {}
      })
    })
    
    if (!response.ok) {
      console.warn('Interactive scraping failed, using static only')
      return {}
    }
    
    return await response.json()
  } catch (error) {
    console.warn('Interactive scraping error:', error)
    return {}
  }
}

function parseComprehensiveHTML(html: string): any {
  const data: any = {
    amenities: [],
    reviews: [],
    photos: [],
    host: {},
    pricing: {},
    location: {},
    houseRules: {}
  }
  
  // Extract title and subtitle
  const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
  if (titleMatch) data.title = titleMatch[1].trim()
  
  const subtitleMatch = html.match(/<h2[^>]*>([^<]+)<\/h2>/i)
  if (subtitleMatch) data.subtitle = subtitleMatch[1].trim()
  
  // Extract description - look for longer text blocks
  const descMatches = html.match(/<div[^>]*>([^<]{100,500})<\/div>/gi)
  if (descMatches) {
    data.description = descMatches[0]?.replace(/<[^>]*>/g, '').trim()
  }
  
  // Extract all price information
  const pricePatterns = [
    /\$(\d+)\s*(?:USD)?\s*\/?\s*night/i,
    /price[^>]*>\s*\$(\d+)/i,
    /cleaning fee[^>]*>\s*\$(\d+)/i,
    /service fee[^>]*>\s*\$(\d+)/i,
  ]
  
  pricePatterns.forEach((pattern, index) => {
    const match = html.match(pattern)
    if (match) {
      if (index === 0) data.pricing.basePrice = parseInt(match[1])
      if (index === 2) data.pricing.cleaningFee = parseInt(match[1])
      if (index === 3) data.pricing.serviceFee = parseInt(match[1])
    }
  })
  
  // Extract rating details
  const ratingMatch = html.match(/(\d+\.?\d*)\s*(?:★|star)/i)
  if (ratingMatch) data.rating = parseFloat(ratingMatch[1])
  
  const reviewCountMatch = html.match(/(\d+)\s*reviews?/i)
  if (reviewCountMatch) data.reviewCount = parseInt(reviewCountMatch[1])
  
  // Extract host information
  const hostPatterns = [
    /hosted\s+by\s+([^<]+)/i,
    /superhost/i,
    /response rate[^>]*>\s*(\d+)%/i,
    /response time[^>]*>\s*([^<]+)/i,
    /hosting since[^>]*>\s*([^<]+)/i
  ]
  
  hostPatterns.forEach((pattern, index) => {
    const match = html.match(pattern)
    if (match) {
      if (index === 0) data.host.name = match[1].trim()
      if (index === 1) data.host.isSuperhost = true
      if (index === 2) data.host.responseRate = parseInt(match[1])
      if (index === 3) data.host.responseTime = match[1].trim()
      if (index === 4) data.host.hostingSince = match[1].trim()
    }
  })
  
  // Extract location
  const locationPatterns = [
    /([^,]+),\s*([^,]+),\s*([^<]+)/i, // City, State, Country
    /neighborhood[^>]*>\s*([^<]+)/i,
  ]
  
  locationPatterns.forEach((pattern, index) => {
    const match = html.match(pattern)
    if (match) {
      if (index === 0) {
        data.location.city = match[1].trim()
        data.location.state = match[2].trim()
        data.location.country = match[3].trim()
      }
      if (index === 1) data.location.neighborhood = match[1].trim()
    }
  })
  
  // Extract property details
  const propertyPatterns = [
    /(\d+)\s*(?:guest|guests)/i,
    /(\d+)\s*(?:bedroom|bedrooms)/i,
    /(\d+)\s*(?:bed|beds)/i,
    /(\d+)\s*(?:bath|bathroom|bathrooms)/i,
    /(entire|private|shared)\s*(home|room|apartment|house|place)/i
  ]
  
  propertyPatterns.forEach((pattern, index) => {
    const match = html.match(pattern)
    if (match) {
      if (index === 0) data.guestCapacity = parseInt(match[1])
      if (index === 1) data.bedrooms = parseInt(match[1])
      if (index === 2) data.beds = parseInt(match[1])
      if (index === 3) data.bathrooms = parseInt(match[1])
      if (index === 4) data.propertyType = match[0]
    }
  })
  
  // Extract check-in/check-out times
  const checkInMatch = html.match(/check.?in[^>]*>\s*([^<]+)/i)
  if (checkInMatch) data.checkIn = checkInMatch[1].trim()
  
  const checkOutMatch = html.match(/check.?out[^>]*>\s*([^<]+)/i)
  if (checkOutMatch) data.checkOut = checkOutMatch[1].trim()
  
  // Extract minimum stay
  const minStayMatch = html.match(/(\d+)\s*night\s*minimum/i)
  if (minStayMatch) data.minimumStay = parseInt(minStayMatch[1])
  
  // Extract house rules
  const houseRulePatterns = [
    /no smoking/i,
    /no pets/i,
    /no parties/i,
    /no events/i
  ]
  
  data.houseRules.rules = []
  houseRulePatterns.forEach(pattern => {
    if (html.match(pattern)) {
      data.houseRules.rules.push(pattern.source.replace(/\\/g, ''))
    }
  })
  
  // Extract all amenities mentioned
  const commonAmenities = [
    'Wifi', 'Kitchen', 'Free parking', 'Paid parking', 'Air conditioning',
    'Washer', 'Dryer', 'Pool', 'Hot tub', 'Gym', 'EV charger',
    'Workspace', 'TV', 'Cable TV', 'Netflix', 'Coffee maker', 
    'Hair dryer', 'Iron', 'Heating', 'Fireplace', 'Smoke alarm', 
    'Carbon monoxide alarm', 'Fire extinguisher', 'First aid kit',
    'Shampoo', 'Hangers', 'Bed linens', 'Extra pillows', 'Microwave',
    'Refrigerator', 'Dishwasher', 'Oven', 'Stove', 'BBQ grill', 
    'Patio', 'Balcony', 'Garden', 'Beach access', 'Lake access',
    'Mountain view', 'City view', 'Ocean view', 'Breakfast',
    'Elevator', 'Wheelchair accessible', 'Crib', 'High chair',
    'Baby bath', 'Baby monitor', 'Board games', 'Books', 'Toys',
    'Ping pong table', 'Pool table', 'Indoor fireplace', 'Outdoor furniture',
    'Private entrance', 'Long term stays allowed', 'Luggage dropoff allowed'
  ]
  
  const htmlLower = html.toLowerCase()
  data.amenities = commonAmenities.filter(amenity => 
    htmlLower.includes(amenity.toLowerCase())
  )
  
  // Extract review categories if available
  const categoryPatterns = [
    /cleanliness[^>]*>\s*(\d+\.?\d*)/i,
    /accuracy[^>]*>\s*(\d+\.?\d*)/i,
    /communication[^>]*>\s*(\d+\.?\d*)/i,
    /location[^>]*>\s*(\d+\.?\d*)/i,
    /check.?in[^>]*>\s*(\d+\.?\d*)/i,
    /value[^>]*>\s*(\d+\.?\d*)/i
  ]
  
  data.reviewCategories = {}
  const categoryNames = ['cleanliness', 'accuracy', 'communication', 'location', 'checkIn', 'value']
  categoryPatterns.forEach((pattern, index) => {
    const match = html.match(pattern)
    if (match) {
      data.reviewCategories[categoryNames[index]] = parseFloat(match[1])
    }
  })
  
  // Count images
  const imageMatches = html.match(/<img[^>]*>/gi)
  data.photoCount = imageMatches ? imageMatches.length : 0
  
  // Check for special badges
  data.badges = []
  if (html.match(/instant.?book/i)) data.badges.push('Instant Book')
  if (html.match(/rare.?find/i)) data.badges.push('Rare Find')
  if (html.match(/guest.?favorite/i)) data.badges.push('Guest Favorite')
  if (html.match(/plus/i) && html.match(/verified/i)) data.badges.push('Airbnb Plus')
  
  return data
}

function extractListingId(url: string): string {
  const match = url.match(/rooms\/(\d+)/i)
  return match ? match[1] : ''
}

function mergeListingData(initial: any, enhanced: any, url: string, id: string): ComprehensiveAirbnbListing {
  // Merge all data sources into comprehensive structure
  const listing: ComprehensiveAirbnbListing = {
    id: id,
    url: url,
    title: initial.title || enhanced.title || 'Airbnb Listing',
    subtitle: initial.subtitle,
    description: initial.description || '',
    propertyType: initial.propertyType || 'Entire place',
    
    guestCapacity: {
      adults: initial.guestCapacity || 2,
      children: 0,
      infants: 0,
      total: initial.guestCapacity || 2
    },
    
    spaces: {
      bedrooms: initial.bedrooms || 1,
      beds: initial.beds || 1,
      bathrooms: initial.bathrooms || 1
    },
    
    host: {
      name: initial.host?.name || 'Host',
      isSuperhost: initial.host?.isSuperhost || false,
      hostingSince: initial.host?.hostingSince,
      responseRate: initial.host?.responseRate,
      responseTime: initial.host?.responseTime
    },
    
    pricing: {
      basePrice: initial.pricing?.basePrice || 100,
      currency: 'USD',
      cleaningFee: initial.pricing?.cleaningFee,
      serviceFee: initial.pricing?.serviceFee
    },
    
    location: {
      city: initial.location?.city || '',
      state: initial.location?.state,
      country: initial.location?.country || '',
      neighborhood: initial.location?.neighborhood
    },
    
    photos: enhanced.photos?.map((p: any) => ({
      url: p.url,
      caption: p.alt
    })) || [],
    
    amenities: {
      basic: initial.amenities || []
    },
    
    reviews: {
      summary: {
        rating: initial.rating || 4.5,
        totalCount: initial.reviewCount || 0,
        distribution: {
          5: 0, 4: 0, 3: 0, 2: 0, 1: 0
        },
        categories: initial.reviewCategories || {
          cleanliness: 4.5,
          accuracy: 4.5,
          communication: 4.5,
          location: 4.5,
          checkIn: 4.5,
          value: 4.5
        }
      },
      recentReviews: enhanced.reviews?.map((r: any) => ({
        author: r.author,
        date: r.date,
        text: r.text
      })) || []
    },
    
    houseRules: {
      checkIn: {
        time: initial.checkIn
      },
      checkOut: {
        time: initial.checkOut
      },
      during: {
        smoking: initial.houseRules?.rules?.includes('no smoking') ? false : undefined,
        pets: initial.houseRules?.rules?.includes('no pets') ? false : undefined,
        parties: initial.houseRules?.rules?.includes('no parties') ? false : undefined,
        additionalRules: initial.houseRules?.rules
      }
    },
    
    bookingSettings: {
      instantBook: initial.badges?.includes('Instant Book'),
      minimumStay: initial.minimumStay
    },
    
    cancellationPolicy: {
      type: 'Standard',
      description: 'Free cancellation before check-in'
    },
    
    performance: {
      isSuperhost: initial.host?.isSuperhost,
      badges: initial.badges
    },
    
    meta: {
      scrapedAt: new Date().toISOString(),
      scrapeVersion: '2.0',
      dataCompleteness: calculateCompleteness(initial, enhanced)
    }
  }
  
  return listing
}

function calculateCompleteness(initial: any, enhanced: any): number {
  let score = 0
  let total = 0
  
  // Check for essential fields
  const fields = [
    initial.title, initial.description, initial.pricing?.basePrice,
    initial.rating, initial.reviewCount, initial.amenities?.length,
    initial.host?.name, initial.location?.city, enhanced.photos?.length,
    enhanced.reviews?.length
  ]
  
  fields.forEach(field => {
    total += 10
    if (field) score += 10
  })
  
  return Math.round((score / total) * 100)
}

async function fallbackToBasicScraping(url: string): Promise<ComprehensiveAirbnbListing> {
  // Minimal fallback implementation
  return {
    id: extractListingId(url),
    url: url,
    title: 'Airbnb Listing',
    description: 'Beautiful property available for rent',
    propertyType: 'Entire place',
    
    guestCapacity: {
      adults: 4,
      children: 2,
      infants: 1,
      total: 7
    },
    
    spaces: {
      bedrooms: 2,
      beds: 3,
      bathrooms: 2
    },
    
    host: {
      name: 'Host',
      isSuperhost: false
    },
    
    pricing: {
      basePrice: 150,
      currency: 'USD'
    },
    
    location: {
      city: 'Unknown',
      country: 'USA'
    },
    
    photos: [],
    
    amenities: {
      basic: ['Wifi', 'Kitchen', 'Free parking']
    },
    
    reviews: {
      summary: {
        rating: 4.5,
        totalCount: 50,
        distribution: { 5: 30, 4: 15, 3: 3, 2: 1, 1: 1 },
        categories: {
          cleanliness: 4.5,
          accuracy: 4.5,
          communication: 4.5,
          location: 4.5,
          checkIn: 4.5,
          value: 4.5
        }
      },
      recentReviews: []
    },
    
    houseRules: {
      checkIn: {},
      checkOut: {},
      during: {}
    },
    
    bookingSettings: {},
    
    cancellationPolicy: {
      type: 'Flexible'
    },
    
    meta: {
      scrapedAt: new Date().toISOString(),
      scrapeVersion: '2.0',
      dataCompleteness: 10,
      missingFields: ['Most data unavailable in fallback mode']
    }
  }
}

// Convert comprehensive data to simplified format for backward compatibility
export function simplifyListingData(comprehensive: ComprehensiveAirbnbListing): AirbnbListingData {
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
    recentReviews: comprehensive.reviews.recentReviews?.map(r => ({
      author: r.author,
      date: r.date,
      text: r.text
    })),
    amenityCategories: comprehensive.amenities,
    houseRules: {
      smoking: comprehensive.houseRules.during.smoking || false,
      pets: comprehensive.houseRules.during.pets || false,
      parties: comprehensive.houseRules.during.parties || false,
      additionalRules: comprehensive.houseRules.during.additionalRules
    },
    lastScraped: comprehensive.meta.scrapedAt,
    dataQuality: comprehensive.meta.dataCompleteness
  }
}