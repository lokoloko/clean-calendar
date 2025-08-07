/**
 * Parser for Airbnb listing HTML content
 * Extracts structured data from scraped HTML
 */

export interface AirbnbListingData {
  // Basic Information
  title: string
  propertyType?: string
  url: string
  
  // Pricing
  price: {
    nightly: number
    currency: string
    cleaningFee?: number
    serviceFee?: number
    total?: number
  }
  
  // Reviews & Ratings
  reviews: {
    overall: number
    count: number
    distribution?: {
      cleanliness: number
      accuracy: number
      checkin: number
      communication: number
      location: number
      value: number
    }
    recent?: Array<{
      author: string
      date: string
      text: string
      rating?: number
    }>
  }
  
  // House Rules
  houseRules: {
    checkIn?: string
    checkOut?: string
    maxGuests?: number
    children?: boolean
    infants?: boolean
    pets?: boolean
    smoking?: boolean
    parties?: boolean
    quietHours?: string
    additionalRules?: string[]
  }
  
  // Safety & Property
  safety: {
    features?: string[]
    notIncluded?: string[]
  }
  
  // Cancellation Policy
  cancellation: {
    type?: string
    description?: string
    fullRefundDays?: number
  }
  
  // Calendar/Availability
  availability: {
    minimumStay?: number
    maximumStay?: number
    instantBook?: boolean
    availableDates?: string[]
    bookedDates?: string[]
  }
  
  // Amenities
  amenities: {
    all?: string[]
    highlights?: string[]
    categories?: {
      essentials?: string[]
      features?: string[]
      location?: string[]
      safety?: string[]
    }
  }
  
  // Host Information
  host: {
    name?: string
    isSuperhost?: boolean
    responseRate?: string
    responseTime?: string
    joinedDate?: string
  }
  
  // Location
  location: {
    address?: string
    neighborhood?: string
    city?: string
    state?: string
    country?: string
    coordinates?: {
      lat: number
      lng: number
    }
  }
  
  // Metadata
  lastScraped: Date
  scrapingErrors?: string[]
}

export class AirbnbParser {
  /**
   * Parse complete listing data from HTML
   */
  static parseListingHTML(html: string, url: string): AirbnbListingData {
    const data: AirbnbListingData = {
      title: '',
      url,
      price: {
        nightly: 0,
        currency: 'USD'
      },
      reviews: {
        overall: 0,
        count: 0
      },
      houseRules: {},
      safety: {},
      cancellation: {},
      availability: {},
      amenities: {},
      host: {},
      location: {},
      lastScraped: new Date(),
      scrapingErrors: []
    }
    
    try {
      // Extract title
      data.title = this.extractTitle(html)
      
      // Extract price
      data.price = this.extractPrice(html)
      
      // Extract reviews
      data.reviews = this.extractReviews(html)
      
      // Extract amenities
      data.amenities = this.extractAmenities(html)
      
      // Extract house rules
      data.houseRules = this.extractHouseRules(html)
      
      // Extract safety features
      data.safety = this.extractSafety(html)
      
      // Extract cancellation policy
      data.cancellation = this.extractCancellation(html)
      
      // Extract availability
      data.availability = this.extractAvailability(html)
      
      // Extract host info
      data.host = this.extractHostInfo(html)
      
      // Extract location
      data.location = this.extractLocation(html)
      
    } catch (error) {
      data.scrapingErrors?.push(`General parsing error: ${error}`)
    }
    
    return data
  }
  
  /**
   * Extract title from HTML
   */
  private static extractTitle(html: string): string {
    // Try h1 tag first
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
    if (h1Match) {
      return h1Match[1].trim()
    }
    
    // Try meta property
    const metaMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i)
    if (metaMatch) {
      return metaMatch[1].trim()
    }
    
    return ''
  }
  
  /**
   * Extract pricing information
   */
  private static extractPrice(html: string): AirbnbListingData['price'] {
    const price: AirbnbListingData['price'] = {
      nightly: 0,
      currency: 'USD'
    }
    
    // Look for price patterns like $65, $120 night, etc.
    const pricePatterns = [
      /\$(\d+)\s*(?:per\s*)?night/i,
      /\$(\d+)\s*\/\s*night/i,
      /\$(\d+)(?:\s|<)/,
      /"price":"?(\d+)"?/,
      /price[^>]*>\$(\d+)/i
    ]
    
    for (const pattern of pricePatterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        price.nightly = parseInt(match[1])
        if (price.nightly > 0) break
      }
    }
    
    // Look for cleaning fee
    const cleaningMatch = html.match(/cleaning\s*fee[^$]*\$(\d+)/i)
    if (cleaningMatch) {
      price.cleaningFee = parseInt(cleaningMatch[1])
    }
    
    // Look for service fee
    const serviceMatch = html.match(/service\s*fee[^$]*\$(\d+)/i)
    if (serviceMatch) {
      price.serviceFee = parseInt(serviceMatch[1])
    }
    
    return price
  }
  
  /**
   * Extract reviews and ratings
   */
  private static extractReviews(html: string): AirbnbListingData['reviews'] {
    const reviews: AirbnbListingData['reviews'] = {
      overall: 0,
      count: 0
    }
    
    // Extract review count - look for patterns like "59 reviews"
    const countPatterns = [
      /(\d+)\s*reviews?/i,
      /reviews?\s*\((\d+)\)/i,
      /"reviewsCount":(\d+)/
    ]
    
    for (const pattern of countPatterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        reviews.count = parseInt(match[1])
        if (reviews.count > 0) break
      }
    }
    
    // Extract overall rating - look for patterns like "4.93"
    const ratingPatterns = [
      /(\d+\.?\d*)\s*(?:out\s*of\s*5)?(?:\s*stars?)?/i,
      /"starRating":(\d+\.?\d*)/,
      /rating[^>]*>(\d+\.?\d*)</i
    ]
    
    for (const pattern of ratingPatterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        const rating = parseFloat(match[1])
        if (rating <= 5 && rating > 0) {
          reviews.overall = rating
          break
        }
      }
    }
    
    // Try to extract rating categories
    const categories = ['cleanliness', 'accuracy', 'check-in', 'communication', 'location', 'value']
    const distribution: any = {}
    
    for (const category of categories) {
      const catPattern = new RegExp(`${category}[^>]*>\\s*(\\d+\\.?\\d*)`, 'i')
      const match = html.match(catPattern)
      if (match && match[1]) {
        distribution[category.replace('-', '')] = parseFloat(match[1])
      }
    }
    
    if (Object.keys(distribution).length > 0) {
      reviews.distribution = distribution
    }
    
    return reviews
  }
  
  /**
   * Extract amenities
   */
  private static extractAmenities(html: string): AirbnbListingData['amenities'] {
    const amenities: AirbnbListingData['amenities'] = {
      all: [],
      highlights: []
    }
    
    // Find amenities section
    const amenitiesMatch = html.match(/data-section-id="AMENITIES_DEFAULT"[^>]*>([\s\S]*?)(?=<div[^>]*data-section-id|$)/i)
    
    if (amenitiesMatch) {
      const amenitiesSection = amenitiesMatch[1]
      
      // Extract individual amenities
      const itemPatterns = [
        /<div[^>]*>([^<]+)(?:<\/div>)/g,
        /<span[^>]*>([^<]+)(?:<\/span>)/g
      ]
      
      const foundAmenities = new Set<string>()
      
      for (const pattern of itemPatterns) {
        let match
        while ((match = pattern.exec(amenitiesSection)) !== null) {
          const text = match[1].trim()
          // Filter out UI elements and keep actual amenities
          if (text.length > 3 && text.length < 100 && !text.includes('Show') && !text.includes('amenities')) {
            foundAmenities.add(text)
          }
        }
      }
      
      amenities.all = Array.from(foundAmenities)
      
      // Highlights are typically the first few amenities shown
      amenities.highlights = amenities.all.slice(0, 6)
    }
    
    return amenities
  }
  
  /**
   * Extract house rules
   */
  private static extractHouseRules(html: string): AirbnbListingData['houseRules'] {
    const rules: AirbnbListingData['houseRules'] = {}
    
    // Find policies section
    const rulesMatch = html.match(/data-section-id="POLICIES_DEFAULT"[^>]*>([\s\S]*?)(?=<div[^>]*data-section-id|$)/i)
    
    if (rulesMatch) {
      const rulesSection = rulesMatch[1]
      
      // Check-in time
      const checkinMatch = rulesSection.match(/check-?in[^>]*>([^<]+)/i)
      if (checkinMatch) {
        rules.checkIn = checkinMatch[1].trim()
      }
      
      // Check-out time  
      const checkoutMatch = rulesSection.match(/check-?out[^>]*>([^<]+)/i)
      if (checkoutMatch) {
        rules.checkOut = checkoutMatch[1].trim()
      }
      
      // Pets
      rules.pets = /pets?\s*allowed/i.test(rulesSection) || /pet-?friendly/i.test(rulesSection)
      
      // Smoking
      rules.smoking = !/no\s*smoking/i.test(rulesSection) && /smoking\s*allowed/i.test(rulesSection)
      
      // Parties
      rules.parties = !/no\s*parties/i.test(rulesSection) && /parties?\s*allowed/i.test(rulesSection)
      
      // Max guests
      const guestsMatch = rulesSection.match(/(\d+)\s*guests?\s*maximum/i)
      if (guestsMatch) {
        rules.maxGuests = parseInt(guestsMatch[1])
      }
    }
    
    return rules
  }
  
  /**
   * Extract safety features
   */
  private static extractSafety(html: string): AirbnbListingData['safety'] {
    const safety: AirbnbListingData['safety'] = {
      features: [],
      notIncluded: []
    }
    
    // Common safety features to look for
    const safetyKeywords = [
      'smoke alarm',
      'carbon monoxide',
      'first aid',
      'fire extinguisher',
      'security camera',
      'lock',
      'smoke detector',
      'co detector'
    ]
    
    for (const keyword of safetyKeywords) {
      const pattern = new RegExp(keyword, 'i')
      if (pattern.test(html)) {
        safety.features?.push(keyword)
      }
    }
    
    return safety
  }
  
  /**
   * Extract cancellation policy
   */
  private static extractCancellation(html: string): AirbnbListingData['cancellation'] {
    const cancellation: AirbnbListingData['cancellation'] = {}
    
    // Look for cancellation policy type
    const policyTypes = ['flexible', 'moderate', 'strict', 'super strict', 'non-refundable']
    
    for (const type of policyTypes) {
      const pattern = new RegExp(`cancellation[^>]*${type}`, 'i')
      if (pattern.test(html)) {
        cancellation.type = type
        break
      }
    }
    
    // Look for refund days
    const refundMatch = html.match(/full\s*refund[^>]*(\d+)\s*days?/i)
    if (refundMatch) {
      cancellation.fullRefundDays = parseInt(refundMatch[1])
    }
    
    return cancellation
  }
  
  /**
   * Extract availability information
   */
  private static extractAvailability(html: string): AirbnbListingData['availability'] {
    const availability: AirbnbListingData['availability'] = {}
    
    // Minimum stay
    const minStayMatch = html.match(/minimum\s*stay[^>]*(\d+)\s*nights?/i)
    if (minStayMatch) {
      availability.minimumStay = parseInt(minStayMatch[1])
    }
    
    // Maximum stay
    const maxStayMatch = html.match(/maximum\s*stay[^>]*(\d+)\s*nights?/i)
    if (maxStayMatch) {
      availability.maximumStay = parseInt(maxStayMatch[1])
    }
    
    // Instant book
    availability.instantBook = /instant\s*book/i.test(html)
    
    return availability
  }
  
  /**
   * Extract host information
   */
  private static extractHostInfo(html: string): AirbnbListingData['host'] {
    const host: AirbnbListingData['host'] = {}
    
    // Find host section
    const hostMatch = html.match(/data-section-id="MEET_YOUR_HOST"[^>]*>([\s\S]*?)(?=<div[^>]*data-section-id|$)/i)
    
    if (hostMatch) {
      const hostSection = hostMatch[1]
      
      // Host name
      const nameMatch = hostSection.match(/hosted\s*by\s*([^<]+)/i)
      if (nameMatch) {
        host.name = nameMatch[1].trim()
      }
      
      // Superhost
      host.isSuperhost = /superhost/i.test(hostSection)
      
      // Response rate
      const responseRateMatch = hostSection.match(/(\d+)%\s*response\s*rate/i)
      if (responseRateMatch) {
        host.responseRate = `${responseRateMatch[1]}%`
      }
      
      // Response time
      const responseTimeMatch = hostSection.match(/responds?\s*(?:with)?in\s*([^<]+)/i)
      if (responseTimeMatch) {
        host.responseTime = responseTimeMatch[1].trim()
      }
    }
    
    return host
  }
  
  /**
   * Extract location information
   */
  private static extractLocation(html: string): AirbnbListingData['location'] {
    const location: AirbnbListingData['location'] = {}
    
    // Find location section
    const locationMatch = html.match(/data-section-id="LOCATION_DEFAULT"[^>]*>([\s\S]*?)(?=<div[^>]*data-section-id|$)/i)
    
    if (locationMatch) {
      const locationSection = locationMatch[1]
      
      // Extract city/neighborhood from various patterns
      const cityPatterns = [
        /([^,]+),\s*([^,]+),\s*([^<]+)/,  // City, State, Country
        /in\s+([^<]+)/i  // "in City"
      ]
      
      for (const pattern of cityPatterns) {
        const match = locationSection.match(pattern)
        if (match) {
          if (match[1]) location.neighborhood = match[1].trim()
          if (match[2]) location.city = match[2].trim()
          if (match[3]) location.state = match[3].trim()
          break
        }
      }
    }
    
    // Try to extract from meta tags as fallback
    const metaLocationMatch = html.match(/<meta[^>]*property="og:locality"[^>]*content="([^"]+)"/i)
    if (metaLocationMatch && !location.city) {
      location.city = metaLocationMatch[1]
    }
    
    return location
  }
}