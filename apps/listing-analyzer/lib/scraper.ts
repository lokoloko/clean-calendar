export interface ListingData {
  url: string
  title: string
  description: string
  propertyType: string
  
  photos: {
    count: number
    urls?: string[]
  }
  
  pricing: {
    nightly: number
    cleaning?: number
    currency: string
  }
  
  reviews: {
    rating: number
    count: number
    recent?: string[]
    distribution?: {
      cleanliness?: number
      accuracy?: number
      checkin?: number
      communication?: number
      location?: number
      value?: number
    }
  }
  
  amenities: {
    all: string[]
    categories?: {
      essentials: string[]
      features: string[]
      safety: string[]
    }
  }
  
  host: {
    name?: string
    isSuperhost: boolean
    responseTime?: string
    responseRate?: string
  }
  
  houseRules: {
    checkIn?: string
    checkOut?: string
    maxGuests?: number
    pets?: boolean
    smoking?: boolean
    parties?: boolean
  }
  
  availability: {
    minimumStay?: number
    instantBook?: boolean
  }
  
  location: {
    neighborhood?: string
    city?: string
  }
}

export async function scrapeAirbnbListing(url: string): Promise<ListingData> {
  const apiKey = process.env.BROWSERLESS_API_KEY
  
  if (!apiKey) {
    throw new Error('Browserless API key not configured')
  }

  const endpoint = 'https://production-sfo.browserless.io/chromium/bql'

  // BrowserQL query to scrape comprehensive data
  const query = `
    mutation ScrapeAirbnb {
      goto(url: "${url}", waitUntil: networkIdle) {
        status
      }
      
      # Get the page title
      title: text(selector: "h1", timeout: 5000) {
        text
      }
      
      # Scroll to load more content
      scroll(y: 1000) {
        x
        y
      }
      
      # Get reviews section
      reviewsSection: html(selector: "[data-section-id='REVIEWS_DEFAULT']", timeout: 3000) {
        html
      }
      
      # Get amenities section
      amenitiesSection: html(selector: "[data-section-id='AMENITIES_DEFAULT']", timeout: 3000) {
        html
      }
      
      # Get policies section
      policiesSection: html(selector: "[data-section-id='POLICIES_DEFAULT']", timeout: 3000) {
        html
      }
      
      # Get host section
      hostSection: html(selector: "[data-section-id='MEET_YOUR_HOST']", timeout: 3000) {
        html
      }
      
      # Get full HTML for comprehensive parsing
      fullHtml: html {
        html
      }
    }`

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query,
      variables: {}
    })
  })

  if (!response.ok) {
    throw new Error(`Scraping failed: ${response.statusText}`)
  }

  const result = await response.json()

  if (result.errors) {
    throw new Error('Failed to scrape listing')
  }

  // Parse the scraped data
  const data = result.data
  const fullHtml = data.fullHtml?.html || ''
  
  return parseListingData(url, data, fullHtml)
}

function parseListingData(url: string, scrapedData: any, html: string): ListingData {
  const listing: ListingData = {
    url,
    title: scrapedData.title?.text || extractTitle(html),
    description: extractDescription(html),
    propertyType: extractPropertyType(html),
    
    photos: extractPhotos(html),
    pricing: extractPricing(html),
    reviews: extractReviews(html, scrapedData.reviewsSection?.html),
    amenities: extractAmenities(scrapedData.amenitiesSection?.html || html),
    host: extractHostInfo(scrapedData.hostSection?.html || html),
    houseRules: extractHouseRules(scrapedData.policiesSection?.html || html),
    availability: extractAvailability(html),
    location: extractLocation(html)
  }
  
  return listing
}

function extractTitle(html: string): string {
  const match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
  return match ? match[1].trim() : ''
}

function extractDescription(html: string): string {
  // Look for description patterns
  const patterns = [
    /<div[^>]*data-section-id="DESCRIPTION"[^>]*>([^<]+)</i,
    /<meta[^>]*name="description"[^>]*content="([^"]+)"/i,
  ]
  
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match) return match[1].trim()
  }
  
  return ''
}

function extractPropertyType(html: string): string {
  const patterns = [
    /entire\s+(home|apartment|place|house|condo|loft|studio)/i,
    /private\s+room/i,
    /shared\s+room/i
  ]
  
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match) return match[0]
  }
  
  return 'Property'
}

function extractPhotos(html: string): { count: number; urls?: string[] } {
  // Count photo elements
  const photoMatches = html.match(/<img[^>]*data-testid="[^"]*photo[^"]*"/gi) || []
  const buttonMatch = html.match(/Show all (\d+) photos/i)
  
  const count = buttonMatch ? parseInt(buttonMatch[1]) : photoMatches.length
  
  return { count }
}

function extractPricing(html: string): ListingData['pricing'] {
  const pricing: ListingData['pricing'] = {
    nightly: 0,
    currency: 'USD'
  }
  
  // Extract nightly price
  const pricePatterns = [
    /\$(\d+)\s*(?:per\s*)?night/i,
    /\$(\d+)\s*\/\s*night/i,
    /"price":"?(\d+)"?/,
  ]
  
  for (const pattern of pricePatterns) {
    const match = html.match(pattern)
    if (match && match[1]) {
      pricing.nightly = parseInt(match[1])
      break
    }
  }
  
  // Extract cleaning fee
  const cleaningMatch = html.match(/cleaning\s*fee[^$]*\$(\d+)/i)
  if (cleaningMatch) {
    pricing.cleaning = parseInt(cleaningMatch[1])
  }
  
  return pricing
}

function extractReviews(html: string, reviewsHtml?: string): ListingData['reviews'] {
  const reviews: ListingData['reviews'] = {
    rating: 0,
    count: 0
  }
  
  const targetHtml = reviewsHtml || html
  
  // Extract rating and count
  const ratingPatterns = [
    /(\d+\.?\d*)\s*·\s*(\d+)\s*reviews?/i,
    /(\d+\.?\d*)\s*\((\d+)\s*reviews?\)/i,
  ]
  
  for (const pattern of ratingPatterns) {
    const match = targetHtml.match(pattern)
    if (match) {
      reviews.rating = parseFloat(match[1])
      reviews.count = parseInt(match[2])
      break
    }
  }
  
  // Extract category ratings
  if (reviewsHtml) {
    const distribution: any = {}
    const categories = ['cleanliness', 'accuracy', 'check-in', 'communication', 'location', 'value']
    
    for (const category of categories) {
      const catPattern = new RegExp(`${category}[^\\d]*(\\d+\\.\\d+)`, 'i')
      const match = reviewsHtml.match(catPattern)
      if (match) {
        distribution[category.replace('-', '')] = parseFloat(match[1])
      }
    }
    
    if (Object.keys(distribution).length > 0) {
      reviews.distribution = distribution
    }
  }
  
  return reviews
}

function extractAmenities(html: string): ListingData['amenities'] {
  const amenities: ListingData['amenities'] = {
    all: [],
    categories: {
      essentials: [],
      features: [],
      safety: []
    }
  }
  
  // Extract amenity text
  const matches = html.match(/>([^<]{3,50})</g) || []
  const amenitySet = new Set<string>()
  
  for (const match of matches) {
    const text = match.replace(/^>|<$/g, '').trim()
    if (text && !text.includes('Show') && !text.includes('amenities')) {
      amenitySet.add(text)
      
      // Categorize
      const lower = text.toLowerCase()
      if (lower.includes('wifi') || lower.includes('kitchen') || lower.includes('washer') || 
          lower.includes('dryer') || lower.includes('heating') || lower.includes('air conditioning')) {
        amenities.categories!.essentials.push(text)
      } else if (lower.includes('pool') || lower.includes('gym') || lower.includes('parking') || 
                 lower.includes('tv') || lower.includes('workspace')) {
        amenities.categories!.features.push(text)
      } else if (lower.includes('smoke') || lower.includes('carbon') || lower.includes('extinguisher') || 
                 lower.includes('aid')) {
        amenities.categories!.safety.push(text)
      }
    }
  }
  
  amenities.all = Array.from(amenitySet)
  return amenities
}

function extractHostInfo(html: string): ListingData['host'] {
  const host: ListingData['host'] = {
    isSuperhost: false
  }
  
  // Host name
  const nameMatch = html.match(/hosted\s*by\s*([^<]+)/i)
  if (nameMatch) {
    host.name = nameMatch[1].trim()
  }
  
  // Superhost status
  host.isSuperhost = /superhost/i.test(html)
  
  // Response rate
  const responseRateMatch = html.match(/(\d+)%\s*response\s*rate/i)
  if (responseRateMatch) {
    host.responseRate = `${responseRateMatch[1]}%`
  }
  
  // Response time
  const responseTimeMatch = html.match(/responds?\s*(?:with)?in\s*([^<]+)/i)
  if (responseTimeMatch) {
    host.responseTime = responseTimeMatch[1].trim()
  }
  
  return host
}

function extractHouseRules(html: string): ListingData['houseRules'] {
  const rules: ListingData['houseRules'] = {}
  
  // Check-in/out times
  const checkinMatch = html.match(/check-?in[^>]*>([^<]+)/i)
  if (checkinMatch) rules.checkIn = checkinMatch[1].trim()
  
  const checkoutMatch = html.match(/check-?out[^>]*>([^<]+)/i)
  if (checkoutMatch) rules.checkOut = checkoutMatch[1].trim()
  
  // Max guests
  const guestsMatch = html.match(/(\d+)\s*guests?\s*maximum/i)
  if (guestsMatch) rules.maxGuests = parseInt(guestsMatch[1])
  
  // Policies
  rules.pets = /pets?\s*allowed/i.test(html)
  rules.smoking = !/no\s*smoking/i.test(html) && /smoking\s*allowed/i.test(html)
  rules.parties = !/no\s*parties/i.test(html) && /parties?\s*allowed/i.test(html)
  
  return rules
}

function extractAvailability(html: string): ListingData['availability'] {
  const availability: ListingData['availability'] = {}
  
  // Minimum stay
  const minStayMatch = html.match(/minimum\s*stay[^>]*(\d+)\s*nights?/i)
  if (minStayMatch) {
    availability.minimumStay = parseInt(minStayMatch[1])
  }
  
  // Instant book
  availability.instantBook = /instant\s*book/i.test(html)
  
  return availability
}

function extractLocation(html: string): ListingData['location'] {
  const location: ListingData['location'] = {}
  
  // Try to extract from various patterns
  const patterns = [
    /in\s+([^,]+),\s*([^<]+)/i,
    /<meta[^>]*property="og:locality"[^>]*content="([^"]+)"/i,
  ]
  
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match) {
      location.neighborhood = match[1]?.trim()
      location.city = match[2]?.trim() || match[1]?.trim()
      break
    }
  }
  
  return location
}