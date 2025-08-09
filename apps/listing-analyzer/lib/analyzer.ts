import { GoogleGenerativeAI } from '@google/generative-ai'
import type { ListingData } from './scraper'

export interface AnalysisResult {
  score: number // 0-100
  summary: string
  categories: {
    photos: { score: number; issue?: string }
    description: { score: number; issue?: string }
    amenities: { score: number; issue?: string }
    reviews: { score: number; issue?: string }
    pricing: { score: number; issue?: string }
  }
  recommendations: Recommendation[]
  improvedDescription?: string
}

export interface Recommendation {
  id: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  category: string
  title: string
  description: string
  impact: string // e.g., "+30% visibility"
  effort: 'easy' | 'medium' | 'hard'
}

export async function analyzeListingWithAI(listing: ListingData): Promise<AnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
  
  if (!apiKey) {
    console.warn('Gemini API key not configured, using mock analysis')
    return generateMockAnalysis(listing)
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `
    You are an expert Airbnb listing consultant. Analyze this listing data and provide actionable recommendations.

    LISTING DATA:
    Title: ${listing.title}
    Type: ${listing.propertyType}
    Price: $${listing.pricing.nightly}/night
    Photos: ${listing.photos.count} photos
    Rating: ${listing.reviews.rating}/5 (${listing.reviews.count} reviews)
    Amenities: ${listing.amenities.all.length} total
    Key Amenities: ${listing.amenities.all.slice(0, 10).join(', ')}
    Superhost: ${listing.host.isSuperhost ? 'Yes' : 'No'}
    Instant Book: ${listing.availability.instantBook ? 'Yes' : 'No'}
    Minimum Stay: ${listing.availability.minimumStay || 1} nights
    
    Review Categories:
    ${listing.reviews.distribution ? Object.entries(listing.reviews.distribution)
      .map(([key, val]) => `${key}: ${val}/5`).join(', ') : 'Not available'}

    Provide analysis in this exact JSON format:
    {
      "score": [0-100 overall score],
      "summary": "[2-3 sentence summary of listing performance]",
      "categories": {
        "photos": {
          "score": [0-100],
          "issue": "[main issue if score < 80]"
        },
        "description": {
          "score": [0-100],
          "issue": "[main issue if score < 80]"
        },
        "amenities": {
          "score": [0-100],
          "issue": "[main issue if score < 80]"
        },
        "reviews": {
          "score": [0-100],
          "issue": "[main issue if score < 80]"
        },
        "pricing": {
          "score": [0-100],
          "issue": "[main issue if score < 80]"
        }
      },
      "recommendations": [
        {
          "id": "1",
          "priority": "critical|high|medium|low",
          "category": "Photos|Description|Amenities|Reviews|Pricing",
          "title": "[Action to take]",
          "description": "[Why this matters and specific steps]",
          "impact": "[Expected impact like '+30% visibility']",
          "effort": "easy|medium|hard"
        }
      ],
      "improvedDescription": "[Rewritten description optimized for bookings - only if description score < 80]"
    }

    Focus on:
    1. Photo count (20+ is ideal)
    2. Missing high-value amenities (workspace, coffee maker, fast wifi)
    3. Review issues (cleanliness, communication)
    4. Pricing competitiveness
    5. Description clarity and keywords

    Provide exactly 5 recommendations ordered by impact.
    `

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    // Parse JSON from response
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0])
        return analysis as AnalysisResult
      }
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError)
    }
  } catch (error) {
    console.error('Error calling Gemini API:', error)
  }

  // Fallback to mock analysis
  return generateMockAnalysis(listing)
}

function generateMockAnalysis(listing: ListingData): AnalysisResult {
  const photoScore = Math.min(100, (listing.photos.count / 20) * 100)
  const reviewScore = listing.reviews.rating ? (listing.reviews.rating / 5) * 100 : 50
  const amenityScore = Math.min(100, (listing.amenities.all.length / 30) * 100)
  const priceScore = listing.pricing.nightly > 0 ? 75 : 0
  const descriptionScore = listing.description ? 70 : 40
  
  const overallScore = Math.round(
    (photoScore * 0.25 + reviewScore * 0.25 + amenityScore * 0.2 + priceScore * 0.15 + descriptionScore * 0.15)
  )
  
  const recommendations: Recommendation[] = []
  
  // Photo recommendations
  if (listing.photos.count < 20) {
    recommendations.push({
      id: '1',
      priority: 'critical',
      category: 'Photos',
      title: `Add ${20 - listing.photos.count} More Photos`,
      description: 'Listings with 20+ photos get 2x more views and 40% more bookings. Add photos of all rooms, amenities, and neighborhood.',
      impact: '+40% bookings',
      effort: 'easy'
    })
  }
  
  // Amenity recommendations
  const missingAmenities = ['Workspace', 'Coffee maker', 'Fast wifi', 'Hair dryer', 'Iron']
    .filter(a => !listing.amenities.all.some(la => la.toLowerCase().includes(a.toLowerCase())))
  
  if (missingAmenities.length > 0) {
    recommendations.push({
      id: '2',
      priority: 'high',
      category: 'Amenities',
      title: `Add Missing Amenities`,
      description: `You're missing: ${missingAmenities.slice(0, 3).join(', ')}. These are highly searched amenities that increase bookings.`,
      impact: '+20% bookings',
      effort: 'medium'
    })
  }
  
  // Review recommendations
  if (listing.reviews.count < 10) {
    recommendations.push({
      id: '3',
      priority: 'high',
      category: 'Reviews',
      title: 'Build Review Count',
      description: 'With only ' + listing.reviews.count + ' reviews, you\'re missing social proof. Offer a small discount to first guests and actively request reviews.',
      impact: '+25% trust',
      effort: 'medium'
    })
  }
  
  // Price recommendations
  if (!listing.availability.instantBook) {
    recommendations.push({
      id: '4',
      priority: 'medium',
      category: 'Booking Settings',
      title: 'Enable Instant Book',
      description: 'Properties with Instant Book get 3x more visibility in search results and book 20% more often.',
      impact: '+20% visibility',
      effort: 'easy'
    })
  }
  
  // Superhost recommendation
  if (!listing.host.isSuperhost) {
    recommendations.push({
      id: '5',
      priority: 'medium',
      category: 'Host Status',
      title: 'Work Toward Superhost',
      description: 'Superhosts get priority in search, can charge 10% more, and have 30% higher booking rates. Focus on response time and ratings.',
      impact: '+30% bookings',
      effort: 'hard'
    })
  }
  
  // Ensure we have 5 recommendations
  while (recommendations.length < 5) {
    recommendations.push({
      id: recommendations.length + 1 + '',
      priority: 'low',
      category: 'General',
      title: 'Optimize Listing Details',
      description: 'Review and update your listing regularly to maintain freshness in search algorithms.',
      impact: '+5% visibility',
      effort: 'easy'
    })
  }
  
  return {
    score: overallScore,
    summary: `Your listing scores ${overallScore}/100 with ${listing.reviews.count} reviews and a ${listing.reviews.rating}/5 rating. Main opportunities are in ${photoScore < 80 ? 'photos' : amenityScore < 80 ? 'amenities' : 'optimization'}.`,
    categories: {
      photos: {
        score: photoScore,
        issue: photoScore < 80 ? `Only ${listing.photos.count} photos (need 20+)` : undefined
      },
      description: {
        score: descriptionScore,
        issue: descriptionScore < 80 ? 'Description needs improvement' : undefined
      },
      amenities: {
        score: amenityScore,
        issue: amenityScore < 80 ? `Only ${listing.amenities.all.length} amenities listed` : undefined
      },
      reviews: {
        score: reviewScore,
        issue: reviewScore < 80 ? 'Review score or count needs improvement' : undefined
      },
      pricing: {
        score: priceScore,
        issue: priceScore < 80 ? 'Pricing may not be competitive' : undefined
      }
    },
    recommendations: recommendations.slice(0, 5),
    improvedDescription: descriptionScore < 80 ? generateImprovedDescription(listing) : undefined
  }
}

function generateImprovedDescription(listing: ListingData): string {
  return `Welcome to this beautiful ${listing.propertyType} in ${listing.location.neighborhood || 'a prime location'}! 

Perfect for both business and leisure travelers, this space offers everything you need for a comfortable stay. With ${listing.amenities.all.length} amenities including ${listing.amenities.all.slice(0, 5).join(', ')}, you'll feel right at home.

${listing.reviews.rating > 4.5 ? `Rated ${listing.reviews.rating}/5 by our ${listing.reviews.count} happy guests, ` : ''}we pride ourselves on cleanliness, comfort, and communication. ${listing.host.isSuperhost ? 'As a Superhost, ' : ''}we're committed to making your stay exceptional.

Book now and experience the perfect blend of comfort, convenience, and value!`
}