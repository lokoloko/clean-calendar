// Simplified vision scraper to debug blank screenshots
import { GoogleGenerativeAI } from '@google/generative-ai'
import { ComprehensiveAirbnbListing } from './types/listing'

export async function scrapeWithVisionSimple(url: string): Promise<ComprehensiveAirbnbListing> {
  const apiKey = process.env.BROWSERLESS_API_KEY
  
  if (!apiKey) {
    throw new Error('Browserless API key not configured')
  }
  
  console.log('📸 Taking screenshot of:', url)
  
  // Use the simplest possible screenshot approach
  const screenshotUrl = `https://production-sfo.browserless.io/screenshot?token=${apiKey}`
  
  const response = await fetch(screenshotUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      url: url,
      waitForTimeout: 10000  // Wait 10 seconds for content
    })
  })
  
  if (!response.ok) {
    throw new Error(`Screenshot failed: ${response.status}`)
  }
  
  const screenshotBuffer = Buffer.from(await response.arrayBuffer())
  console.log(`✅ Screenshot captured: ${screenshotBuffer.length} bytes`)
  
  // Extract data with Gemini Vision
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
  if (!geminiKey) {
    throw new Error('Gemini API key not configured')
  }
  
  const genAI = new GoogleGenerativeAI(geminiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  
  const prompt = `
  Analyze this Airbnb listing screenshot. Extract ALL visible text and data.
  
  Look for:
  - Title of the property
  - Price per night
  - Rating and number of reviews
  - Host name
  - Location (city, state, country)
  - Number of guests, bedrooms, beds, bathrooms
  - Any amenities shown
  - Description text
  
  If the image appears blank or doesn't show an Airbnb listing, say "BLANK IMAGE".
  
  Return JSON with found data:
  {
    "status": "success" or "blank",
    "title": "property title or null",
    "price": number or null,
    "rating": number or null,
    "reviewCount": number or null,
    "location": "location text or null",
    "details": "any other visible details"
  }
  `
  
  try {
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'image/png',
          data: screenshotBuffer.toString('base64')
        }
      },
      { text: prompt }
    ])
    
    const response = await result.response
    const text = response.text()
    console.log('Gemini response:', text)
    
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0])
      
      if (data.status === 'blank') {
        console.log('⚠️ Screenshot appears to be blank')
      }
      
      return {
        id: url.match(/rooms\/(\d+)/)?.[1] || '',
        url,
        title: data.title || 'Airbnb Listing',
        subtitle: undefined,
        description: data.details || 'See listing',
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
          basePrice: data.price || 0,
          currency: 'USD'
        },
        
        location: {
          city: data.location || 'Unknown',
          country: 'Unknown'
        },
        
        photos: [],
        
        amenities: {
          basic: []
        },
        
        reviews: {
          summary: {
            rating: data.rating || 0,
            totalCount: data.reviewCount || 0,
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
          type: 'Standard'
        },
        
        meta: {
          scrapedAt: new Date().toISOString(),
          scrapeVersion: 'vision-simple',
          dataCompleteness: data.status === 'success' ? 10 : 0
        }
      }
    }
  } catch (error) {
    console.error('Vision extraction failed:', error)
  }
  
  // Return minimal listing on error
  return {
    id: url.match(/rooms\/(\d+)/)?.[1] || '',
    url,
    title: 'Failed to extract',
    subtitle: undefined,
    description: 'Extraction failed',
    propertyType: 'Unknown',
    guestCapacity: { adults: 0, children: 0, infants: 0, total: 0 },
    spaces: { bedrooms: 0, beds: 0, bathrooms: 0 },
    host: { name: 'Unknown', isSuperhost: false },
    pricing: { basePrice: 0, currency: 'USD' },
    location: { city: 'Unknown', country: 'Unknown' },
    photos: [],
    amenities: { basic: [] },
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
    houseRules: { checkIn: {}, checkOut: {}, during: {} },
    bookingSettings: {},
    cancellationPolicy: { type: 'Unknown' },
    meta: {
      scrapedAt: new Date().toISOString(),
      scrapeVersion: 'vision-simple',
      dataCompleteness: 0
    }
  }
}