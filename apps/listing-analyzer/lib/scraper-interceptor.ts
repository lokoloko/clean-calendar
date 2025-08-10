// Enhanced Puppeteer scraper with request interception for API data capture
import puppeteer from 'puppeteer-core'
import { ComprehensiveAirbnbListing, AirbnbListingData } from './types/listing'
import { dismissTranslationModal, waitForContentLoad } from './modal-handler'

interface InterceptedApiData {
  pricing?: any
  reviews?: any
  amenities?: any
  hostInfo?: any
  availability?: any
  pdpSections?: any
}

export async function scrapeAirbnbWithInterception(url: string): Promise<ComprehensiveAirbnbListing> {
  const apiKey = process.env.BROWSERLESS_API_KEY
  
  if (!apiKey) {
    throw new Error('Browserless API key not configured')
  }

  // Configure with stealth and performance optimizations
  const launchArgs = {
    stealth: true,
    headless: false,
    blockAds: true,
    args: [
      '--window-size=1920,1080',
      '--lang=en-US',
      '--disable-blink-features=AutomationControlled',
      '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ]
  }

  const browser = await puppeteer.connect({
    browserWSEndpoint: `wss://production-sfo.browserless.io?token=${apiKey}&launch=${encodeURIComponent(JSON.stringify(launchArgs))}`
  })

  try {
    console.log('Starting interceptor scrape with API capture:', url)
    
    const page = await browser.newPage()
    await page.setViewport({ width: 1920, height: 1080 })
    
    // Collected API data
    const interceptedData: InterceptedApiData = {}
    
    // Enable request interception
    await page.setRequestInterception(true)
    
    // Track API responses
    const apiResponses: Map<string, any> = new Map()
    
    // Intercept requests
    page.on('request', (request) => {
      const url = request.url()
      const resourceType = request.resourceType()
      
      // Block unnecessary resources for speed
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        request.abort()
        return
      }
      
      // Log API requests we're interested in
      if (url.includes('/api/v3/') || url.includes('graphql')) {
        console.log('API Request:', request.method(), url.substring(0, 100))
      }
      
      request.continue()
    })
    
    // Capture API responses
    page.on('response', async (response) => {
      const url = response.url()
      const status = response.status()
      
      // Only process successful API responses
      if (status !== 200) return
      
      try {
        // Capture Airbnb API responses
        if (url.includes('/api/v3/PdpPlatformSections')) {
          console.log('Captured PDP Platform Sections API')
          const data = await response.json()
          interceptedData.pdpSections = data
          apiResponses.set('pdpSections', data)
        }
        
        if (url.includes('/api/v3/StaysSearch')) {
          console.log('Captured Stays Search API (pricing)')
          const data = await response.json()
          interceptedData.pricing = data
          apiResponses.set('pricing', data)
        }
        
        if (url.includes('/api/v3/Reviews')) {
          console.log('Captured Reviews API')
          const data = await response.json()
          interceptedData.reviews = data
          apiResponses.set('reviews', data)
        }
        
        if (url.includes('/api/v3/HostProfile')) {
          console.log('Captured Host Profile API')
          const data = await response.json()
          interceptedData.hostInfo = data
          apiResponses.set('hostInfo', data)
        }
        
        if (url.includes('graphql') && url.includes('StaysPdp')) {
          console.log('Captured GraphQL StaysPdp query')
          const data = await response.json()
          apiResponses.set('graphql', data)
        }
        
        if (url.includes('/api/v3/PdpAvailabilityCalendar')) {
          console.log('Captured Availability Calendar API')
          const data = await response.json()
          interceptedData.availability = data
          apiResponses.set('availability', data)
        }
      } catch (e) {
        // Some responses might not be JSON
      }
    })
    
    // Navigate to the listing
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    })
    
    // Wait for content and dismiss modals
    await waitForContentLoad(page)
    
    // Additional wait to capture more API calls
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    // Now extract data using optimized page.evaluate (single call)
    const pageData = await page.evaluate(() => {
      // Helper functions
      const getText = (selector: string): string | null => {
        const el = document.querySelector(selector)
        return el ? el.textContent?.trim() || null : null
      }
      
      const getAllTexts = (selector: string): string[] => {
        return Array.from(document.querySelectorAll(selector))
          .map(el => el.textContent?.trim() || '')
          .filter(Boolean)
      }
      
      const extractPrice = (): number | null => {
        // Try multiple strategies for price extraction
        const priceSelectors = [
          'span._tyxjp1',
          'span._1y74zjx',
          'div._1jo4hgw',
          'span[aria-label*="price"]',
          '[data-testid="price"] span'
        ]
        
        for (const selector of priceSelectors) {
          const el = document.querySelector(selector)
          if (el) {
            const text = el.textContent || ''
            const match = text.match(/\$(\d+(?:,\d{3})*)/)
            if (match) return parseInt(match[1].replace(/,/g, ''))
          }
        }
        
        // Fallback: search all spans
        const spans = document.querySelectorAll('span')
        for (const span of spans) {
          const text = span.textContent || ''
          if (text.includes('$') && text.includes('night')) {
            const match = text.match(/\$(\d+(?:,\d{3})*)/)
            if (match) return parseInt(match[1].replace(/,/g, ''))
          }
        }
        
        return null
      }
      
      const extractRating = (): { rating: number | null; reviewCount: number | null } => {
        let rating = null
        let reviewCount = null
        
        const ratingSelectors = [
          '[aria-label*="rating"]',
          'button[aria-label*="review"]',
          'span._17p6nbba',
          '[data-testid="reviews-summary"]'
        ]
        
        for (const selector of ratingSelectors) {
          const el = document.querySelector(selector)
          if (el) {
            const ariaLabel = el.getAttribute('aria-label') || ''
            const text = el.textContent || ''
            const fullText = `${ariaLabel} ${text}`
            
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
        
        return { rating, reviewCount }
      }
      
      const extractPropertyDetails = () => {
        let guests = 4, bedrooms = 1, beds = 1, bathrooms = 1
        
        const propertyInfo = Array.from(document.querySelectorAll('div'))
          .find(div => div.textContent?.includes('guest') && div.textContent?.includes('bedroom'))
        
        if (propertyInfo) {
          const text = propertyInfo.textContent || ''
          const guestMatch = text.match(/(\d+)\s*guest/i)
          const bedroomMatch = text.match(/(\d+)\s*bedroom/i)
          const bedMatch = text.match(/(\d+)\s*bed(?!room)/i)
          const bathMatch = text.match(/(\d+)\s*bath/i)
          
          if (guestMatch) guests = parseInt(guestMatch[1])
          if (bedroomMatch) bedrooms = parseInt(bedroomMatch[1])
          if (bedMatch) beds = parseInt(bedMatch[1])
          if (bathMatch) bathrooms = parseInt(bathMatch[1])
        }
        
        return { guests, bedrooms, beds, bathrooms }
      }
      
      const extractHost = () => {
        let hostName = 'Host'
        let isSuperhost = false
        
        // Find host section
        const hostSection = Array.from(document.querySelectorAll('div'))
          .find(div => div.textContent?.includes('Hosted by'))
        
        if (hostSection) {
          const text = hostSection.textContent || ''
          const nameMatch = text.match(/Hosted by\s+([A-Za-z\s]+?)(?:\.|,|$|\n|Superhost)/i)
          if (nameMatch) hostName = nameMatch[1].trim()
          if (text.includes('Superhost')) isSuperhost = true
        }
        
        // Check for Superhost badge
        if (document.querySelector('[data-testid="superhost-badge"]')) {
          isSuperhost = true
        }
        
        return { hostName, isSuperhost }
      }
      
      const extractAmenities = (): string[] => {
        const amenities: string[] = []
        
        // Get amenities from page
        const amenityElements = document.querySelectorAll('[id*="amenity"], div[data-section-id="AMENITIES"] button')
        amenityElements.forEach(el => {
          const text = el.textContent?.trim()
          if (text && text.length > 2 && text.length < 100 && !text.includes('Show all')) {
            amenities.push(text)
          }
        })
        
        return amenities
      }
      
      const extractPhotos = () => {
        const photos: any[] = []
        const imgs = document.querySelectorAll('img[data-original-uri], img[src*="airbnb"]')
        
        imgs.forEach((img: any) => {
          const src = img.src || img.getAttribute('data-original-uri')
          if (src && !src.includes('profile') && !src.includes('user')) {
            photos.push({
              url: src,
              alt: img.alt || ''
            })
          }
        })
        
        return photos
      }
      
      const extractReviews = () => {
        const reviews: any[] = []
        const reviewElements = document.querySelectorAll('[data-testid*="review"], [aria-label*="review"]')
        
        reviewElements.forEach(el => {
          const text = el.textContent || ''
          
          // Extract author
          const h3 = el.querySelector('h3')
          const author = h3 ? h3.textContent?.trim() || 'Guest' : 'Guest'
          
          // Extract date
          const dateMatch = text.match(/(\w+\s+\d{4}|\d+\s+(day|week|month|year)s?\s+ago)/i)
          const date = dateMatch ? dateMatch[0] : ''
          
          // Extract review text
          const reviewText = text
            .replace(author, '')
            .replace(date, '')
            .replace(/Show (more|less)/gi, '')
            .trim()
          
          if (reviewText.length > 50) {
            reviews.push({ author, date, text: reviewText.substring(0, 500) })
          }
        })
        
        return reviews
      }
      
      const extractReviewCategories = () => {
        const categories: Record<string, number> = {}
        const categoryNames = ['Cleanliness', 'Accuracy', 'Communication', 'Location', 'Check-in', 'Value']
        
        categoryNames.forEach(cat => {
          const elements = Array.from(document.querySelectorAll('div'))
            .filter(div => div.textContent?.includes(cat))
          
          for (const el of elements) {
            const text = el.textContent || ''
            const match = text.match(new RegExp(`${cat}[^\\d]*(\\d+\\.?\\d*)`))
            if (match) {
              categories[cat.toLowerCase().replace('-', '')] = parseFloat(match[1])
              break
            }
          }
        })
        
        return categories
      }
      
      const extractHouseRules = () => {
        let checkIn = '', checkOut = ''
        let noSmoking = false, noPets = false, noParties = false
        
        const allDivs = document.querySelectorAll('div')
        allDivs.forEach(div => {
          const text = div.textContent || ''
          
          if (text.includes('Check-in') && !checkIn) {
            const timeMatch = text.match(/(\d{1,2}:\d{2}\s*[AP]M|\d{1,2}\s*[AP]M)/i)
            if (timeMatch) checkIn = timeMatch[1]
          }
          
          if (text.includes('Checkout') && !checkOut) {
            const timeMatch = text.match(/(\d{1,2}:\d{2}\s*[AP]M|\d{1,2}\s*[AP]M)/i)
            if (timeMatch) checkOut = timeMatch[1]
          }
          
          if (text.includes('No smoking')) noSmoking = true
          if (text.includes('No pets')) noPets = true
          if (text.includes('No parties')) noParties = true
        })
        
        return { checkIn, checkOut, noSmoking, noPets, noParties }
      }
      
      // Extract all data in one go
      const title = getText('h1') || 'Airbnb Listing'
      const subtitle = getText('h2')
      const descriptionEl = document.querySelector('[data-section-id="DESCRIPTION"]')
      const description = descriptionEl ? descriptionEl.textContent?.trim() || '' : ''
      
      const price = extractPrice()
      const { rating, reviewCount } = extractRating()
      const { guests, bedrooms, beds, bathrooms } = extractPropertyDetails()
      const { hostName, isSuperhost } = extractHost()
      const amenities = extractAmenities()
      const photos = extractPhotos()
      const reviews = extractReviews()
      const reviewCategories = extractReviewCategories()
      const { checkIn, checkOut, noSmoking, noPets, noParties } = extractHouseRules()
      
      return {
        title,
        subtitle,
        description,
        price,
        rating,
        reviewCount,
        guests,
        bedrooms,
        beds,
        bathrooms,
        hostName,
        isSuperhost,
        amenities,
        photos,
        reviews,
        reviewCategories,
        checkIn,
        checkOut,
        houseRules: { noSmoking, noPets, noParties }
      }
    })
    
    console.log('Page extraction complete')
    console.log('Intercepted API responses:', Array.from(apiResponses.keys()))
    
    // Merge intercepted API data with page data
    const mergedData = mergeDataSources(pageData, interceptedData, apiResponses)
    
    await page.close()
    
    return buildComprehensiveListing(url, mergedData)
  } catch (error) {
    console.error('Interceptor scraping error:', error)
    throw error
  } finally {
    await browser.close()
  }
}

function mergeDataSources(pageData: any, interceptedData: InterceptedApiData, apiResponses: Map<string, any>): any {
  const merged = { ...pageData }
  
  // Extract from PDP sections if available
  if (interceptedData.pdpSections) {
    try {
      const sections = interceptedData.pdpSections.data?.presentation?.stayProductDetailPage?.sections
      if (sections) {
        // Extract from sections
        sections.forEach((section: any) => {
          if (section.__typename === 'PdpOverviewSection') {
            // Extract overview data
            if (section.title) merged.title = section.title
            if (section.subtitle) merged.subtitle = section.subtitle
          }
          
          if (section.__typename === 'PdpAmenitiesSection') {
            // Extract amenities
            const amenitiesFromApi = section.amenities?.map((a: any) => a.title) || []
            merged.amenities = [...new Set([...merged.amenities, ...amenitiesFromApi])]
          }
          
          if (section.__typename === 'PdpReviewsSection') {
            // Extract reviews
            if (section.reviews?.totalCount) merged.reviewCount = section.reviews.totalCount
            if (section.reviews?.averageRating) merged.rating = section.reviews.averageRating
          }
        })
      }
    } catch (e) {
      console.log('Error parsing PDP sections:', e)
    }
  }
  
  // Extract from pricing API
  if (interceptedData.pricing) {
    try {
      const pricing = interceptedData.pricing.data?.pricing
      if (pricing) {
        if (pricing.basePrice) merged.price = pricing.basePrice
        if (pricing.cleaningFee) merged.cleaningFee = pricing.cleaningFee
        if (pricing.serviceFee) merged.serviceFee = pricing.serviceFee
      }
    } catch (e) {
      console.log('Error parsing pricing:', e)
    }
  }
  
  // Extract from reviews API
  if (interceptedData.reviews) {
    try {
      const reviewsData = interceptedData.reviews.data?.reviews
      if (reviewsData) {
        if (reviewsData.items) {
          merged.reviews = reviewsData.items.map((r: any) => ({
            author: r.reviewer?.firstName || 'Guest',
            date: r.createdAt,
            text: r.comments
          }))
        }
        if (reviewsData.totalCount) merged.reviewCount = reviewsData.totalCount
      }
    } catch (e) {
      console.log('Error parsing reviews:', e)
    }
  }
  
  // Extract from host API
  if (interceptedData.hostInfo) {
    try {
      const host = interceptedData.hostInfo.data?.host
      if (host) {
        if (host.name) merged.hostName = host.name
        if (host.isSuperhost !== undefined) merged.isSuperhost = host.isSuperhost
        if (host.responseRate) merged.hostResponseRate = host.responseRate
        if (host.responseTime) merged.hostResponseTime = host.responseTime
      }
    } catch (e) {
      console.log('Error parsing host info:', e)
    }
  }
  
  // Extract from GraphQL response
  const graphqlData = apiResponses.get('graphql')
  if (graphqlData) {
    try {
      const data = graphqlData.data?.presentation?.stayProductDetailPage
      if (data) {
        // Extract additional details from GraphQL
        if (data.listingTitle) merged.title = data.listingTitle
        if (data.listingSubtitle) merged.subtitle = data.listingSubtitle
      }
    } catch (e) {
      console.log('Error parsing GraphQL:', e)
    }
  }
  
  console.log('Data merge complete:', {
    hasApiData: Object.keys(interceptedData).length > 0,
    amenitiesCount: merged.amenities?.length || 0,
    reviewsCount: merged.reviews?.length || 0,
    price: merged.price,
    rating: merged.rating
  })
  
  return merged
}

function buildComprehensiveListing(url: string, data: any): ComprehensiveAirbnbListing {
  return {
    id: extractListingId(url),
    url,
    title: data.title || 'Airbnb Listing',
    subtitle: data.subtitle,
    description: data.description || '',
    propertyType: 'Entire place',
    
    guestCapacity: {
      adults: data.guests || 4,
      children: 0,
      infants: 0,
      total: data.guests || 4
    },
    
    spaces: {
      bedrooms: data.bedrooms || 1,
      beds: data.beds || 1,
      bathrooms: data.bathrooms || 1
    },
    
    host: {
      name: data.hostName || 'Host',
      isSuperhost: data.isSuperhost || false,
      responseRate: data.hostResponseRate,
      responseTime: data.hostResponseTime
    },
    
    pricing: {
      basePrice: data.price || 150,
      currency: 'USD',
      cleaningFee: data.cleaningFee,
      serviceFee: data.serviceFee
    },
    
    location: {
      city: 'Unknown',
      country: 'USA'
    },
    
    photos: data.photos || [],
    
    amenities: {
      basic: data.amenities || []
    },
    
    reviews: {
      summary: {
        rating: data.rating || 4.5,
        totalCount: data.reviewCount || 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        categories: data.reviewCategories || {}
      },
      recentReviews: data.reviews || []
    },
    
    houseRules: {
      checkIn: {
        time: data.checkIn
      },
      checkOut: {
        time: data.checkOut
      },
      during: {
        smoking: !data.houseRules?.noSmoking,
        pets: !data.houseRules?.noPets,
        parties: !data.houseRules?.noParties
      }
    },
    
    bookingSettings: {
      minimumStay: data.minimumStay,
      instantBook: data.instantBook
    },
    
    cancellationPolicy: {
      type: 'Standard'
    },
    
    meta: {
      scrapedAt: new Date().toISOString(),
      scrapeVersion: '5.0-interceptor',
      dataCompleteness: calculateCompleteness(data)
    }
  }
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