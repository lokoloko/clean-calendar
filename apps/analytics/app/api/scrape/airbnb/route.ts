import { NextRequest, NextResponse } from 'next/server'
import { AirbnbParser, type AirbnbListingData } from '@/lib/scrapers/airbnb-parser'

interface ScrapeRequest {
  url: string
  propertyId?: string
}

interface ScrapeResponse {
  success: boolean
  data?: AirbnbListingData
  error?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<ScrapeResponse>> {
  try {
    const body: ScrapeRequest = await request.json()
    const { url, propertyId } = body

    if (!url) {
      return NextResponse.json({
        success: false,
        error: 'URL is required'
      }, { status: 400 })
    }

    // Validate Airbnb URL
    if (!url.includes('airbnb.com/rooms/')) {
      return NextResponse.json({
        success: false,
        error: 'Invalid Airbnb URL. Must be a listing URL like: https://www.airbnb.com/rooms/123456'
      }, { status: 400 })
    }

    // Get Browserless API key from environment
    const apiKey = process.env.BROWSERLESS_API_KEY
    if (!apiKey) {
      console.error('BROWSERLESS_API_KEY not configured')
      return NextResponse.json({
        success: false,
        error: 'Scraping service not configured'
      }, { status: 500 })
    }

    const endpoint = 'https://production-sfo.browserless.io/chromium/bql'

    // BrowserQL query to scrape Airbnb data
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
      
      # Get policies section (house rules)
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

    console.log('Scraping Airbnb listing:', url)

    // Execute BrowserQL query
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
      return NextResponse.json({
        success: false,
        error: `Scraping failed: ${response.statusText}`
      }, { status: response.status })
    }

    const result = await response.json()

    if (result.errors) {
      console.error('BrowserQL errors:', result.errors)
      return NextResponse.json({
        success: false,
        error: 'Failed to scrape listing data'
      }, { status: 500 })
    }

    // Combine all HTML sections for parsing
    const combinedHtml = `
      <h1>${result.data?.title?.text || ''}</h1>
      ${result.data?.reviewsSection?.html || ''}
      ${result.data?.amenitiesSection?.html || ''}
      ${result.data?.policiesSection?.html || ''}
      ${result.data?.locationSection?.html || ''}
      ${result.data?.hostSection?.html || ''}
      ${result.data?.fullHtml?.html || ''}
    `

    // Parse the scraped HTML
    const parsedData = AirbnbParser.parseListingHTML(combinedHtml, url)

    // Add property ID if provided
    if (propertyId) {
      ;(parsedData as any).propertyId = propertyId
    }

    // Cache the data for future use (optional)
    // Could store in Redis or database here

    return NextResponse.json({
      success: true,
      data: parsedData
    })

  } catch (error) {
    console.error('Scraping error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to scrape property'
    }, { status: 500 })
  }
}

// GET endpoint to check scraping status
export async function GET(request: NextRequest): Promise<NextResponse> {
  const apiKey = process.env.BROWSERLESS_API_KEY
  
  return NextResponse.json({
    status: 'ready',
    configured: !!apiKey,
    endpoint: '/api/scrape/airbnb',
    method: 'POST',
    requiredParams: {
      url: 'Airbnb listing URL (e.g., https://www.airbnb.com/rooms/123456)',
      propertyId: 'Optional internal property ID for linking'
    }
  })
}