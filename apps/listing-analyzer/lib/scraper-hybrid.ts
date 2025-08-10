// Hybrid scraper that combines multiple methods for maximum reliability
import { ComprehensiveAirbnbListing, AirbnbListingData } from './types/listing'
import { scrapeAirbnbWithHttpApi, httpApiToSimplified } from './scraper-http-api'
import { scrapeAirbnbWithInterception } from './scraper-interceptor'
import { scrapeAirbnbWithProxy } from './scraper-proxy'
import { scrapeAirbnbWithPuppeteer, puppeteerToSimplified } from './scraper-puppeteer'

export interface ScrapingMetrics {
  method: string
  attemptNumber: number
  startTime: number
  endTime: number
  success: boolean
  dataQuality: number
  fieldsExtracted: number
  error?: string
}

export interface HybridScrapingResult {
  listing: ComprehensiveAirbnbListing
  metrics: ScrapingMetrics[]
  bestMethod: string
  totalTime: number
}

// Scraping methods in order of preference (fastest to most comprehensive)
const SCRAPING_METHODS = [
  { name: 'http-api', fn: scrapeAirbnbWithHttpApi, timeout: 15000 },
  { name: 'interceptor', fn: scrapeAirbnbWithInterception, timeout: 30000 },
  { name: 'proxy-residential', fn: (url: string) => scrapeAirbnbWithProxy(url, { type: 'residential', retryWithDifferentProxy: true }), timeout: 45000 },
  { name: 'puppeteer-standard', fn: scrapeAirbnbWithPuppeteer, timeout: 60000 }
]

export async function scrapeAirbnbHybrid(url: string): Promise<HybridScrapingResult> {
  const startTime = Date.now()
  const metrics: ScrapingMetrics[] = []
  let bestListing: ComprehensiveAirbnbListing | null = null
  let bestQuality = 0
  let bestMethod = ''
  
  console.log('Starting hybrid scraping for:', url)
  
  // Try each method sequentially (could be parallel for speed)
  for (let i = 0; i < SCRAPING_METHODS.length; i++) {
    const method = SCRAPING_METHODS[i]
    const methodStartTime = Date.now()
    
    console.log(`Attempting method ${i + 1}/${SCRAPING_METHODS.length}: ${method.name}`)
    
    try {
      // Set up timeout for this method
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout after ${method.timeout}ms`)), method.timeout)
      })
      
      // Race between scraping and timeout
      const listing = await Promise.race([
        method.fn(url),
        timeoutPromise
      ])
      
      const methodEndTime = Date.now()
      const dataQuality = listing.meta?.dataCompleteness || calculateDataQuality(listing)
      const fieldsExtracted = countExtractedFields(listing)
      
      // Record metrics
      const metric: ScrapingMetrics = {
        method: method.name,
        attemptNumber: i + 1,
        startTime: methodStartTime,
        endTime: methodEndTime,
        success: true,
        dataQuality,
        fieldsExtracted
      }
      metrics.push(metric)
      
      console.log(`✓ ${method.name} succeeded: Quality=${dataQuality}%, Fields=${fieldsExtracted}, Time=${methodEndTime - methodStartTime}ms`)
      
      // Keep the best result
      if (dataQuality > bestQuality) {
        bestListing = listing
        bestQuality = dataQuality
        bestMethod = method.name
      }
      
      // If we got excellent quality (>90%), no need to try other methods
      if (dataQuality >= 90) {
        console.log('Excellent quality achieved, stopping here')
        break
      }
      
    } catch (error: any) {
      const methodEndTime = Date.now()
      
      // Record failure metrics
      const metric: ScrapingMetrics = {
        method: method.name,
        attemptNumber: i + 1,
        startTime: methodStartTime,
        endTime: methodEndTime,
        success: false,
        dataQuality: 0,
        fieldsExtracted: 0,
        error: error.message
      }
      metrics.push(metric)
      
      console.log(`✗ ${method.name} failed: ${error.message}`)
      
      // Continue to next method
    }
  }
  
  // If no method succeeded, try a fallback merge strategy
  if (!bestListing) {
    console.log('All methods failed, attempting fallback merge...')
    bestListing = createFallbackListing(url, metrics)
    bestMethod = 'fallback'
  }
  
  const totalTime = Date.now() - startTime
  
  // Log final results
  console.log('\n=== Hybrid Scraping Summary ===')
  console.log(`Total time: ${totalTime}ms`)
  console.log(`Methods tried: ${metrics.length}`)
  console.log(`Best method: ${bestMethod} (${bestQuality}% quality)`)
  console.log(`Success rate: ${metrics.filter(m => m.success).length}/${metrics.length}`)
  
  return {
    listing: bestListing,
    metrics,
    bestMethod,
    totalTime
  }
}

// Merge multiple partial results into one comprehensive listing
export async function scrapeAirbnbWithMerge(url: string): Promise<ComprehensiveAirbnbListing> {
  const results: ComprehensiveAirbnbListing[] = []
  
  // Run multiple methods in parallel for speed
  const promises = SCRAPING_METHODS.slice(0, 3).map(async (method) => {
    try {
      const listing = await Promise.race([
        method.fn(url),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), method.timeout)
        )
      ])
      return listing
    } catch {
      return null
    }
  })
  
  const parallelResults = await Promise.all(promises)
  
  // Filter out nulls
  parallelResults.forEach(result => {
    if (result) results.push(result)
  })
  
  if (results.length === 0) {
    throw new Error('All parallel scraping methods failed')
  }
  
  // Merge all results, prioritizing non-null/non-default values
  return mergeListings(results)
}

function mergeListings(listings: ComprehensiveAirbnbListing[]): ComprehensiveAirbnbListing {
  if (listings.length === 0) throw new Error('No listings to merge')
  if (listings.length === 1) return listings[0]
  
  // Start with the first listing as base
  const merged = { ...listings[0] }
  
  // Merge each subsequent listing
  for (let i = 1; i < listings.length; i++) {
    const listing = listings[i]
    
    // Merge basic fields (prefer non-default values)
    if (!merged.title || merged.title === 'Airbnb Listing') {
      merged.title = listing.title
    }
    
    if (!merged.subtitle && listing.subtitle) {
      merged.subtitle = listing.subtitle
    }
    
    if (!merged.description && listing.description) {
      merged.description = listing.description
    }
    
    // Merge pricing (prefer actual values over defaults)
    if (merged.pricing.basePrice === 150 && listing.pricing.basePrice !== 150) {
      merged.pricing.basePrice = listing.pricing.basePrice
    }
    
    // Merge reviews (prefer higher counts)
    if (listing.reviews.summary.totalCount > merged.reviews.summary.totalCount) {
      merged.reviews = listing.reviews
    }
    
    // Merge amenities (combine unique)
    const combinedAmenities = new Set([
      ...(merged.amenities.basic || []),
      ...(listing.amenities.basic || [])
    ])
    merged.amenities.basic = Array.from(combinedAmenities)
    
    // Merge photos (combine unique URLs)
    const photoUrls = new Set(merged.photos.map(p => p.url))
    listing.photos.forEach(photo => {
      if (!photoUrls.has(photo.url)) {
        merged.photos.push(photo)
        photoUrls.add(photo.url)
      }
    })
    
    // Merge host info (prefer complete data)
    if (listing.host.name !== 'Host' && merged.host.name === 'Host') {
      merged.host = listing.host
    }
    
    // Update data completeness
    merged.meta.dataCompleteness = calculateDataQuality(merged)
  }
  
  return merged
}

function calculateDataQuality(listing: ComprehensiveAirbnbListing): number {
  let score = 0
  let total = 0
  
  // Check each important field
  const checks = [
    { value: listing.title && listing.title !== 'Airbnb Listing', weight: 10 },
    { value: listing.subtitle, weight: 5 },
    { value: listing.description && listing.description.length > 50, weight: 10 },
    { value: listing.pricing.basePrice && listing.pricing.basePrice !== 150, weight: 15 },
    { value: listing.reviews.summary.rating && listing.reviews.summary.rating !== 4.5, weight: 10 },
    { value: listing.reviews.summary.totalCount > 0, weight: 10 },
    { value: listing.amenities.basic && listing.amenities.basic.length > 10, weight: 10 },
    { value: listing.photos && listing.photos.length > 5, weight: 10 },
    { value: listing.host.name && listing.host.name !== 'Host', weight: 10 },
    { value: listing.reviews.recentReviews && listing.reviews.recentReviews.length > 0, weight: 10 }
  ]
  
  checks.forEach(check => {
    total += check.weight
    if (check.value) score += check.weight
  })
  
  return Math.round((score / total) * 100)
}

function countExtractedFields(listing: ComprehensiveAirbnbListing): number {
  let count = 0
  
  if (listing.title && listing.title !== 'Airbnb Listing') count++
  if (listing.subtitle) count++
  if (listing.description) count++
  if (listing.pricing.basePrice && listing.pricing.basePrice !== 150) count++
  if (listing.pricing.cleaningFee) count++
  if (listing.pricing.serviceFee) count++
  if (listing.reviews.summary.rating && listing.reviews.summary.rating !== 4.5) count++
  if (listing.reviews.summary.totalCount > 0) count++
  if (listing.amenities.basic && listing.amenities.basic.length > 0) count += listing.amenities.basic.length
  if (listing.photos && listing.photos.length > 0) count += listing.photos.length
  if (listing.reviews.recentReviews && listing.reviews.recentReviews.length > 0) count += listing.reviews.recentReviews.length
  if (listing.host.name && listing.host.name !== 'Host') count++
  if (listing.host.isSuperhost) count++
  if (listing.spaces.bedrooms > 0) count++
  if (listing.spaces.beds > 0) count++
  if (listing.spaces.bathrooms > 0) count++
  
  return count
}

function createFallbackListing(url: string, metrics: ScrapingMetrics[]): ComprehensiveAirbnbListing {
  // Create a minimal listing with error information
  return {
    id: url.match(/rooms\/(\d+)/)?.[1] || '',
    url,
    title: 'Airbnb Listing (Extraction Failed)',
    subtitle: undefined,
    description: 'Unable to extract listing details. All scraping methods failed.',
    propertyType: 'Unknown',
    
    guestCapacity: {
      adults: 0,
      children: 0,
      infants: 0,
      total: 0
    },
    
    spaces: {
      bedrooms: 0,
      beds: 0,
      bathrooms: 0
    },
    
    host: {
      name: 'Unknown',
      isSuperhost: false
    },
    
    pricing: {
      basePrice: 0,
      currency: 'USD'
    },
    
    location: {
      city: 'Unknown',
      country: 'Unknown'
    },
    
    photos: [],
    
    amenities: {
      basic: []
    },
    
    reviews: {
      summary: {
        rating: 0,
        totalCount: 0,
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
    
    houseRules: {
      checkIn: {},
      checkOut: {},
      during: {}
    },
    
    bookingSettings: {},
    
    cancellationPolicy: {
      type: 'Unknown'
    },
    
    meta: {
      scrapedAt: new Date().toISOString(),
      scrapeVersion: 'fallback',
      dataCompleteness: 0,
      errors: metrics.filter(m => !m.success).map(m => `${m.method}: ${m.error}`)
    }
  }
}

// Convert comprehensive to simplified format
export function hybridToSimplified(result: HybridScrapingResult): AirbnbListingData {
  const listing = result.listing
  
  return {
    url: listing.url,
    title: listing.title,
    description: listing.description,
    price: listing.pricing.basePrice,
    rating: listing.reviews.summary.rating,
    reviewCount: listing.reviews.summary.totalCount,
    amenities: listing.amenities.basic || [],
    propertyType: listing.propertyType,
    hostName: listing.host.name,
    isSuperhost: listing.host.isSuperhost,
    location: `${listing.location.city}, ${listing.location.country}`,
    photos: listing.photos.length,
    
    subtitle: listing.subtitle,
    hostResponseRate: listing.host.responseRate,
    hostResponseTime: listing.host.responseTime,
    cleaningFee: listing.pricing.cleaningFee,
    serviceFee: listing.pricing.serviceFee,
    checkIn: listing.houseRules.checkIn.time,
    checkOut: listing.houseRules.checkOut.time,
    minimumStay: listing.bookingSettings.minimumStay,
    instantBook: listing.bookingSettings.instantBook,
    reviewCategories: listing.reviews.summary.categories,
    recentReviews: listing.reviews.recentReviews?.slice(0, 10),
    houseRules: {
      smoking: listing.houseRules.during.smoking || false,
      pets: listing.houseRules.during.pets || false,
      parties: listing.houseRules.during.parties || false
    },
    lastScraped: listing.meta.scrapedAt,
    dataQuality: listing.meta.dataCompleteness,
    
    // Add metrics from hybrid result
    scrapingMethod: result.bestMethod,
    scrapingTime: result.totalTime
  }
}