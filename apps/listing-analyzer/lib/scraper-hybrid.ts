// Hybrid scraper - uses vision-based extraction with fallback to simple HTML
import { ComprehensiveAirbnbListing, AirbnbListingData } from './types/listing'
import { scrapeWithVision } from './scraper-vision'
import { scrapeWithWorkingFunction } from './scraper-working-function'
import { scrapeSimple } from './scraper-simple'

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

export async function scrapeAirbnbHybrid(url: string): Promise<HybridScrapingResult> {
  const startTime = Date.now()
  const metrics: ScrapingMetrics[] = []
  
  console.log('🚀 Starting hybrid scraping for:', url)
  
  // Skip vision-based scraping for now (it's timing out)
  const skipVision = true
  
  if (!skipVision) {
    // Try vision-based scraping first
    try {
      console.log('📸 Attempting vision-based extraction...')
      const visionStart = Date.now()
      const listing = await scrapeWithVision(url)
      const visionEnd = Date.now()
    
    const dataQuality = listing.meta?.dataCompleteness || 0
    const fieldsExtracted = countExtractedFields(listing)
    
    metrics.push({
      method: 'vision',
      attemptNumber: 1,
      startTime: visionStart,
      endTime: visionEnd,
      success: true,
      dataQuality,
      fieldsExtracted
    })
    
    console.log(`✅ Vision scraper succeeded: Quality=${dataQuality}%, Fields=${fieldsExtracted}, Time=${visionEnd - visionStart}ms`)
    
    // If we got good data, return it
    if (dataQuality >= 30) {
      return {
        listing,
        metrics,
        bestMethod: 'vision',
        totalTime: visionEnd - startTime
      }
    }
    
      console.log(`⚠️ Vision quality too low (${dataQuality}%), trying hybrid function approach...`)
      
    } catch (visionError: any) {
      console.log(`⚠️ Vision scraping failed: ${visionError.message}`)
      
      metrics.push({
        method: 'vision',
        attemptNumber: 1,
        startTime,
        endTime: Date.now(),
        success: false,
        dataQuality: 0,
        fieldsExtracted: 0,
        error: visionError.message
      })
    }
  }
  
  // Try working function approach (modals + screenshots)
  try {
    console.log('🔄 Attempting working function extraction...')
    const hybridStart = Date.now()
    const listing = await scrapeWithWorkingFunction(url)
    const hybridEnd = Date.now()
    
    const dataQuality = listing.meta?.dataCompleteness || 0
    const fieldsExtracted = countExtractedFields(listing)
    
    metrics.push({
      method: 'working-function',
      attemptNumber: 1,
      startTime: hybridStart,
      endTime: hybridEnd,
      success: true,
      dataQuality,
      fieldsExtracted
    })
    
    console.log(`✅ Working function succeeded: Quality=${dataQuality}%, Fields=${fieldsExtracted}, Time=${hybridEnd - hybridStart}ms`)
    
    // Return this if it's better than previous attempts
    return {
      listing,
      metrics,
      bestMethod: 'working-function',
      totalTime: hybridEnd - startTime
    }
    
  } catch (hybridError: any) {
    console.log(`⚠️ Working function failed: ${hybridError.message}`)
    
    metrics.push({
      method: 'working-function',
      attemptNumber: 1,
      startTime: Date.now() - 1000,
      endTime: Date.now(),
      success: false,
      dataQuality: 0,
      fieldsExtracted: 0,
      error: hybridError.message
    })
  }
  
  // Fall back to simple HTML scraping
  try {
    console.log('📄 Falling back to HTML extraction...')
    const simpleStart = Date.now()
    const listing = await scrapeSimple(url)
    const simpleEnd = Date.now()
    
    const dataQuality = listing.meta?.dataCompleteness || 0
    const fieldsExtracted = countExtractedFields(listing)
    
    metrics.push({
      method: 'simple',
      attemptNumber: 1,
      startTime: simpleStart,
      endTime: simpleEnd,
      success: true,
      dataQuality,
      fieldsExtracted
    })
    
    console.log(`✅ Simple scraper succeeded: Quality=${dataQuality}%, Fields=${fieldsExtracted}, Time=${simpleEnd - simpleStart}ms`)
    
    return {
      listing,
      metrics,
      bestMethod: 'simple',
      totalTime: simpleEnd - startTime
    }
    
  } catch (simpleError: any) {
    console.log(`❌ All scraping methods failed`)
    
    metrics.push({
      method: 'simple',
      attemptNumber: 1,
      startTime: Date.now() - 1000,
      endTime: Date.now(),
      success: false,
      dataQuality: 0,
      fieldsExtracted: 0,
      error: simpleError.message
    })
    
    // Return minimal listing on complete failure
    const fallbackListing = createFallbackListing(url)
    
    return {
      listing: fallbackListing,
      metrics,
      bestMethod: 'fallback',
      totalTime: Date.now() - startTime
    }
  }
}

function countExtractedFields(listing: ComprehensiveAirbnbListing): number {
  let count = 0
  
  if (listing.title && listing.title !== 'Airbnb Listing') count++
  if (listing.pricing.basePrice && listing.pricing.basePrice !== 150) count++
  if (listing.reviews.summary.rating && listing.reviews.summary.rating !== 4.5) count++
  if (listing.reviews.summary.totalCount > 0) count++
  if (listing.amenities.basic && listing.amenities.basic.length > 0) count += listing.amenities.basic.length
  if (listing.host.name && listing.host.name !== 'Host') count++
  if (listing.host.isSuperhost) count++
  if (listing.spaces.bedrooms > 0) count++
  if (listing.spaces.beds > 0) count++
  if (listing.spaces.bathrooms > 0) count++
  
  return count
}

function createFallbackListing(url: string): ComprehensiveAirbnbListing {
  return {
    id: url.match(/rooms\/(\d+)/)?.[1] || '',
    url,
    title: 'Airbnb Listing (Unable to Load)',
    subtitle: undefined,
    description: 'Unable to extract listing details.',
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
      errors: ['All scraping methods failed']
    }
  }
}

// Convert comprehensive to simplified format (for backward compatibility)
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