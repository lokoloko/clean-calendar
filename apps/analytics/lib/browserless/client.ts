/**
 * Browserless.io BrowserQL client for scraping Airbnb listings
 * Docs: https://docs.browserless.io/browserql
 */

interface BrowserlessConfig {
  apiKey: string
  endpoint?: string // Default: wss://chrome.browserless.io
}

interface PropertyListingData {
  url: string
  title?: string
  price?: {
    nightly?: number
    currency?: string
  }
  rating?: number
  reviews?: number
  occupancy?: {
    bookedDates?: string[]
    availableDates?: string[]
    occupancyRate?: number
  }
  amenities?: string[]
  photos?: string[]
  description?: string
  host?: {
    name?: string
    isSuperhost?: boolean
    responseRate?: string
  }
  location?: {
    neighborhood?: string
    city?: string
  }
  competitors?: Array<{
    title: string
    price: number
    rating: number
    distance?: string
  }>
  lastScraped?: Date
}

export class BrowserlessClient {
  private apiKey: string
  private endpoint: string

  constructor(config: BrowserlessConfig) {
    this.apiKey = config.apiKey
    this.endpoint = config.endpoint || 'https://chrome.browserless.io'
  }

  /**
   * Scrape an Airbnb listing using BrowserQL
   */
  async scrapeAirbnbListing(url: string): Promise<PropertyListingData> {
    const query = `
      mutation ScrapeAirbnb {
        goto(url: "${url}", waitUntil: "networkidle") {
          status
          url
        }
        
        # Wait for content to load
        waitForSelector(selector: "[data-section-id='TITLE_DEFAULT']", timeout: 10000)
        
        # Extract listing title
        title: text(selector: "h1") {
          text
        }
        
        # Extract price
        price: text(selector: "span._tyxjp1") {
          text
        }
        
        # Extract rating and reviews
        rating: text(selector: "span._17p6nbba") {
          text
        }
        
        # Get availability calendar data
        calendar: querySelectorAll(selector: "[data-testid='calendar-day']") {
          elements {
            date: attribute(name: "data-testid")
            available: attribute(name: "data-is-day-blocked")
          }
        }
        
        # Take screenshot for reference
        screenshot {
          base64
        }
        
        # Get page HTML for detailed parsing
        html {
          html
        }
      }
    `

    try {
      const response = await this.executeBrowserQL(query)
      return this.parseAirbnbResponse(response, url)
    } catch (error) {
      console.error('Failed to scrape Airbnb listing:', error)
      throw error
    }
  }

  /**
   * Scrape multiple competitor listings in the area
   */
  async scrapeCompetitors(
    location: string, 
    priceRange?: { min: number, max: number },
    limit: number = 5
  ): Promise<PropertyListingData[]> {
    const searchUrl = this.buildAirbnbSearchUrl(location, priceRange)
    
    const query = `
      mutation ScrapeCompetitors {
        goto(url: "${searchUrl}", waitUntil: "networkidle") {
          status
        }
        
        # Wait for listings to load
        waitForSelector(selector: "[data-testid='card-container']", timeout: 10000)
        
        # Get all listing cards
        listings: querySelectorAll(selector: "[data-testid='card-container']") {
          elements {
            title: text(selector: "[data-testid='listing-card-title']")
            price: text(selector: "span._tyxjp1")
            rating: text(selector: "span._17p6nbba")
            link: attribute(selector: "a", name: "href")
          }
        }
      }
    `

    try {
      const response = await this.executeBrowserQL(query)
      const listings = this.parseSearchResults(response)
      
      // Scrape details for top listings
      const detailedListings = []
      for (const listing of listings.slice(0, limit)) {
        if (listing.url) {
          const details = await this.scrapeAirbnbListing(listing.url)
          detailedListings.push(details)
        }
      }
      
      return detailedListings
    } catch (error) {
      console.error('Failed to scrape competitors:', error)
      throw error
    }
  }

  /**
   * Execute a BrowserQL query
   */
  private async executeBrowserQL(query: string): Promise<any> {
    const response = await fetch(`${this.endpoint}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({ query })
    })

    if (!response.ok) {
      throw new Error(`BrowserQL request failed: ${response.statusText}`)
    }

    const data = await response.json()
    
    if (data.errors) {
      throw new Error(`BrowserQL errors: ${JSON.stringify(data.errors)}`)
    }

    return data.data
  }

  /**
   * Parse Airbnb scraping response
   */
  private parseAirbnbResponse(data: any, url: string): PropertyListingData {
    const result: PropertyListingData = {
      url,
      lastScraped: new Date()
    }

    // Parse title
    if (data.title?.text) {
      result.title = data.title.text.trim()
    }

    // Parse price
    if (data.price?.text) {
      const priceMatch = data.price.text.match(/\$?([\d,]+)/)
      if (priceMatch) {
        result.price = {
          nightly: parseFloat(priceMatch[1].replace(/,/g, '')),
          currency: 'USD'
        }
      }
    }

    // Parse rating
    if (data.rating?.text) {
      const ratingMatch = data.rating.text.match(/([\d.]+)/)
      if (ratingMatch) {
        result.rating = parseFloat(ratingMatch[1])
      }
      
      const reviewMatch = data.rating.text.match(/\(([\d,]+)\)/)
      if (reviewMatch) {
        result.reviews = parseInt(reviewMatch[1].replace(/,/g, ''))
      }
    }

    // Parse calendar availability
    if (data.calendar?.elements) {
      const bookedDates: string[] = []
      const availableDates: string[] = []
      
      data.calendar.elements.forEach((day: any) => {
        if (day.available === 'false') {
          bookedDates.push(day.date)
        } else {
          availableDates.push(day.date)
        }
      })
      
      result.occupancy = {
        bookedDates,
        availableDates,
        occupancyRate: bookedDates.length / (bookedDates.length + availableDates.length) * 100
      }
    }

    // Additional parsing from HTML if needed
    if (data.html?.html) {
      // Parse additional details from raw HTML
      // This would require more sophisticated parsing
    }

    return result
  }

  /**
   * Parse search results
   */
  private parseSearchResults(data: any): PropertyListingData[] {
    if (!data.listings?.elements) {
      return []
    }

    return data.listings.elements.map((listing: any) => ({
      url: listing.link ? `https://www.airbnb.com${listing.link}` : '',
      title: listing.title?.trim(),
      price: {
        nightly: this.extractPrice(listing.price),
        currency: 'USD'
      },
      rating: this.extractRating(listing.rating)
    }))
  }

  /**
   * Build Airbnb search URL
   */
  private buildAirbnbSearchUrl(location: string, priceRange?: { min: number, max: number }): string {
    const params = new URLSearchParams({
      'query': location,
      'checkin': new Date().toISOString().split('T')[0],
      'checkout': new Date(Date.now() + 86400000).toISOString().split('T')[0],
      'adults': '2'
    })

    if (priceRange) {
      if (priceRange.min) params.append('price_min', priceRange.min.toString())
      if (priceRange.max) params.append('price_max', priceRange.max.toString())
    }

    return `https://www.airbnb.com/s/${encodeURIComponent(location)}/homes?${params.toString()}`
  }

  /**
   * Extract price from text
   */
  private extractPrice(text: string): number {
    if (!text) return 0
    const match = text.match(/\$?([\d,]+)/)
    return match ? parseFloat(match[1].replace(/,/g, '')) : 0
  }

  /**
   * Extract rating from text
   */
  private extractRating(text: string): number {
    if (!text) return 0
    const match = text.match(/([\d.]+)/)
    return match ? parseFloat(match[1]) : 0
  }
}