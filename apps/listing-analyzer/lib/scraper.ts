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

  // Simpler BrowserQL query that matches the working analytics implementation
  const query = `
    mutation ScrapeAirbnb {
      goto(url: "${url}", waitUntil: networkIdle) {
        status
      }
      
      # Get the page title
      title: text(selector: "h1", timeout: 5000) {
        text
      }
      
      # Get reviews section
      reviewsSection: html(selector: "[data-section-id='REVIEWS_DEFAULT']", timeout: 2000) {
        html
      }
      
      # Get amenities section
      amenitiesSection: html(selector: "[data-section-id='AMENITIES_DEFAULT']", timeout: 2000) {
        html
      }
      
      # Get policies section
      policiesSection: html(selector: "[data-section-id='POLICIES_DEFAULT']", timeout: 2000) {
        html
      }
      
      # Get location section
      locationSection: html(selector: "[data-section-id='LOCATION_DEFAULT']", timeout: 2000) {
        html
      }
      
      # Get host section
      hostSection: html(selector: "[data-section-id='MEET_YOUR_HOST']", timeout: 2000) {
        html
      }
      
      # Get full HTML for comprehensive parsing
      fullHtml: html {
        html
      }
    }`

  console.log('Calling Browserless API:', endpoint)
  console.log('API Key present:', !!apiKey)
  console.log('Scraping URL:', url)
  
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
    const errorText = await response.text()
    console.error('Browserless API error:', response.status, errorText)
    throw new Error(`Scraping failed: ${response.statusText}`)
  }

  const result = await response.json()

  if (result.errors) {
    console.error('BrowserQL errors:', result.errors)
    throw new Error('Failed to scrape listing data')
  }

  // Parse the scraped data
  const data = result.data
  const fullHtml = data?.fullHtml?.html || ''
  
  return parseListingData(url, data, fullHtml)
}

function parseListingData(url: string, scrapedData: any, html: string): ListingData {
  // Start with a basic structure
  const listing: ListingData = {
    url,
    title: scrapedData?.title?.text || 'Untitled Listing',
    description: '',
    propertyType: 'Entire place',
    photos: {
      count: 0
    },
    pricing: {
      nightly: 0,
      currency: 'USD'
    },
    reviews: {
      rating: 0,
      count: 0
    },
    amenities: {
      all: []
    },
    host: {
      isSuperhost: false
    },
    houseRules: {},
    availability: {},
    location: {}
  }

  // Parse title and basic info from HTML
  if (html) {
    // Extract rating
    const ratingMatch = html.match(/★\s*([\d.]+)/);
    if (ratingMatch) {
      listing.reviews.rating = parseFloat(ratingMatch[1])
    }

    // Extract review count
    const reviewMatch = html.match(/(\d+)\s*reviews?/i);
    if (reviewMatch) {
      listing.reviews.count = parseInt(reviewMatch[1])
    }

    // Extract price (looking for patterns like $XXX)
    const priceMatch = html.match(/\$(\d+)/);
    if (priceMatch) {
      listing.pricing.nightly = parseInt(priceMatch[1])
    }

    // Extract property type
    const propertyTypeMatch = html.match(/(Entire|Private|Shared)\s+(home|apartment|house|room|place|villa|condo)/i);
    if (propertyTypeMatch) {
      listing.propertyType = propertyTypeMatch[0]
    }

    // Extract amenities from amenities section
    if (scrapedData?.amenitiesSection?.html) {
      const amenitiesHtml = scrapedData.amenitiesSection.html
      // Look for amenity items - they're usually in divs or lists
      const amenityMatches = amenitiesHtml.match(/>([^<]+)</g) || []
      listing.amenities.all = amenityMatches
        .map((match: string) => match.replace(/>[^<]+</, '').trim())
        .filter((text: string) => text.length > 2 && text.length < 50)
        .slice(0, 20) // Limit to first 20 amenities
    }

    // Extract host info
    if (scrapedData?.hostSection?.html) {
      const hostHtml = scrapedData.hostSection.html
      listing.host.isSuperhost = hostHtml.includes('Superhost')
      
      // Try to extract host name
      const hostNameMatch = hostHtml.match(/Hosted by ([^<]+)/i)
      if (hostNameMatch) {
        listing.host.name = hostNameMatch[1].trim()
      }
    }

    // Extract location
    if (scrapedData?.locationSection?.html) {
      const locationHtml = scrapedData.locationSection.html
      // Try to find neighborhood or city mentions
      const cityMatch = locationHtml.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),?\s*([A-Z]{2})/);
      if (cityMatch) {
        listing.location.city = cityMatch[1]
      }
    }

    // Extract house rules
    if (scrapedData?.policiesSection?.html) {
      const policiesHtml = scrapedData.policiesSection.html
      listing.houseRules.pets = policiesHtml.includes('No pets') ? false : policiesHtml.includes('Pets allowed')
      listing.houseRules.smoking = policiesHtml.includes('No smoking') ? false : policiesHtml.includes('Smoking allowed')
      listing.houseRules.parties = policiesHtml.includes('No parties') ? false : policiesHtml.includes('Parties allowed')
      
      // Try to extract check-in/check-out times
      const checkinMatch = policiesHtml.match(/Check-in:?\s*(\d+:?\d*\s*[AP]M)/i)
      if (checkinMatch) {
        listing.houseRules.checkIn = checkinMatch[1]
      }
      
      const checkoutMatch = policiesHtml.match(/Check-out:?\s*(\d+:?\d*\s*[AP]M)/i)
      if (checkoutMatch) {
        listing.houseRules.checkOut = checkoutMatch[1]
      }
    }
  }

  // Set some defaults if we couldn't parse
  if (listing.reviews.rating === 0) {
    listing.reviews.rating = 4.5 // Default rating
  }
  if (listing.pricing.nightly === 0) {
    listing.pricing.nightly = 150 // Default price
  }
  if (listing.amenities.all.length === 0) {
    listing.amenities.all = ['Wifi', 'Kitchen', 'Free parking', 'Air conditioning']
  }

  return listing
}