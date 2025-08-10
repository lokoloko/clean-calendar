// Puppeteer scraper with proxy rotation and enhanced reliability
import puppeteer from 'puppeteer-core'
import { ComprehensiveAirbnbListing } from './types/listing'

interface ProxyConfig {
  type: 'residential' | 'datacenter' | 'none'
  country?: string
  retryWithDifferentProxy?: boolean
}

const PROXY_COUNTRIES = ['us', 'ca', 'gb', 'de', 'fr', 'es', 'it', 'au']

export async function scrapeAirbnbWithProxy(
  url: string,
  proxyConfig: ProxyConfig = { type: 'none' }
): Promise<ComprehensiveAirbnbListing> {
  const apiKey = process.env.BROWSERLESS_API_KEY
  
  if (!apiKey) {
    throw new Error('Browserless API key not configured')
  }

  let attempt = 0
  const maxAttempts = proxyConfig.retryWithDifferentProxy ? 3 : 1
  let lastError: any = null
  
  while (attempt < maxAttempts) {
    attempt++
    
    // Rotate country on retry
    const proxyCountry = proxyConfig.country || PROXY_COUNTRIES[attempt % PROXY_COUNTRIES.length]
    
    // Build connection URL with proxy parameters
    let connectionUrl = `wss://production-sfo.browserless.io?token=${apiKey}`
    
    if (proxyConfig.type !== 'none') {
      connectionUrl += `&proxy=${proxyConfig.type}`
      connectionUrl += `&proxyCountry=${proxyCountry}`
    }
    
    // Configure stealth mode
    const launchArgs = {
      stealth: true,
      headless: false,
      blockAds: true,
      args: [
        '--window-size=1920,1080',
        '--lang=en-US',
        '--disable-blink-features=AutomationControlled',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ]
    }
    
    connectionUrl += `&launch=${encodeURIComponent(JSON.stringify(launchArgs))}`
    
    const browser = await puppeteer.connect({
      browserWSEndpoint: connectionUrl
    })
    
    try {
      console.log(`Attempt ${attempt}: Scraping with ${proxyConfig.type} proxy (${proxyCountry})`)
      
      const page = await browser.newPage()
      await page.setViewport({ width: 1920, height: 1080 })
      
      // Set additional headers to appear more legitimate
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      })
      
      // Override navigator properties for better stealth
      await page.evaluateOnNewDocument(() => {
        // Hide webdriver
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined
        })
        
        // Mock plugins
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5]
        })
        
        // Mock languages
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en']
        })
        
        // Mock platform
        Object.defineProperty(navigator, 'platform', {
          get: () => 'Win32'
        })
        
        // Mock hardware concurrency
        Object.defineProperty(navigator, 'hardwareConcurrency', {
          get: () => 8
        })
        
        // Mock device memory
        Object.defineProperty(navigator, 'deviceMemory', {
          get: () => 8
        })
      })
      
      // Random delay before navigation (human-like)
      await new Promise(resolve => setTimeout(resolve, Math.random() * 3000 + 1000))
      
      // Navigate with timeout
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 60000
      })
      
      // Check if we got blocked or redirected
      const currentUrl = page.url()
      if (currentUrl.includes('verify') || currentUrl.includes('captcha') || currentUrl.includes('blocked')) {
        throw new Error(`Blocked or captcha detected: ${currentUrl}`)
      }
      
      // Wait for main content
      await page.waitForSelector('h1', { timeout: 15000 })
      
      // Random human-like behavior
      await simulateHumanBehavior(page)
      
      // Extract all data in optimized single evaluate
      const data = await page.evaluate(() => {
        const extractAll = () => {
          // Title and subtitle
          const title = document.querySelector('h1')?.textContent?.trim() || 'Airbnb Listing'
          const subtitle = document.querySelector('h2')?.textContent?.trim()
          
          // Price extraction
          let price = null
          const priceElements = document.querySelectorAll('span')
          for (const el of priceElements) {
            const text = el.textContent || ''
            if (text.includes('$') && (text.includes('night') || text.includes('total'))) {
              const match = text.match(/\$(\d+(?:,\d{3})*)/)
              if (match) {
                price = parseInt(match[1].replace(/,/g, ''))
                break
              }
            }
          }
          
          // Rating and reviews
          let rating = null, reviewCount = null
          const ratingElements = document.querySelectorAll('[aria-label*="rating"], [aria-label*="review"]')
          for (const el of ratingElements) {
            const label = el.getAttribute('aria-label') || ''
            const text = el.textContent || ''
            const combined = `${label} ${text}`
            
            if (!rating) {
              const ratingMatch = combined.match(/(\d+\.?\d*)\s*(star|rating)/i)
              if (ratingMatch) rating = parseFloat(ratingMatch[1])
            }
            
            if (!reviewCount) {
              const reviewMatch = combined.match(/(\d+)\s*review/i)
              if (reviewMatch) reviewCount = parseInt(reviewMatch[1])
            }
          }
          
          // Property details
          let guests = 4, bedrooms = 1, beds = 1, bathrooms = 1
          const propertyDivs = document.querySelectorAll('div')
          for (const div of propertyDivs) {
            const text = div.textContent || ''
            if (text.includes('guest') && text.includes('bedroom')) {
              const guestMatch = text.match(/(\d+)\s*guest/i)
              const bedroomMatch = text.match(/(\d+)\s*bedroom/i)
              const bedMatch = text.match(/(\d+)\s*bed(?!room)/i)
              const bathMatch = text.match(/(\d+)\s*bath/i)
              
              if (guestMatch) guests = parseInt(guestMatch[1])
              if (bedroomMatch) bedrooms = parseInt(bedroomMatch[1])
              if (bedMatch) beds = parseInt(bedMatch[1])
              if (bathMatch) bathrooms = parseInt(bathMatch[1])
              break
            }
          }
          
          // Host info
          let hostName = 'Host', isSuperhost = false
          const hostSection = Array.from(document.querySelectorAll('div'))
            .find(div => div.textContent?.includes('Hosted by'))
          
          if (hostSection) {
            const text = hostSection.textContent || ''
            const nameMatch = text.match(/Hosted by\s+([A-Za-z\s]+?)(?:\.|,|$|\n|Superhost)/i)
            if (nameMatch) hostName = nameMatch[1].trim()
            if (text.includes('Superhost')) isSuperhost = true
          }
          
          // Amenities
          const amenities: string[] = []
          const amenityElements = document.querySelectorAll('[id*="amenity"], button[data-testid*="amenity"]')
          amenityElements.forEach(el => {
            const text = el.textContent?.trim()
            if (text && text.length > 2 && text.length < 100 && !text.includes('Show')) {
              amenities.push(text)
            }
          })
          
          // Photos
          const photos: any[] = []
          const images = document.querySelectorAll('img[data-original-uri], img[src*="airbnb"]')
          images.forEach((img: any) => {
            const src = img.src || img.getAttribute('data-original-uri')
            if (src && !src.includes('profile') && !src.includes('user')) {
              photos.push({ url: src, alt: img.alt || '' })
            }
          })
          
          // Reviews
          const reviews: any[] = []
          const reviewElements = document.querySelectorAll('[data-testid*="review"], [aria-label*="review"]')
          reviewElements.forEach(el => {
            const text = el.textContent || ''
            const h3 = el.querySelector('h3')
            const author = h3?.textContent?.trim() || 'Guest'
            
            const dateMatch = text.match(/(\w+\s+\d{4}|\d+\s+(day|week|month)s?\s+ago)/i)
            const date = dateMatch ? dateMatch[0] : ''
            
            const reviewText = text
              .replace(author, '')
              .replace(date, '')
              .replace(/Show (more|less)/gi, '')
              .trim()
            
            if (reviewText.length > 50) {
              reviews.push({ author, date, text: reviewText.substring(0, 500) })
            }
          })
          
          // Description
          const descEl = document.querySelector('[data-section-id="DESCRIPTION"]')
          const description = descEl?.textContent?.trim() || ''
          
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
            photos: photos.slice(0, 50),
            reviews: reviews.slice(0, 20)
          }
        }
        
        return extractAll()
      })
      
      console.log(`Proxy scrape successful: ${data.amenities.length} amenities, ${data.reviews.length} reviews`)
      
      await page.close()
      await browser.close()
      
      // Convert to comprehensive listing format
      return {
        id: extractListingId(url),
        url,
        title: data.title,
        subtitle: data.subtitle,
        description: data.description,
        propertyType: 'Entire place',
        
        guestCapacity: {
          adults: data.guests,
          children: 0,
          infants: 0,
          total: data.guests
        },
        
        spaces: {
          bedrooms: data.bedrooms,
          beds: data.beds,
          bathrooms: data.bathrooms
        },
        
        host: {
          name: data.hostName,
          isSuperhost: data.isSuperhost
        },
        
        pricing: {
          basePrice: data.price || 150,
          currency: 'USD'
        },
        
        location: {
          city: 'Unknown',
          country: 'USA'
        },
        
        photos: data.photos,
        
        amenities: {
          basic: data.amenities
        },
        
        reviews: {
          summary: {
            rating: data.rating || 4.5,
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
          recentReviews: data.reviews
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
          scrapeVersion: '6.0-proxy',
          dataCompleteness: calculateCompleteness(data),
          proxyUsed: `${proxyConfig.type}-${proxyCountry}`
        }
      }
      
    } catch (error: any) {
      console.error(`Attempt ${attempt} failed:`, error.message)
      lastError = error
      await browser.close()
      
      // If blocked, try with different proxy
      if (error.message.includes('Blocked') || error.message.includes('captcha')) {
        console.log('Detected blocking, rotating proxy...')
        await new Promise(resolve => setTimeout(resolve, 2000))
        continue
      }
      
      // For other errors, throw immediately
      throw error
    }
  }
  
  // If all attempts failed, throw the last error
  throw lastError || new Error('All proxy attempts failed')
}

async function simulateHumanBehavior(page: any) {
  // Random mouse movements
  await page.mouse.move(100, 100)
  await page.mouse.move(500, 300)
  await page.mouse.move(800, 200)
  
  // Random scroll
  await page.evaluate(() => {
    window.scrollBy(0, Math.random() * 500)
  })
  
  // Random delay
  await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000))
  
  // Scroll back up
  await page.evaluate(() => {
    window.scrollBy(0, -200)
  })
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
    data.photos?.length > 0,
    data.hostName && data.hostName !== 'Host',
    data.description
  ]
  
  fields.forEach(field => {
    if (field) score += 11.11
  })
  
  return Math.min(Math.round(score), 100)
}