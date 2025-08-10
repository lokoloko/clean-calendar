// Function Endpoint Scraper using Puppeteer code for maximum control
import { ComprehensiveAirbnbListing, AirbnbListingData } from './types/listing'

const FUNCTION_ENDPOINT = 'https://production-sfo.browserless.io/chrome/function'

// Puppeteer function to run in Browserless (URL passed via context)
const scrapingFunction = `
async function() {
  const page = this;
  const { url } = context;
  
  console.log('Navigating to:', url);
  await page.goto(url, { 
    waitUntil: 'networkidle2',
    timeout: 30000 
  });
  
  // Wait for main content
  await page.waitForSelector('h1', { timeout: 10000 });
  
  // Try to expand amenities section
  try {
    const amenitiesButton = await page.$('button:has-text("Show all amenities"), button:has-text("Show all") >> nth=0');
    if (amenitiesButton) {
      await amenitiesButton.click();
      await page.waitForTimeout(2000);
      console.log('Expanded amenities');
    }
  } catch (e) {
    console.log('Could not expand amenities:', e.message);
  }
  
  // Try to expand reviews section
  try {
    // Look for review button
    const reviewButton = await page.$('button[aria-label*="review"], button:has-text("Show all") >> nth=1');
    if (reviewButton) {
      await reviewButton.click();
      await page.waitForTimeout(3000);
      console.log('Opened reviews modal');
      
      // Scroll to load all reviews
      let previousHeight = 0;
      let currentHeight = await page.evaluate(() => {
        const modal = document.querySelector('[role="dialog"], [data-testid="modal"]');
        return modal ? modal.scrollHeight : document.body.scrollHeight;
      });
      
      let scrollAttempts = 0;
      while (previousHeight !== currentHeight && scrollAttempts < 10) {
        await page.evaluate(() => {
          const modal = document.querySelector('[role="dialog"], [data-testid="modal"]');
          if (modal) {
            modal.scrollTo(0, modal.scrollHeight);
          } else {
            window.scrollTo(0, document.body.scrollHeight);
          }
        });
        
        await page.waitForTimeout(2000);
        previousHeight = currentHeight;
        currentHeight = await page.evaluate(() => {
          const modal = document.querySelector('[role="dialog"], [data-testid="modal"]');
          return modal ? modal.scrollHeight : document.body.scrollHeight;
        });
        scrollAttempts++;
      }
      console.log('Scrolled through reviews');
    }
  } catch (e) {
    console.log('Could not expand reviews:', e.message);
  }
  
  // Extract comprehensive data
  const data = await page.evaluate(() => {
    // Helper function to safely get text
    const getText = (selector) => {
      const el = document.querySelector(selector);
      return el ? el.textContent.trim() : null;
    };
    
    const getAllTexts = (selector) => {
      return Array.from(document.querySelectorAll(selector)).map(el => el.textContent.trim());
    };
    
    // Extract title and subtitle
    const title = getText('h1');
    const subtitle = getText('h2');
    
    // Extract rating and reviews
    let rating = null;
    let reviewCount = null;
    const ratingElement = document.querySelector('[aria-label*="rating"], button[aria-label*="review"]');
    if (ratingElement) {
      const text = ratingElement.textContent;
      const ratingMatch = text.match(/(\\d+\\.?\\d*)/);
      const reviewMatch = text.match(/(\\d+)\\s*review/i);
      if (ratingMatch) rating = parseFloat(ratingMatch[1]);
      if (reviewMatch) reviewCount = parseInt(reviewMatch[1]);
    }
    
    // Extract price
    let price = null;
    const priceElements = document.querySelectorAll('span:has-text("$"), div[aria-label*="price"]');
    for (const el of priceElements) {
      const match = el.textContent.match(/\\$(\\d+)/);
      if (match) {
        price = parseInt(match[1]);
        break;
      }
    }
    
    // Extract property details
    const propertyInfo = getText('div:has-text("guests")');
    let guests = null, bedrooms = null, beds = null, bathrooms = null;
    if (propertyInfo) {
      const guestMatch = propertyInfo.match(/(\\d+)\\s*guest/i);
      const bedroomMatch = propertyInfo.match(/(\\d+)\\s*bedroom/i);
      const bedMatch = propertyInfo.match(/(\\d+)\\s*bed(?!room)/i);
      const bathMatch = propertyInfo.match(/(\\d+)\\s*bath/i);
      
      if (guestMatch) guests = parseInt(guestMatch[1]);
      if (bedroomMatch) bedrooms = parseInt(bedroomMatch[1]);
      if (bedMatch) beds = parseInt(bedMatch[1]);
      if (bathMatch) bathrooms = parseInt(bathMatch[1]);
    }
    
    // Extract host information
    const hostSection = getText('div:has-text("Hosted by")');
    let hostName = null;
    if (hostSection) {
      const match = hostSection.match(/Hosted by\\s+([A-Za-z]+)/i);
      if (match) hostName = match[1];
    }
    const isSuperhost = !!document.querySelector('div:has-text("Superhost")');
    
    // Extract all amenities
    const amenities = getAllTexts('[id*="amenity"], div[data-section-id="AMENITIES"] button');
    
    // Extract review categories
    const reviewCategories = {};
    const categories = ['Cleanliness', 'Accuracy', 'Communication', 'Location', 'Check-in', 'Value'];
    categories.forEach(cat => {
      const el = document.querySelector(\`div:has-text("\${cat}") + div, div:has-text("\${cat}") ~ span\`);
      if (el) {
        const match = el.textContent.match(/(\\d+\\.?\\d*)/);
        if (match) {
          reviewCategories[cat.toLowerCase().replace('-', '')] = parseFloat(match[1]);
        }
      }
    });
    
    // Extract individual reviews
    const reviewElements = document.querySelectorAll('[data-testid="review-item"], [role="article"]:has(div:has-text("20"))');
    const reviews = Array.from(reviewElements).slice(0, 100).map(el => {
      const authorEl = el.querySelector('[data-testid="review-author"], div >> nth=0');
      const dateEl = el.querySelector('time, span:has-text("20")');
      const textEl = el.querySelector('[data-testid="review-text"], div >> nth=2');
      
      return {
        author: authorEl ? authorEl.textContent.trim() : 'Guest',
        date: dateEl ? dateEl.textContent.trim() : '',
        text: textEl ? textEl.textContent.trim() : el.textContent.trim()
      };
    });
    
    // Extract house rules
    const checkIn = getText('div:has-text("Check-in"):has-text("After"), div:has-text("Check-in"):has-text("PM")');
    const checkOut = getText('div:has-text("Checkout"):has-text("Before"), div:has-text("Checkout"):has-text("AM")');
    
    const noSmoking = !!document.querySelector('div:has-text("No smoking")');
    const noPets = !!document.querySelector('div:has-text("No pets")');
    const noParties = !!document.querySelector('div:has-text("No parties")');
    
    // Extract photos
    const photos = Array.from(document.querySelectorAll('img[data-original-uri], picture img[src*="airbnb"]')).map(img => ({
      url: img.src || img.getAttribute('data-original-uri'),
      alt: img.alt
    }));
    
    // Get full description
    const descriptionEl = document.querySelector('[data-section-id="DESCRIPTION"]');
    const description = descriptionEl ? descriptionEl.textContent.trim() : '';
    
    return {
      title,
      subtitle,
      description,
      rating,
      reviewCount,
      price,
      guests,
      bedrooms,
      beds,
      bathrooms,
      hostName,
      isSuperhost,
      amenities: amenities.filter(a => a && a.length > 2 && a.length < 100),
      reviewCategories,
      reviews,
      checkIn,
      checkOut,
      houseRules: {
        noSmoking,
        noPets,
        noParties
      },
      photos: photos.slice(0, 50), // Limit to 50 photos
      htmlLength: document.documentElement.innerHTML.length
    };
  });
  
  console.log('Extraction complete:', {
    reviewsFound: data.reviews.length,
    amenitiesFound: data.amenities.length,
    photosFound: data.photos.length
  });
  
  return data;
}
`;

export async function scrapeAirbnbWithFunction(url: string): Promise<ComprehensiveAirbnbListing> {
  const apiKey = process.env.BROWSERLESS_API_KEY
  
  if (!apiKey) {
    throw new Error('Browserless API key not configured')
  }

  try {
    console.log('Starting Function scrape of:', url)
    
    const response = await fetch(`${FUNCTION_ENDPOINT}?token=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code: scrapingFunction,
        context: { url }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Function endpoint error:', response.status, errorText)
      throw new Error(`Function scraping failed: ${response.status}`)
    }

    const data = await response.json()
    console.log('Function scrape complete:', {
      title: data.title,
      reviewsFound: data.reviews?.length || 0,
      amenitiesFound: data.amenities?.length || 0
    })
    
    return parseFunctionResponse(url, data)
  } catch (error) {
    console.error('Function scraping error:', error)
    throw error
  }
}

function parseFunctionResponse(url: string, data: any): ComprehensiveAirbnbListing {
  const listing: ComprehensiveAirbnbListing = {
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
      isSuperhost: data.isSuperhost || false
    },
    
    pricing: {
      basePrice: data.price || 150,
      currency: 'USD'
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
        time: extractCheckTime(data.checkIn)
      },
      checkOut: {
        time: extractCheckTime(data.checkOut)
      },
      during: {
        smoking: !data.houseRules?.noSmoking,
        pets: !data.houseRules?.noPets,
        parties: !data.houseRules?.noParties
      }
    },
    
    bookingSettings: {},
    
    cancellationPolicy: {
      type: 'Standard'
    },
    
    meta: {
      scrapedAt: new Date().toISOString(),
      scrapeVersion: '3.0-function',
      dataCompleteness: calculateCompleteness(data)
    }
  }
  
  // Categorize amenities
  if (data.amenities && data.amenities.length > 0) {
    const categories: Record<string, string[]> = {
      kitchen: [],
      bathroom: [],
      entertainment: [],
      outdoor: [],
      safety: []
    }
    
    const categoryKeywords: Record<string, string[]> = {
      kitchen: ['Kitchen', 'Microwave', 'Refrigerator', 'Coffee', 'Dishwasher', 'Oven', 'Stove'],
      bathroom: ['Hair dryer', 'Shampoo', 'Hot water', 'Towels'],
      entertainment: ['TV', 'Netflix', 'Cable', 'Games'],
      outdoor: ['Pool', 'Hot tub', 'BBQ', 'Patio', 'Garden', 'Beach'],
      safety: ['Smoke alarm', 'Carbon monoxide', 'Fire extinguisher', 'First aid']
    }
    
    data.amenities.forEach((amenity: string) => {
      Object.entries(categoryKeywords).forEach(([category, keywords]) => {
        if (keywords.some(k => amenity.toLowerCase().includes(k.toLowerCase()))) {
          categories[category].push(amenity)
        }
      })
    })
    
    Object.entries(categories).forEach(([category, items]) => {
      if (items.length > 0) {
        listing.amenities[category] = items
      }
    })
  }
  
  return listing
}

function extractListingId(url: string): string {
  const match = url.match(/rooms\/(\d+)/)
  return match ? match[1] : ''
}

function extractCheckTime(text?: string): string | undefined {
  if (!text) return undefined
  const match = text.match(/(\d{1,2}:\d{2}\s*[AP]M|\d{1,2}\s*[AP]M)/i)
  return match ? match[1] : undefined
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
    data.hostName,
    data.description
  ]
  
  fields.forEach(field => {
    if (field) score += 10
  })
  
  return score
}

// Convert to simplified format for backward compatibility
export function functionToSimplified(comprehensive: ComprehensiveAirbnbListing): AirbnbListingData {
  return {
    url: comprehensive.url,
    title: comprehensive.title,
    description: comprehensive.description,
    price: comprehensive.pricing.basePrice,
    rating: comprehensive.reviews.summary.rating,
    reviewCount: comprehensive.reviews.summary.totalCount,
    amenities: comprehensive.amenities.basic || [],
    propertyType: comprehensive.propertyType,
    hostName: comprehensive.host.name,
    isSuperhost: comprehensive.host.isSuperhost,
    location: `${comprehensive.location.city}, ${comprehensive.location.country}`,
    photos: comprehensive.photos.length,
    
    // Enhanced fields
    subtitle: comprehensive.subtitle,
    hostResponseRate: comprehensive.host.responseRate,
    hostResponseTime: comprehensive.host.responseTime,
    cleaningFee: comprehensive.pricing.cleaningFee,
    serviceFee: comprehensive.pricing.serviceFee,
    checkIn: comprehensive.houseRules.checkIn.time,
    checkOut: comprehensive.houseRules.checkOut.time,
    minimumStay: comprehensive.bookingSettings.minimumStay,
    instantBook: comprehensive.bookingSettings.instantBook,
    reviewCategories: comprehensive.reviews.summary.categories,
    recentReviews: comprehensive.reviews.recentReviews?.slice(0, 10).map(r => ({
      author: r.author,
      date: r.date,
      text: r.text
    })),
    houseRules: {
      smoking: comprehensive.houseRules.during.smoking || false,
      pets: comprehensive.houseRules.during.pets || false,
      parties: comprehensive.houseRules.during.parties || false
    },
    lastScraped: comprehensive.meta.scrapedAt,
    dataQuality: comprehensive.meta.dataCompleteness
  }
}