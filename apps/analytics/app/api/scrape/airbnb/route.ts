import { NextRequest, NextResponse } from 'next/server'
import { BrowserlessClient } from '@/lib/browserless/client'
import { AirbnbParser } from '@/lib/scrapers/airbnb-parser'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, propertyId } = body
    
    // Log the incoming request for debugging
    console.log('Scrape API received:', { url, propertyId })
    
    if (!url || !url.includes('airbnb.com/rooms/')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid Airbnb URL' 
        },
        { status: 400 }
      )
    }
    
    // Check if Browserless API key is properly configured
    const apiKey = process.env.BROWSERLESS_API_KEY
    const isApiKeyConfigured = apiKey && 
      apiKey !== 'your-browserless-api-key-here' && 
      apiKey.length > 10
    
    // Extract listing ID from URL
    const listingIdMatch = url.match(/rooms\/(\d+)/)
    const listingId = listingIdMatch ? listingIdMatch[1] : null
    
    if (!listingId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Could not extract listing ID from URL' 
        },
        { status: 400 }
      )
    }
    
    if (!isApiKeyConfigured) {
      console.log('Browserless API key not configured, using fallback data')
      // Return minimal fallback data
      return NextResponse.json({
        success: true,
        data: {
          listingId,
          url,
          title: 'Property data unavailable',
          price: { nightly: 0, currency: 'USD' },
          reviews: { count: 0, overall: 0 },
          scrapedAt: new Date().toISOString()
        }
      })
    }
    
    // Use real BrowserQL scraping
    console.log(`Scraping Airbnb listing: ${url}`)
    
    // Create BrowserQL query with updated selectors
    const query = `
      mutation ScrapeAirbnb {
        goto(url: "${url}", waitUntil: networkIdle) {
          status
          url
        }
        
        # Get page title
        title: text(selector: "h1", timeout: 5000) {
          text
        }
        
        # Scroll to load more content
        scroll1: scroll(y: 1000) {
          x
          y
        }
        
        # Try to get reviews section
        reviewsSection: html(selector: "[data-section-id='REVIEWS_DEFAULT']", timeout: 5000) {
          html
        }
        
        scroll2: scroll(y: 2000) {
          x
          y
        }
        
        # Try to get amenities section
        amenitiesSection: html(selector: "[data-section-id='AMENITIES_DEFAULT']", timeout: 5000) {
          html
        }
        
        # Try to get house rules section
        houseRulesSection: html(selector: "[data-section-id='POLICIES_DEFAULT']", timeout: 5000) {
          html
        }
        
        # Take a screenshot for debugging
        screenshot(fullPage: false) {
          base64
        }
        
        # Get the full HTML for comprehensive parsing
        fullHtml: html {
          html
        }
      }
    `
    
    // Execute the BrowserQL query
    const browserlessEndpoint = 'https://production-sfo.browserless.io/chromium/bql'
    const response = await fetch(`${browserlessEndpoint}?token=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {}
      })
    })
    
    if (!response.ok) {
      throw new Error(`BrowserQL request failed: ${response.statusText}`)
    }
    
    const result = await response.json()
    
    // Check for GraphQL errors
    if (result.errors) {
      console.error('BrowserQL Errors:', result.errors)
      throw new Error('Failed to scrape page')
    }
    
    const scrapedData = result.data
    
    // Parse the scraped HTML to extract structured data
    let parsedData: any = {
      listingId,
      url,
      title: scrapedData.title?.text?.trim() || '',
      scrapedAt: new Date().toISOString()
    }
    
    // Extract data from full HTML
    if (scrapedData.fullHtml?.html) {
      const html = scrapedData.fullHtml.html
      
      // Extract price - look for various patterns
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
          parsedData.price = {
            nightly: parseInt(match[1]),
            currency: 'USD'
          }
          break
        }
      }
      
      // Extract rating and review count
      const ratingPatterns = [
        /(\d+\.\d+)\s*·\s*(\d+)\s*reviews?/i,
        /(\d+\.\d+).*?(\d+)\s*reviews?/i,
        /"starRating":(\d+\.?\d*)/
      ]
      
      for (const pattern of ratingPatterns) {
        const match = html.match(pattern)
        if (match) {
          if (match[1]) {
            parsedData.reviews = parsedData.reviews || {}
            parsedData.reviews.overall = parseFloat(match[1])
          }
          if (match[2]) {
            parsedData.reviews = parsedData.reviews || {}
            parsedData.reviews.count = parseInt(match[2])
          }
          break
        }
      }
      
      // Extract amenities from amenities section
      if (scrapedData.amenitiesSection?.html) {
        const amenitiesHtml = scrapedData.amenitiesSection.html
        const amenities: string[] = []
        
        // Extract text content between tags
        const textMatches = amenitiesHtml.match(/>([^<]+)</g)
        if (textMatches) {
          textMatches.forEach(match => {
            const text = match.replace(/^>|<$/g, '').trim()
            if (text.length > 2 && text.length < 100 && 
                !text.includes('Show') && !text.includes('amenities')) {
              amenities.push(text)
            }
          })
        }
        
        if (amenities.length > 0) {
          parsedData.amenities = {
            highlighted: amenities.slice(0, 6),
            all: amenities
          }
        }
      }
      
      // Extract host information
      const hostMatch = html.match(/hosted\s*by\s*([^<]+)/i)
      if (hostMatch) {
        parsedData.host = {
          name: hostMatch[1].trim(),
          isSuperhost: /superhost/i.test(html)
        }
      }
      
      // Extract property type
      const propertyTypeMatch = html.match(/entire\s*(home|apartment|place|house|condo|loft|studio)/i)
      if (propertyTypeMatch) {
        parsedData.property = {
          type: `Entire ${propertyTypeMatch[1]}`
        }
      }
      
      // Extract house rules from policies section
      if (scrapedData.houseRulesSection?.html) {
        const rulesHtml = scrapedData.houseRulesSection.html
        parsedData.houseRules = {}
        
        const checkinMatch = rulesHtml.match(/check-?in[^>]*>([^<]+)/i)
        if (checkinMatch) {
          parsedData.houseRules.checkIn = checkinMatch[1].trim()
        }
        
        const checkoutMatch = rulesHtml.match(/check-?out[^>]*>([^<]+)/i)
        if (checkoutMatch) {
          parsedData.houseRules.checkOut = checkoutMatch[1].trim()
        }
      }
    }
    
    // Extract reviews from reviews section
    if (scrapedData.reviewsSection?.html) {
      const reviewsHtml = scrapedData.reviewsSection.html
      const reviewCountMatch = reviewsHtml.match(/(\d+)\s*reviews?/i)
      if (reviewCountMatch && !parsedData.reviews?.count) {
        parsedData.reviews = parsedData.reviews || {}
        parsedData.reviews.count = parseInt(reviewCountMatch[1])
      }
    }
    
    // Save screenshot if available
    if (scrapedData.screenshot?.base64) {
      parsedData.screenshot = scrapedData.screenshot.base64
    }
    
    // Ensure we have at least basic structure
    parsedData.price = parsedData.price || { nightly: 0, currency: 'USD' }
    parsedData.reviews = parsedData.reviews || { count: 0, overall: 0 }
    
    console.log('Scraping complete:', {
      title: parsedData.title,
      price: parsedData.price?.nightly,
      rating: parsedData.reviews?.overall,
      reviews: parsedData.reviews?.count
    })
    
    return NextResponse.json({
      success: true,
      data: parsedData
    })
    
  } catch (error) {
    console.error('Error scraping Airbnb:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to scrape Airbnb data' 
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check scraping status
export async function GET(request: NextRequest) {
  const apiKey = process.env.BROWSERLESS_API_KEY
  const isApiKeyConfigured = apiKey && 
    apiKey !== 'your-browserless-api-key-here' && 
    apiKey.length > 10
  
  return NextResponse.json({
    status: 'ready',
    configured: isApiKeyConfigured,
    endpoint: '/api/scrape/airbnb',
    method: 'POST',
    mockMode: !isApiKeyConfigured, // Using mock data when API key not configured
    requiredParams: {
      url: 'Airbnb listing URL (e.g., https://www.airbnb.com/rooms/123456)',
      propertyId: 'Optional internal property ID for linking'
    }
  })
}