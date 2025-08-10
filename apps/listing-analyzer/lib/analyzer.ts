import { GoogleGenerativeAI } from '@google/generative-ai'
import type { AirbnbListingData } from './types/listing'

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

export async function analyzeListingWithAI(listing: AirbnbListingData): Promise<AnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
  
  if (!apiKey) {
    console.warn('Gemini API key not configured, using mock analysis')
    return generateMockAnalysis(listing)
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `
    You are an expert Airbnb listing consultant. Analyze this comprehensive listing data and provide actionable recommendations.

    LISTING DATA:
    Title: ${listing.title}
    ${listing.subtitle ? `Subtitle: ${listing.subtitle}` : ''}
    Type: ${listing.propertyType}
    Price: $${listing.price}/night
    ${listing.cleaningFee ? `Cleaning Fee: $${listing.cleaningFee}` : ''}
    Rating: ${listing.rating}/5 (${listing.reviewCount} reviews)
    Amenities: ${listing.amenities.join(', ')}
    Superhost: ${listing.isSuperhost ? 'Yes' : 'No'}
    ${listing.instantBook ? 'Instant Book: Yes' : ''}
    ${listing.minimumStay ? `Minimum Stay: ${listing.minimumStay} nights` : ''}
    
    HOST DETAILS:
    ${listing.hostName ? `Name: ${listing.hostName}` : ''}
    ${listing.hostResponseRate ? `Response Rate: ${listing.hostResponseRate}%` : ''}
    ${listing.hostResponseTime ? `Response Time: ${listing.hostResponseTime}` : ''}
    
    REVIEW BREAKDOWN:
    ${listing.reviewCategories ? `
    Cleanliness: ${listing.reviewCategories.cleanliness}/5
    Accuracy: ${listing.reviewCategories.accuracy}/5
    Communication: ${listing.reviewCategories.communication}/5
    Location: ${listing.reviewCategories.location}/5
    Check-in: ${listing.reviewCategories.checkIn}/5
    Value: ${listing.reviewCategories.value}/5
    ` : ''}
    
    ${listing.recentReviews && listing.recentReviews.length > 0 ? `
    RECENT GUEST REVIEWS:
    ${listing.recentReviews.slice(0, 5).map(r => 
      `- "${r.text.slice(0, 200)}..." (${r.author}, ${r.date})`
    ).join('\n')}
    ` : ''}
    
    ${listing.houseRules ? `
    HOUSE RULES:
    Smoking: ${listing.houseRules.smoking ? 'Allowed' : 'Not allowed'}
    Pets: ${listing.houseRules.pets ? 'Allowed' : 'Not allowed'}
    Parties: ${listing.houseRules.parties ? 'Allowed' : 'Not allowed'}
    ` : ''}
    
    Data Quality Score: ${listing.dataQuality || 'N/A'}%

    Provide a JSON response with:
    1. An overall score (0-100)
    2. Scores for photos, description, amenities, reviews, and pricing
    3. Top 5 specific recommendations with priority, impact, and effort
    4. A brief summary

    Response format:
    {
      "score": 75,
      "summary": "Your listing shows good potential...",
      "categories": {
        "photos": { "score": 70, "issue": "Need more photos" },
        "description": { "score": 80 },
        "amenities": { "score": 85 },
        "reviews": { "score": 90 },
        "pricing": { "score": 75, "issue": "Slightly above market" }
      },
      "recommendations": [
        {
          "id": "1",
          "priority": "high",
          "category": "Photos",
          "title": "Add more photos",
          "description": "Listings with 20+ photos get 40% more bookings",
          "impact": "+40% bookings",
          "effort": "easy"
        }
      ]
    }`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    // Try to parse JSON from the response
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0])
        return {
          score: analysis.score || 75,
          summary: analysis.summary || 'Your listing has good potential with room for improvement.',
          categories: analysis.categories || getDefaultCategories(),
          recommendations: analysis.recommendations || [],
          improvedDescription: analysis.improvedDescription
        }
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
    }
    
    return generateMockAnalysis(listing)
  } catch (error) {
    console.error('AI analysis error:', error)
    return generateMockAnalysis(listing)
  }
}

function generateMockAnalysis(listing: AirbnbListingData): AnalysisResult {
  // Calculate a basic score based on available data
  let score = 60 // Base score
  
  if (listing.rating >= 4.8) score += 10
  else if (listing.rating >= 4.5) score += 5
  
  if (listing.reviewCount >= 100) score += 10
  else if (listing.reviewCount >= 50) score += 5
  
  if (listing.isSuperhost) score += 10
  
  if (listing.amenities.length >= 10) score += 5
  
  // Price competitiveness (assuming $150 is average)
  if (listing.price <= 100) score += 5
  else if (listing.price >= 200) score -= 5

  // Generate recommendations based on the listing
  const recommendations: Recommendation[] = []
  
  if (!listing.isSuperhost) {
    recommendations.push({
      id: '1',
      priority: 'high',
      category: 'Host Status',
      title: 'Work towards Superhost status',
      description: 'Superhosts get 22% more bookings on average. Focus on response time and ratings.',
      impact: '+22% bookings',
      effort: 'medium'
    })
  }
  
  if (listing.reviewCount < 50) {
    recommendations.push({
      id: '2',
      priority: 'critical',
      category: 'Reviews',
      title: 'Build up your review count',
      description: `You have ${listing.reviewCount} reviews. Listings with 50+ reviews see 35% more bookings.`,
      impact: '+35% visibility',
      effort: 'hard'
    })
  }
  
  if (listing.amenities.length < 15) {
    recommendations.push({
      id: '3',
      priority: 'medium',
      category: 'Amenities',
      title: 'Highlight more amenities',
      description: 'Add amenities like workspace, coffee maker, or streaming services to stand out.',
      impact: '+15% appeal',
      effort: 'easy'
    })
  }
  
  recommendations.push({
    id: '4',
    priority: 'high',
    category: 'Photos',
    title: 'Professional photography',
    description: 'Professional photos can increase bookings by up to 40%. Airbnb offers free photography in many areas.',
    impact: '+40% bookings',
    effort: 'medium'
  })
  
  recommendations.push({
    id: '5',
    priority: 'medium',
    category: 'Description',
    title: 'Optimize your title and description',
    description: 'Use keywords guests search for. Highlight unique features and nearby attractions.',
    impact: '+20% visibility',
    effort: 'easy'
  })

  return {
    score: Math.min(Math.max(score, 0), 100),
    summary: `Your listing scores ${score}/100. ${
      score >= 80 ? "You're doing great! Focus on the recommendations below to reach the top tier." :
      score >= 60 ? "Good foundation with significant room for improvement. Implementing our top recommendations could boost bookings by 30-50%." :
      "There's substantial opportunity to improve your listing's performance. Start with our critical recommendations."
    }`,
    categories: {
      photos: { 
        score: 70, 
        issue: 'Consider adding more high-quality photos'
      },
      description: { 
        score: 75,
        issue: 'Could be more detailed and keyword-optimized'
      },
      amenities: { 
        score: listing.amenities.length >= 10 ? 85 : 60,
        issue: listing.amenities.length < 10 ? 'List more amenities' : undefined
      },
      reviews: { 
        score: listing.rating >= 4.8 ? 95 : listing.rating >= 4.5 ? 80 : 60,
        issue: listing.reviewCount < 50 ? 'Need more reviews' : undefined
      },
      pricing: { 
        score: 75,
        issue: listing.price > 200 ? 'Price may be above market' : undefined
      }
    },
    recommendations: recommendations.slice(0, 5)
  }
}

function getDefaultCategories() {
  return {
    photos: { score: 70 },
    description: { score: 75 },
    amenities: { score: 80 },
    reviews: { score: 85 },
    pricing: { score: 75 }
  }
}