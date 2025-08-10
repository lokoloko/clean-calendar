// Enhanced BrowserQL Scraper for Comprehensive Airbnb Data
import { ComprehensiveAirbnbListing, AirbnbListingData } from './types/listing'

const BROWSERQL_ENDPOINT = 'https://production-sfo.browserless.io/chrome/bql'

// BrowserQL mutation - using only confirmed working operations
const SCRAPE_AIRBNB_MUTATION = `
mutation ScrapeAirbnbListing($url: String!) {
  goto(url: $url, waitUntil: networkIdle) {
    status
    url
  }
  
  # Get basic information
  title: text(selector: "h1") {
    text
  }
  
  # Try querySelectorAll with innerHTML (shown in docs example)
  reviews: querySelectorAll(selector: "[data-testid='review-item'], [role='article']") {
    innerHTML
  }
  
  # Get all amenity items  
  amenities: querySelectorAll(selector: "[id*='amenity'], button[data-testid*='amenity']") {
    innerHTML
  }
  
  # Get photos - try with innerHTML
  photos: querySelectorAll(selector: "img[data-original-uri], img[src*='airbnb']") {
    innerHTML
  }
  
  # Get the full HTML as fallback for comprehensive parsing
  fullHtml: html {
    html
  }
}
`

export async function scrapeAirbnbWithBrowserQL(url: string): Promise<ComprehensiveAirbnbListing> {
  const apiKey = process.env.BROWSERLESS_API_KEY
  
  if (!apiKey) {
    throw new Error('Browserless API key not configured')
  }

  try {
    console.log('Starting BrowserQL scrape of:', url)
    
    const response = await fetch(`${BROWSERQL_ENDPOINT}?token=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: SCRAPE_AIRBNB_MUTATION,
        variables: { url }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('BrowserQL error:', response.status, errorText)
      throw new Error(`BrowserQL failed: ${response.status}`)
    }

    const result = await response.json()
    
    if (result.errors && result.errors.length > 0) {
      console.warn('BrowserQL had errors:', result.errors)
    }

    console.log('BrowserQL raw response:', JSON.stringify(result, null, 2))

    return parseBrowserQLResponse(url, result.data || {})
  } catch (error) {
    console.error('BrowserQL scraping error:', error)
    throw error
  }
}

function extractFromHTML(html: string, pattern: RegExp): string | null {
  const match = html.match(pattern)
  return match ? match[1].trim() : null
}

function parseBrowserQLResponse(url: string, data: any): ComprehensiveAirbnbListing {
  // Parse the HTML content
  const html = data.fullHtml?.html || ''
  const title = data.title?.text || extractFromHTML(html, /<h1[^>]*>([^<]+)<\/h1>/i) || 'Airbnb Listing'
  
  // Extract comprehensive data from HTML and BrowserQL fields
  const listing: ComprehensiveAirbnbListing = {
    id: extractListingId(url),
    url,
    title: title,
    subtitle: extractFromHTML(html, /<h2[^>]*>([^<]+)<\/h2>/i) || undefined,
    description: '',
    propertyType: 'Entire place',
    
    guestCapacity: {
      adults: 4,
      children: 2,
      infants: 1,
      total: 7
    },
    
    spaces: {
      bedrooms: 1,
      beds: 1,
      bathrooms: 1
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
    
    photos: parsePhotos(data.photos),
    
    amenities: parseAmenities(data.amenities),
    
    reviews: parseReviews(data),
    
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
      scrapeVersion: '3.0-browserql-enhanced',
      dataCompleteness: calculateDataCompleteness(data)
    }
  }
  
  // Parse everything from HTML
  if (html) {
    // Extract property details from HTML
    const guestMatch = html.match(/(\d+)\s*guest/i)
    const bedroomMatch = html.match(/(\d+)\s*bedroom/i)
    const bedMatch = html.match(/(\d+)\s*bed(?!room)/i)
    const bathMatch = html.match(/(\d+)\s*bath/i)
    
    if (guestMatch) listing.guestCapacity.total = parseInt(guestMatch[1])
    if (bedroomMatch) listing.spaces.bedrooms = parseInt(bedroomMatch[1])
    if (bedMatch) listing.spaces.beds = parseInt(bedMatch[1])
    if (bathMatch) listing.spaces.bathrooms = parseInt(bathMatch[1])
    
    // Extract rating and reviews
    const ratingMatch = html.match(/(\d+\.?\d*)\s*★/i) || html.match(/rating[^>]*>(\d+\.?\d*)/i)
    const reviewMatch = html.match(/(\d+)\s*review/i)
    
    if (ratingMatch) listing.reviews.summary.rating = parseFloat(ratingMatch[1])
    if (reviewMatch) listing.reviews.summary.totalCount = parseInt(reviewMatch[1])
    
    // Extract price
    const priceMatch = html.match(/\$(\d+)\s*(?:\/?\s*night)?/i)
    if (priceMatch) listing.pricing.basePrice = parseInt(priceMatch[1])
    
    // Extract host info
    const hostMatch = html.match(/Hosted\s+by\s+([A-Za-z]+)/i)
    if (hostMatch) listing.host.name = hostMatch[1]
    listing.host.isSuperhost = html.toLowerCase().includes('superhost')
    
    // Extract amenities
    const amenities: string[] = []
    const commonAmenities = ['Wifi', 'Kitchen', 'Free parking', 'Air conditioning', 'Washer', 'Dryer', 
                            'Pool', 'Hot tub', 'Gym', 'TV', 'Coffee maker', 'Hair dryer', 'Iron']
    commonAmenities.forEach(amenity => {
      if (html.toLowerCase().includes(amenity.toLowerCase())) {
        amenities.push(amenity)
      }
    })
    listing.amenities.basic = amenities
  }
  
  return listing
}

function extractListingId(url: string): string {
  const match = url.match(/rooms\/(\d+)/)
  return match ? match[1] : ''
}

function extractHostName(text?: string): string {
  if (!text) return 'Host'
  const match = text.match(/Hosted by\s+([A-Za-z]+)/i)
  return match ? match[1] : 'Host'
}

function extractPrice(text?: string): number {
  if (!text) return 150
  const match = text.match(/\$(\d+)/)
  return match ? parseInt(match[1]) : 150
}

function extractTime(text?: string): string | undefined {
  if (!text) return undefined
  const match = text.match(/(\d{1,2}:\d{2}\s*[AP]M|\d{1,2}\s*[AP]M)/i)
  return match ? match[1] : undefined
}

function parsePhotos(photoData: any): any[] {
  if (!photoData || !Array.isArray(photoData)) return []
  
  return photoData.map(item => {
    // Parse from innerHTML if available
    if (item.innerHTML) {
      const srcMatch = item.innerHTML.match(/src="([^"]+)"/)
      const altMatch = item.innerHTML.match(/alt="([^"]+)"/)
      const dataUriMatch = item.innerHTML.match(/data-original-uri="([^"]+)"/)
      
      return {
        url: srcMatch?.[1] || dataUriMatch?.[1] || '',
        caption: altMatch?.[1] || ''
      }
    }
    return { url: '', caption: '' }
  }).filter(p => p.url)
}

function parseAmenities(amenityData: any): any {
  const amenities: any = { basic: [] }
  
  if (!amenityData || !Array.isArray(amenityData)) return amenities
  
  amenityData.forEach(item => {
    // Extract text from innerHTML
    let text = ''
    if (item.innerHTML) {
      // Remove HTML tags to get text content
      text = item.innerHTML.replace(/<[^>]*>/g, '').trim()
    }
    if (text && text.length > 2 && text.length < 100) {
      amenities.basic.push(text)
    }
  })
  
  // Categorize amenities
  const categories: Record<string, string[]> = {
    kitchen: ['Kitchen', 'Microwave', 'Refrigerator', 'Coffee', 'Dishwasher', 'Oven', 'Stove'],
    bathroom: ['Hair dryer', 'Shampoo', 'Hot water', 'Towels'],
    entertainment: ['TV', 'Netflix', 'Cable', 'Games'],
    outdoor: ['Pool', 'Hot tub', 'BBQ', 'Patio', 'Garden', 'Beach'],
    safety: ['Smoke alarm', 'Carbon monoxide', 'Fire extinguisher', 'First aid']
  }
  
  Object.entries(categories).forEach(([category, keywords]) => {
    const items = amenities.basic.filter((a: string) => 
      keywords.some(k => a.toLowerCase().includes(k.toLowerCase()))
    )
    if (items.length > 0) {
      amenities[category] = items
    }
  })
  
  return amenities
}

function parseReviews(data: any): any {
  const reviews: any = {
    summary: {
      rating: 0,
      totalCount: 0,
      distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      categories: {}
    },
    recentReviews: []
  }
  
  // Parse from HTML if available
  const html = data.fullHtml?.html || ''
  if (html) {
    // Extract rating and review count from HTML
    const ratingMatch = html.match(/(\d+\.?\d*)\s*★/) || html.match(/rating[^>]*>(\d+\.?\d*)/)
    const reviewCountMatch = html.match(/(\d+)\s*review/i)
    
    if (ratingMatch) reviews.summary.rating = parseFloat(ratingMatch[1])
    if (reviewCountMatch) reviews.summary.totalCount = parseInt(reviewCountMatch[1])
    
    // Extract review categories from HTML
    const categoryPatterns = {
      cleanliness: /Cleanliness[^>]*>[\s\S]*?(\d+\.?\d*)/i,
      accuracy: /Accuracy[^>]*>[\s\S]*?(\d+\.?\d*)/i,
      communication: /Communication[^>]*>[\s\S]*?(\d+\.?\d*)/i,
      location: /Location[^>]*>[\s\S]*?(\d+\.?\d*)/i,
      checkIn: /Check-in[^>]*>[\s\S]*?(\d+\.?\d*)/i,
      value: /Value[^>]*>[\s\S]*?(\d+\.?\d*)/i
    }
    
    Object.entries(categoryPatterns).forEach(([key, pattern]) => {
      const match = html.match(pattern)
      if (match) {
        reviews.summary.categories[key] = parseFloat(match[1])
      }
    })
  }
  
  // Parse individual reviews from querySelectorAll results
  if (data.reviews && Array.isArray(data.reviews)) {
    reviews.recentReviews = data.reviews.map((item: any) => {
      // Extract review data from innerHTML
      if (!item.innerHTML) return null
      
      // Remove HTML tags to get text content
      const textContent = item.innerHTML.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
      
      // Try to find patterns in the text
      const dateMatch = textContent.match(/(\w+ \d{4}|\d{4})/);
      const lines = textContent.split(/\s{2,}/).filter((l: string) => l.trim())
      
      return {
        author: lines[0] || 'Guest',
        date: dateMatch?.[1] || new Date().toISOString(),
        text: textContent.substring(0, 500) // Limit review text length
      }
    }).filter(Boolean).filter((r: any) => r.text && r.text.length > 10).slice(0, 100) // Get up to 100 reviews
  }
  
  return reviews
}

function enhanceFromHTML(listing: ComprehensiveAirbnbListing, html: string): void {
  // Extract description if not already set
  if (!listing.description) {
    const descMatch = html.match(/<div[^>]*data-section-id="DESCRIPTION"[^>]*>[\s\S]*?<div>([^<]+)<\/div>/i)
    if (descMatch) {
      listing.description = descMatch[1].trim()
    }
  }
  
  // Extract location details
  const locationMatch = html.match(/([^,]+),\s*([^,]+),\s*([^<]+)/i)
  if (locationMatch) {
    listing.location.city = locationMatch[1].trim()
    listing.location.state = locationMatch[2].trim()
    listing.location.country = locationMatch[3].trim()
  }
  
  // Look for additional host information
  const responseRateMatch = html.match(/Response rate[^>]*>\s*(\d+)%/i)
  if (responseRateMatch) {
    listing.host.responseRate = parseInt(responseRateMatch[1])
  }
  
  const responseTimeMatch = html.match(/Response time[^>]*>\s*([^<]+)/i)
  if (responseTimeMatch) {
    listing.host.responseTime = responseTimeMatch[1].trim()
  }
}

function calculateDataCompleteness(data: any): number {
  let score = 0
  const maxScore = 100
  
  // Check for key fields (10 points each)
  if (data.title?.text) score += 10
  
  // Check for arrays with content (20 points each for key data)
  if (data.reviews && Array.isArray(data.reviews) && data.reviews.length > 0) score += 20
  if (data.amenities && Array.isArray(data.amenities) && data.amenities.length > 0) score += 20
  if (data.photos && Array.isArray(data.photos) && data.photos.length > 0) score += 20
  
  // HTML provides base coverage (30 points)
  if (data.fullHtml?.html) {
    score += 30
    
    // Bonus points for HTML content quality
    const htmlLength = data.fullHtml.html.length
    if (htmlLength > 50000) score += 10 // Large HTML means more data
  }
  
  return Math.min(score, maxScore)
}

// Convert to simplified format for backward compatibility
export function browserQLToSimplified(comprehensive: ComprehensiveAirbnbListing): AirbnbListingData {
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