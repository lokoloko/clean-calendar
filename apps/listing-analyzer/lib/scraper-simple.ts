// Simple Browserless scraper with proper JavaScript rendering
import { ComprehensiveAirbnbListing } from './types/listing'

export async function scrapeSimple(url: string): Promise<ComprehensiveAirbnbListing> {
  const apiKey = process.env.BROWSERLESS_API_KEY
  
  if (!apiKey) {
    throw new Error('Browserless API key not configured')
  }

  console.log('Scraping with Browserless /content (with JS rendering):', url)
  
  try {
    // Use content endpoint with proper JavaScript rendering options
    const response = await fetch(`https://production-sfo.browserless.io/content?token=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url,
        waitForTimeout: 5000
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Browserless failed:', response.status, errorText)
      throw new Error(`Browserless API failed: ${response.status}`)
    }

    const html = await response.text()
    console.log(`Received HTML: ${html.length} characters`)
    
    return parseHTML(html, url)
    
  } catch (error) {
    console.error('Scraping error:', error)
    return createMinimalListing(url)
  }
}

function parseHTML(html: string, url: string): ComprehensiveAirbnbListing {
  // First, try to extract JSON-LD structured data (often present in rendered pages)
  let structuredData: any = null
  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/i)
  if (jsonLdMatch) {
    try {
      structuredData = JSON.parse(jsonLdMatch[1])
      console.log('Found structured data:', structuredData['@type'])
    } catch (e) {
      // Ignore parse errors
    }
  }

  // Extract text content for pattern matching
  const text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                   .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
                   .replace(/<[^>]+>/g, ' ')
                   .replace(/\s+/g, ' ')
                   .trim()

  // Extract title - look for various patterns
  let title = 'Airbnb Listing'
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const metaTitleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i)
  
  if (h1Match) {
    title = h1Match[1].trim()
  } else if (metaTitleMatch) {
    title = metaTitleMatch[1].trim()
  } else if (titleMatch) {
    title = titleMatch[1].split('·')[0].split('-')[0].trim()
  }

  // Extract price - look for multiple patterns
  let price = 150
  
  // Try structured data first
  if (structuredData?.offers?.price) {
    price = parseInt(structuredData.offers.price)
  } else {
    // Look for price patterns in text
    const pricePatterns = [
      /\$(\d{2,4})\s*(?:per\s*)?night/i,
      /\$(\d{2,4})\s*\/\s*night/i,
      /\$(\d{2,4})\s+USD/i,
      /\$(\d{2,4})\s+before\s+taxes/i,
      /Total\s+before\s+taxes\s+\$(\d{2,4})/i,
      /From\s+\$(\d{2,4})/i
    ]
    
    for (const pattern of pricePatterns) {
      const match = text.match(pattern)
      if (match) {
        const extractedPrice = parseInt(match[1])
        if (extractedPrice > 30 && extractedPrice < 2000) {
          price = extractedPrice
          console.log(`Found price: $${price}`)
          break
        }
      }
    }
  }

  // Extract rating and reviews - look for common patterns
  let rating = null
  let reviewCount = 0
  
  // Try structured data
  if (structuredData?.aggregateRating) {
    rating = parseFloat(structuredData.aggregateRating.ratingValue)
    reviewCount = parseInt(structuredData.aggregateRating.reviewCount)
  } else {
    // Look for rating pattern like "4.95 · 123 reviews" or "4.95 (123)"
    const patterns = [
      /(\d\.\d{1,2})\s*[·★]\s*(\d+)\s*reviews?/i,
      /(\d\.\d{1,2})\s*\((\d+)\s*reviews?\)/i,
      /Rating:\s*(\d\.\d{1,2})[^\d]*(\d+)\s*reviews?/i,
      /★\s*(\d\.\d{1,2})[^\d]*(\d+)\s*reviews?/i
    ]
    
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) {
        rating = parseFloat(match[1])
        reviewCount = parseInt(match[2])
        console.log(`Found rating: ${rating} with ${reviewCount} reviews`)
        break
      }
    }
    
    // If not found together, try separately
    if (!rating) {
      const ratingMatch = text.match(/(\d\.\d{1,2})\s*(?:stars?|rating|★)/i)
      if (ratingMatch) rating = parseFloat(ratingMatch[1])
    }
    
    if (!reviewCount) {
      const reviewMatch = text.match(/(\d+)\s*reviews?/i)
      if (reviewMatch) reviewCount = parseInt(reviewMatch[1])
    }
  }

  // Extract property details
  const bedrooms = extractNumber(text, /(\d+)\s*(?:bedrooms?|BR)/i) || 1
  const beds = extractNumber(text, /(\d+)\s*beds?(?!room)/i) || 1
  const bathrooms = extractNumber(text, /(\d+)\s*(?:bathrooms?|baths?|BA)/i) || 1
  const guests = extractNumber(text, /(\d+)\s*guests?/i) || 2

  // Extract host info
  let hostName = 'Host'
  const hostMatch = text.match(/(?:Hosted|Listing)\s+by\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i)
  if (hostMatch) {
    hostName = hostMatch[1].trim()
  }

  const isSuperhost = /superhost/i.test(text)

  // Extract amenities
  const amenities = extractAmenities(text)

  // Extract location if possible
  let location = 'See listing'
  const locationMatch = text.match(/([A-Za-z\s]+),\s*([A-Za-z\s]+),\s*([A-Za-z\s]+)/i)
  if (locationMatch) {
    location = `${locationMatch[1]}, ${locationMatch[2]}`
  }

  console.log(`Extracted: price=$${price}, rating=${rating}, reviews=${reviewCount}, amenities=${amenities.length}, ${bedrooms}BR`)

  return {
    id: url.match(/rooms\/(\d+)/)?.[1] || '',
    url,
    title: cleanText(title),
    subtitle: undefined,
    description: structuredData?.description || 'See full listing for details',
    propertyType: structuredData?.['@type'] === 'LodgingBusiness' ? 'Entire place' : 'Room',
    
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
      basePrice: price,
      currency: 'USD',
      cleaningFee: Math.round(price * 0.15),
      serviceFee: Math.round(price * 0.14)
    },
    
    location: {
      city: location.split(',')[0] || 'See listing',
      country: location.split(',')[1]?.trim() || 'See listing'
    },
    
    photos: [],
    
    amenities: {
      basic: amenities
    },
    
    reviews: {
      summary: {
        rating: rating || 4.5,
        totalCount: reviewCount,
        distribution: { 5: 70, 4: 20, 3: 5, 2: 3, 1: 2 },
        categories: {
          cleanliness: rating ? Math.max(rating - 0.1, 0) : 4.4,
          accuracy: rating || 4.5,
          communication: rating ? Math.min(rating + 0.1, 5) : 4.6,
          location: rating || 4.5,
          checkIn: rating || 4.5,
          value: rating ? Math.max(rating - 0.2, 0) : 4.3
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
      scrapeVersion: 'simple-v2',
      dataCompleteness: calculateCompleteness({ price, rating, reviewCount, amenities: amenities.length })
    }
  }
}

function extractNumber(text: string, pattern: RegExp): number | null {
  const match = text.match(pattern)
  if (match) {
    const num = parseInt(match[1])
    if (num > 0 && num < 100) return num
  }
  return null
}

function extractAmenities(text: string): string[] {
  const found: string[] = []
  const amenityList = [
    'Wifi', 'Wi-Fi', 'Internet', 'Kitchen', 'Free parking', 'Parking', 
    'Washer', 'Dryer', 'Air conditioning', 'Heating', 'TV', 'Cable TV',
    'Pool', 'Hot tub', 'Gym', 'Fitness center', 'Workspace', 'Dedicated workspace',
    'Coffee maker', 'Dishwasher', 'Microwave', 'Refrigerator', 'Oven', 'Stove',
    'Hair dryer', 'Iron', 'Hangers', 'Shampoo', 'Hot water', 'Towels',
    'Essentials', 'Smoke alarm', 'Carbon monoxide alarm', 'Fire extinguisher',
    'First aid kit', 'Lock on bedroom door', 'Safe', 'Security cameras',
    'Elevator', 'Wheelchair accessible', 'Crib', 'High chair', 'Pack \'n play',
    'Balcony', 'Patio', 'Garden', 'Beach access', 'Lake access', 'Ski-in/ski-out',
    'BBQ grill', 'Outdoor dining', 'Fire pit', 'Indoor fireplace'
  ]
  
  const lowerText = text.toLowerCase()
  for (const amenity of amenityList) {
    if (lowerText.includes(amenity.toLowerCase())) {
      // Normalize the amenity name
      const normalized = amenity.replace(/\s+/g, ' ').trim()
      if (!found.includes(normalized)) {
        found.push(normalized)
      }
    }
  }
  
  return found
}

function cleanText(text: string): string {
  return text
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num)))
}

function calculateCompleteness(data: any): number {
  let score = 0
  if (data.price && data.price !== 150) score += 25
  if (data.rating) score += 25
  if (data.reviewCount > 0) score += 25
  if (data.amenities > 5) score += 25
  return score
}

function createMinimalListing(url: string): ComprehensiveAirbnbListing {
  return {
    id: url.match(/rooms\/(\d+)/)?.[1] || '',
    url,
    title: 'Airbnb Listing',
    subtitle: undefined,
    description: 'Unable to load listing details',
    propertyType: 'Place',
    
    guestCapacity: {
      adults: 2,
      children: 0,
      infants: 0,
      total: 2
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
      scrapeVersion: 'simple-v2',
      dataCompleteness: 0
    }
  }
}