// BrowserQL implementation for Browserless.io
// Documentation: https://docs.browserless.io/browserql/start

export interface AirbnbListingData {
  url: string
  title: string
  description: string
  price: number
  rating: number
  reviewCount: number
  amenities: string[]
  propertyType: string
  hostName?: string
  isSuperhost: boolean
  location?: string
  photos: number
}

export async function scrapeAirbnbListing(url: string): Promise<AirbnbListingData> {
  const apiKey = process.env.BROWSERLESS_API_KEY
  
  if (!apiKey) {
    throw new Error('Browserless API key not configured')
  }

  // Use the BrowserQL endpoint
  const endpoint = `https://production-sfo.browserless.io/graphql?token=${apiKey}`
  
  // BrowserQL mutation to scrape Airbnb listing
  const query = `
    mutation ScrapeAirbnb {
      goto(url: "${url}", waitUntil: "networkidle2") {
        status
        url
      }
      
      wait(selector: "h1", timeout: 10000)
      
      # Get title
      title: text(selector: "h1") {
        text
      }
      
      # Get rating if present
      rating: text(selector: "[aria-label*='rating']", timeout: 1000) {
        text
      }
      
      # Get review count
      reviews: text(selector: "button[aria-label*='review'], span:has-text('review')", timeout: 1000) {
        text
      }
      
      # Get price
      price: text(selector: "span:has-text('$'), div[aria-label*='price']", timeout: 1000) {
        text
      }
      
      # Get property type
      propertyType: text(selector: "div:has-text('Entire'), div:has-text('Private'), div:has-text('Shared')", timeout: 1000) {
        text
      }
      
      # Get host information
      host: text(selector: "div:has-text('Hosted by')", timeout: 1000) {
        text
      }
      
      # Get location
      location: text(selector: "span[aria-label*='location'], div:has-text(', ')", timeout: 1000) {
        text
      }
      
      # Count photos
      photos: count(selector: "img[aria-label*='photo'], picture img")
      
      # Get all amenities
      amenitiesElements: queryAll(selector: "[id*='amenity'], div:has-text('What this place offers') ~ div button") {
        text
      }
      
      # Check for Superhost badge
      superhostBadge: exists(selector: "div:has-text('Superhost'), span:has-text('Superhost')")
      
      # Get the full page HTML for additional parsing
      fullHtml: html {
        html
      }
    }
  `

  try {
    console.log('Scraping Airbnb listing with BrowserQL:', url)
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
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
      throw new Error(`Scraping failed: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    
    if (result.errors && result.errors.length > 0) {
      console.error('BrowserQL errors:', result.errors)
      // Continue with partial data if some fields failed
    }

    const data = result.data || {}
    return parseScrapedData(url, data)
    
  } catch (error) {
    console.error('Scraping error:', error)
    throw error
  }
}

function parseScrapedData(url: string, data: any): AirbnbListingData {
  const listing: AirbnbListingData = {
    url,
    title: '',
    description: '',
    price: 0,
    rating: 0,
    reviewCount: 0,
    amenities: [],
    propertyType: 'Entire place',
    hostName: undefined,
    isSuperhost: false,
    location: undefined,
    photos: 0
  }

  // Parse title
  if (data.title?.text) {
    listing.title = data.title.text.trim()
  }

  // Parse rating
  if (data.rating?.text) {
    const ratingMatch = data.rating.text.match(/(\d+\.?\d*)/);
    if (ratingMatch) {
      listing.rating = parseFloat(ratingMatch[1])
    }
  }

  // Parse review count
  if (data.reviews?.text) {
    const reviewMatch = data.reviews.text.match(/(\d+)/);
    if (reviewMatch) {
      listing.reviewCount = parseInt(reviewMatch[1])
    }
  }

  // Parse price
  if (data.price?.text) {
    const priceMatch = data.price.text.match(/\$(\d+)/);
    if (priceMatch) {
      listing.price = parseInt(priceMatch[1])
    }
  }

  // Parse property type
  if (data.propertyType?.text) {
    listing.propertyType = data.propertyType.text.trim()
  }

  // Parse host info
  if (data.host?.text) {
    const hostMatch = data.host.text.match(/Hosted by (.+)/i);
    if (hostMatch) {
      listing.hostName = hostMatch[1].trim()
    }
  }

  // Parse location
  if (data.location?.text) {
    listing.location = data.location.text.trim()
  }

  // Set Superhost status
  listing.isSuperhost = data.superhostBadge === true

  // Parse amenities
  if (data.amenitiesElements && Array.isArray(data.amenitiesElements)) {
    listing.amenities = data.amenitiesElements
      .map((item: any) => item.text)
      .filter((text: string) => text && text.length > 0)
  }

  // Set photo count
  listing.photos = data.photos || 0

  // If we have the full HTML, try to extract more data
  if (data.fullHtml?.html) {
    const html = data.fullHtml.html
    
    // If we didn't get title from selector, try from HTML
    if (!listing.title) {
      const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
      if (titleMatch) {
        listing.title = titleMatch[1].trim()
      }
    }

    // If we didn't get price, try various patterns
    if (listing.price === 0) {
      const pricePatterns = [
        /\$(\d+)\s*(?:\/?\s*night)?/i,
        /\$(\d+)\s*USD/i,
        /"price":.*?"amount":(\d+)/,
        /"basePrice":(\d+)/
      ]
      
      for (const pattern of pricePatterns) {
        const match = html.match(pattern)
        if (match) {
          listing.price = parseInt(match[1])
          break
        }
      }
    }

    // If we didn't get rating, try from HTML
    if (listing.rating === 0) {
      const ratingPatterns = [
        /★\s*(\d+\.?\d*)/,
        /"starRating":(\d+\.?\d*)/,
        /"rating":(\d+\.?\d*)/,
        /(\d+\.?\d*)\s*★/
      ]
      
      for (const pattern of ratingPatterns) {
        const match = html.match(pattern)
        if (match) {
          listing.rating = parseFloat(match[1])
          if (listing.rating > 0 && listing.rating <= 5) {
            break
          }
        }
      }
    }

    // If we didn't get review count, try from HTML
    if (listing.reviewCount === 0) {
      const reviewPatterns = [
        /(\d+)\s*reviews?/i,
        /"reviewsCount":(\d+)/,
        /\((\d+)\)\s*·/
      ]
      
      for (const pattern of reviewPatterns) {
        const match = html.match(pattern)
        if (match) {
          listing.reviewCount = parseInt(match[1])
          break
        }
      }
    }

    // Extract more amenities if we didn't get many
    if (listing.amenities.length < 5) {
      const commonAmenities = [
        'Wifi', 'Kitchen', 'Free parking', 'Air conditioning',
        'Washer', 'Dryer', 'Pool', 'Hot tub', 'Gym',
        'Workspace', 'TV', 'Coffee maker', 'Hair dryer',
        'Iron', 'Heating', 'Smoke alarm', 'Carbon monoxide alarm'
      ]
      
      const htmlLower = html.toLowerCase()
      const foundAmenities = commonAmenities.filter(amenity => 
        htmlLower.includes(amenity.toLowerCase())
      )
      
      if (foundAmenities.length > listing.amenities.length) {
        listing.amenities = foundAmenities
      }
    }

    // Check for Superhost if not already found
    if (!listing.isSuperhost) {
      listing.isSuperhost = html.toLowerCase().includes('superhost')
    }
  }

  // Generate a description based on what we found
  listing.description = generateDescription(listing)

  // Validate we have minimum required data
  if (!listing.title || listing.title === '') {
    throw new Error('Failed to extract listing title')
  }

  return listing
}

function generateDescription(listing: AirbnbListingData): string {
  const parts = []
  
  if (listing.propertyType) {
    parts.push(`${listing.propertyType} available for rent`)
  }
  
  if (listing.location) {
    parts.push(`located in ${listing.location}`)
  }
  
  if (listing.isSuperhost && listing.hostName) {
    parts.push(`hosted by Superhost ${listing.hostName}`)
  } else if (listing.hostName) {
    parts.push(`hosted by ${listing.hostName}`)
  }
  
  if (listing.rating > 0 && listing.reviewCount > 0) {
    parts.push(`with a ${listing.rating} star rating from ${listing.reviewCount} reviews`)
  }
  
  if (listing.amenities.length > 0) {
    const topAmenities = listing.amenities.slice(0, 5).join(', ')
    parts.push(`featuring ${topAmenities}`)
  }
  
  if (listing.price > 0) {
    parts.push(`starting at $${listing.price} per night`)
  }
  
  return parts.join(', ') + '.'
}