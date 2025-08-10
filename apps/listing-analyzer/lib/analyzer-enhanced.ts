import { GoogleGenerativeAI } from '@google/generative-ai'
import type { ComprehensiveAirbnbListing } from './types/listing'

export interface EnhancedAnalysisResult {
  score: number // 0-100
  summary: string
  competitivePosition: 'leader' | 'above-average' | 'average' | 'below-average' | 'needs-work'
  
  categories: {
    photos: { score: number; insights: string[]; actionItems: string[] }
    description: { score: number; insights: string[]; actionItems: string[] }
    amenities: { score: number; insights: string[]; actionItems: string[] }
    reviews: { score: number; insights: string[]; actionItems: string[] }
    pricing: { score: number; insights: string[]; actionItems: string[] }
    host: { score: number; insights: string[]; actionItems: string[] }
    safety: { score: number; insights: string[]; actionItems: string[] }
  }
  
  recommendations: EnhancedRecommendation[]
  
  marketInsights: {
    optimalPrice: number
    suggestedDiscounts: { weekly: number; monthly: number }
    peakSeasonMultiplier: number
    targetOccupancy: number
  }
  
  guestPersona: {
    primaryType: string // e.g., "Business travelers", "Families", "Digital nomads"
    preferences: string[]
    painPoints: string[]
  }
  
  improvedContent: {
    title?: string
    description?: string
    highlights?: string[]
  }
  
  riskFactors: string[]
  opportunities: string[]
  competitiveAdvantages: string[]
}

export interface EnhancedRecommendation {
  id: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  category: string
  title: string
  description: string
  impact: {
    bookings: string // e.g., "+30%"
    revenue: string // e.g., "+$5,000/year"
    rating: string // e.g., "+0.2 stars"
  }
  effort: 'quick-win' | 'easy' | 'medium' | 'hard'
  timeframe: string // e.g., "1 day", "1 week", "1 month"
  cost: string // e.g., "$0", "$100-500", "$500+"
}

export async function analyzeListingWithEnhancedAI(
  listing: ComprehensiveAirbnbListing
): Promise<EnhancedAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
  
  if (!apiKey) {
    console.warn('Gemini API key not configured, using enhanced mock analysis')
    return generateEnhancedMockAnalysis(listing)
  }

  // Use Pro model now that billing is enabled
  let modelName = 'gemini-1.5-pro'
  let maxTokens = 8192
  
  const tryWithModel = async (useFlash = false): Promise<EnhancedAnalysisResult> => {
    if (useFlash) {
      modelName = 'gemini-1.5-flash'
      maxTokens = 4096
      console.log('Falling back to Flash model due to rate limits')
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ 
      model: modelName,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: maxTokens,
      }
    })

    const prompt = createEnhancedPrompt(listing)
    
    // Retry logic for rate limiting
    let retries = 3
    let delay = 1000 // Start with 1 second
    
    while (retries > 0) {
      try {
        console.log(`Attempting Gemini analysis with ${modelName}...`)
        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()
    
        // Parse and validate the response
        try {
          const jsonMatch = text.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const analysis = JSON.parse(jsonMatch[0]) as EnhancedAnalysisResult
            console.log(`Successfully analyzed with ${modelName}`)
            return validateAndEnrichAnalysis(analysis, listing)
          }
        } catch (parseError) {
          console.error('Failed to parse enhanced AI response:', parseError)
        }
        
        return generateEnhancedMockAnalysis(listing)
      } catch (error: any) {
        // Check if it's a rate limit error
        if (error?.status === 429 || error?.message?.includes('429')) {
          console.log(`Rate limited on ${modelName}, retrying in ${delay}ms... (${retries} retries left)`)
          await new Promise(resolve => setTimeout(resolve, delay))
          delay *= 2 // Exponential backoff
          retries--
          
          // If we've tried Pro model and still rate limited, switch to Flash
          if (retries === 1 && modelName === 'gemini-1.5-pro') {
            return tryWithModel(true) // Try with Flash model
          }
        } else {
          throw error // Re-throw non-rate-limit errors
        }
      }
    }
    
    // If Pro model failed, try Flash as last resort
    if (modelName === 'gemini-1.5-pro') {
      console.log('Pro model rate limited, trying Flash model...')
      return tryWithModel(true)
    }
    
    console.warn('All models rate limited, using enhanced mock analysis')
    return generateEnhancedMockAnalysis(listing)
  }
  
  // Start with Pro model
  try {
    return await tryWithModel(false)
  } catch (error) {
    console.error('Enhanced AI analysis error:', error)
    return generateEnhancedMockAnalysis(listing)
  }
}

function createEnhancedPrompt(listing: ComprehensiveAirbnbListing): string {
  // Calculate key metrics
  const reviewScore = listing.reviews?.summary?.rating || 0
  const reviewCount = listing.reviews?.summary?.totalCount || 0
  const distribution = listing.reviews?.summary?.distribution || {}
  const categories = listing.reviews?.summary?.categories || {}
  const amenityCount = listing.amenities?.basic?.length || 0
  const photoCount = listing.photos?.length || 0
  const hasDescriptionSections = listing.descriptionSections ? 
    Object.values(listing.descriptionSections).filter(v => v).length : 0

  // Use a more concise prompt for free tier efficiency
  return `
You are an elite Airbnb consultant with deep expertise in revenue optimization, guest psychology, and market positioning. Analyze this comprehensive listing data and provide strategic insights that will transform this property's performance.

## COMPREHENSIVE LISTING DATA

### Basic Information
- Title: ${listing.title}
- Subtitle: ${listing.subtitle || 'Not provided'}
- Property Type: ${listing.propertyType}
- Listing URL: ${listing.url}
- Data Completeness: ${listing.meta?.dataCompleteness || 0}%

### Pricing Structure
- Base Price: $${listing.pricing?.basePrice || 0}/night
- Cleaning Fee: $${listing.pricing?.cleaningFee || 0}
- Service Fee: $${listing.pricing?.serviceFee || 0}
- Weekly Discount: ${listing.pricing?.weeklyDiscount || 0}%
- Monthly Discount: ${listing.pricing?.monthlyDiscount || 0}%
- Total First Night: $${(listing.pricing?.basePrice || 0) + (listing.pricing?.cleaningFee || 0) + (listing.pricing?.serviceFee || 0)}

### Space Configuration
- Guest Capacity: ${listing.guestCapacity?.total || 0} (Adults: ${listing.guestCapacity?.adults || 0})
- Bedrooms: ${listing.spaces?.bedrooms || 0}
- Beds: ${listing.spaces?.beds || 0}
- Bathrooms: ${listing.spaces?.bathrooms || 0}

### Review Analytics
- Overall Rating: ${reviewScore}/5.0 (${reviewCount} reviews)
- 5-star reviews: ${distribution[5] || 0}%
- 4-star reviews: ${distribution[4] || 0}%
- 3-star reviews: ${distribution[3] || 0}%
- 2-star reviews: ${distribution[2] || 0}%
- 1-star reviews: ${distribution[1] || 0}%

### Review Categories
- Cleanliness: ${categories.cleanliness || 'N/A'}/5.0
- Accuracy: ${categories.accuracy || 'N/A'}/5.0
- Check-in: ${categories.checkIn || 'N/A'}/5.0
- Communication: ${categories.communication || 'N/A'}/5.0
- Location: ${categories.location || 'N/A'}/5.0
- Value: ${categories.value || 'N/A'}/5.0

### Recent Guest Feedback
${listing.reviews?.recentReviews?.slice(0, 5).map(r => 
  `- "${r.text.slice(0, 200)}..." (${r.author}, ${r.date})`
).join('\n') || 'No recent reviews available'}

### Host Performance
- Name: ${listing.host?.name || 'Unknown'}
- Superhost: ${listing.host?.isSuperhost ? 'Yes ✓' : 'No ✗'}
- Response Rate: ${listing.host?.responseRate || 'Unknown'}%
- Response Time: ${listing.host?.responseTime || 'Unknown'}
- Hosting Since: ${listing.host?.hostingSince || 'Unknown'}
- Identity Verified: ${listing.host?.verifiedIdentity ? 'Yes' : 'No'}

### Amenities (${amenityCount} total)
Essential Amenities:
${listing.amenities?.basic?.slice(0, 20).join(', ') || 'None listed'}

Safety Features:
${listing.amenities?.homeSafety?.join(', ') || 'None listed'}

### House Rules
- Check-in: ${listing.houseRules?.checkIn?.time || 'Not specified'}
- Check-out: ${listing.houseRules?.checkOut?.time || 'Not specified'}
- Smoking: ${listing.houseRules?.during?.smoking === false ? 'Not allowed' : 'Allowed/Not specified'}
- Pets: ${listing.houseRules?.during?.pets === false ? 'Not allowed' : 'Allowed/Not specified'}
- Parties: ${listing.houseRules?.during?.parties === false ? 'Not allowed' : 'Allowed/Not specified'}
- Quiet Hours: ${listing.houseRules?.during?.quietHours || 'Not specified'}

### Cancellation Policy
- Type: ${listing.cancellationPolicy?.type || 'Unknown'}
- Description: ${listing.cancellationPolicy?.description || 'Not provided'}

### Description Quality
- Word Count: ${listing.description?.split(' ').length || 0}
- Has Overview: ${listing.descriptionSections?.overview ? 'Yes' : 'No'}
- Has Space Details: ${listing.descriptionSections?.theSpace ? 'Yes' : 'No'}
- Has Guest Access: ${listing.descriptionSections?.guestAccess ? 'Yes' : 'No'}
- Has Other Notes: ${listing.descriptionSections?.otherThingsToNote ? 'Yes' : 'No'}
- Sections Completed: ${hasDescriptionSections}/5

### Visual Content
- Total Photos: ${photoCount}
- Photo Quality: ${photoCount >= 30 ? 'Excellent' : photoCount >= 20 ? 'Good' : photoCount >= 10 ? 'Fair' : 'Poor'}

## ANALYSIS REQUIREMENTS

Provide a comprehensive JSON analysis with the following structure:

{
  "score": [0-100 overall score based on all factors],
  "summary": "[2-3 sentence executive summary of the listing's performance and potential]",
  "competitivePosition": "[leader|above-average|average|below-average|needs-work]",
  
  "categories": {
    "photos": {
      "score": [0-100],
      "insights": [
        "Key observation about photo quality/quantity",
        "Impact on booking conversion"
      ],
      "actionItems": [
        "Specific photo to add",
        "Angle or room to capture"
      ]
    },
    "description": {
      "score": [0-100],
      "insights": [
        "Analysis of description completeness",
        "SEO and keyword effectiveness"
      ],
      "actionItems": [
        "Sections to add or expand",
        "Keywords to incorporate"
      ]
    },
    "amenities": {
      "score": [0-100],
      "insights": [
        "Coverage of essential amenities",
        "Unique differentiators present/missing"
      ],
      "actionItems": [
        "Must-have amenities to add",
        "Premium amenities to consider"
      ]
    },
    "reviews": {
      "score": [0-100],
      "insights": [
        "Sentiment analysis from recent reviews",
        "Pattern in lower ratings"
      ],
      "actionItems": [
        "Areas needing immediate attention",
        "Response strategy for reviews"
      ]
    },
    "pricing": {
      "score": [0-100],
      "insights": [
        "Price positioning vs perceived value",
        "Fee structure analysis"
      ],
      "actionItems": [
        "Pricing adjustments needed",
        "Discount strategy optimization"
      ]
    },
    "host": {
      "score": [0-100],
      "insights": [
        "Host performance metrics",
        "Trust factors analysis"
      ],
      "actionItems": [
        "Steps to Superhost status",
        "Response time improvements"
      ]
    },
    "safety": {
      "score": [0-100],
      "insights": [
        "Safety feature coverage",
        "Compliance with standards"
      ],
      "actionItems": [
        "Critical safety additions",
        "Trust-building features"
      ]
    }
  },
  
  "recommendations": [
    {
      "id": "1",
      "priority": "critical",
      "category": "Category Name",
      "title": "Specific action title",
      "description": "Detailed explanation of what to do and why",
      "impact": {
        "bookings": "+X%",
        "revenue": "+$X/year",
        "rating": "+X stars"
      },
      "effort": "quick-win",
      "timeframe": "X days",
      "cost": "$X"
    }
  ],
  
  "marketInsights": {
    "optimalPrice": [Suggested nightly rate based on value provided],
    "suggestedDiscounts": {
      "weekly": [Optimal weekly discount %],
      "monthly": [Optimal monthly discount %]
    },
    "peakSeasonMultiplier": [Multiplier for peak season, e.g., 1.3],
    "targetOccupancy": [Target occupancy rate %]
  },
  
  "guestPersona": {
    "primaryType": "[Business travelers|Families|Couples|Digital nomads|Budget travelers]",
    "preferences": [
      "What this guest type values most",
      "Second preference"
    ],
    "painPoints": [
      "Common complaint for this property type",
      "Another pain point to address"
    ]
  },
  
  "improvedContent": {
    "title": "[Optimized listing title with keywords]",
    "highlights": [
      "Bullet point highlight 1",
      "Bullet point highlight 2",
      "Bullet point highlight 3"
    ]
  },
  
  "riskFactors": [
    "Major risk or red flag identified",
    "Another risk to address"
  ],
  
  "opportunities": [
    "Untapped opportunity for growth",
    "Market trend to capitalize on"
  ],
  
  "competitiveAdvantages": [
    "Unique strength of this listing",
    "Another differentiator"
  ]
}

Base your analysis on:
1. The actual data provided (don't make assumptions)
2. Industry best practices for vacation rentals
3. Guest psychology and booking behavior
4. Revenue optimization strategies
5. The specific review feedback and ratings distribution

Provide actionable, specific recommendations that the host can implement immediately. Focus on quick wins that will have measurable impact on bookings and revenue.
`
}

function validateAndEnrichAnalysis(
  analysis: any,
  listing: ComprehensiveAirbnbListing
): EnhancedAnalysisResult {
  // Ensure all required fields exist with defaults
  return {
    score: analysis.score || calculateSmartScore(listing),
    summary: analysis.summary || generateSmartSummary(listing),
    competitivePosition: analysis.competitivePosition || determinePosition(listing),
    
    categories: {
      photos: analysis.categories?.photos || generateCategoryAnalysis('photos', listing),
      description: analysis.categories?.description || generateCategoryAnalysis('description', listing),
      amenities: analysis.categories?.amenities || generateCategoryAnalysis('amenities', listing),
      reviews: analysis.categories?.reviews || generateCategoryAnalysis('reviews', listing),
      pricing: analysis.categories?.pricing || generateCategoryAnalysis('pricing', listing),
      host: analysis.categories?.host || generateCategoryAnalysis('host', listing),
      safety: analysis.categories?.safety || generateCategoryAnalysis('safety', listing),
    },
    
    recommendations: analysis.recommendations || generateSmartRecommendations(listing),
    
    marketInsights: analysis.marketInsights || {
      optimalPrice: listing.pricing?.basePrice || 150,
      suggestedDiscounts: { weekly: 10, monthly: 20 },
      peakSeasonMultiplier: 1.3,
      targetOccupancy: 65
    },
    
    guestPersona: analysis.guestPersona || {
      primaryType: 'General travelers',
      preferences: ['Clean accommodation', 'Good location'],
      painPoints: ['Unclear check-in process', 'Hidden fees']
    },
    
    improvedContent: analysis.improvedContent || {},
    riskFactors: analysis.riskFactors || [],
    opportunities: analysis.opportunities || [],
    competitiveAdvantages: analysis.competitiveAdvantages || []
  }
}

function calculateSmartScore(listing: ComprehensiveAirbnbListing): number {
  let score = 50 // Base score
  
  // Review score impact (30 points max)
  const rating = listing.reviews?.summary?.rating || 0
  if (rating >= 4.9) score += 30
  else if (rating >= 4.8) score += 25
  else if (rating >= 4.7) score += 20
  else if (rating >= 4.5) score += 15
  else if (rating >= 4.0) score += 10
  
  // Review volume impact (10 points max)
  const reviewCount = listing.reviews?.summary?.totalCount || 0
  if (reviewCount >= 100) score += 10
  else if (reviewCount >= 50) score += 7
  else if (reviewCount >= 25) score += 5
  else if (reviewCount >= 10) score += 3
  
  // Host factors (15 points max)
  if (listing.host?.isSuperhost) score += 10
  if ((listing.host?.responseRate || 0) >= 95) score += 3
  if (listing.host?.responseTime?.includes('hour')) score += 2
  
  // Amenities (10 points max)
  const amenityCount = listing.amenities?.basic?.length || 0
  if (amenityCount >= 30) score += 10
  else if (amenityCount >= 20) score += 7
  else if (amenityCount >= 15) score += 5
  else if (amenityCount >= 10) score += 3
  
  // Photos (10 points max)
  const photoCount = listing.photos?.length || 0
  if (photoCount >= 30) score += 10
  else if (photoCount >= 20) score += 7
  else if (photoCount >= 15) score += 5
  else if (photoCount >= 10) score += 3
  
  // Description completeness (5 points max)
  const descSections = listing.descriptionSections
  if (descSections) {
    const filledSections = Object.values(descSections).filter(v => v).length
    score += filledSections
  }
  
  // Safety features (5 points max)
  const safetyCount = listing.amenities?.homeSafety?.length || 0
  score += Math.min(safetyCount, 5)
  
  // Pricing competitiveness (5 points max)
  const hasDiscounts = (listing.pricing?.weeklyDiscount || 0) > 0 || 
                       (listing.pricing?.monthlyDiscount || 0) > 0
  if (hasDiscounts) score += 5
  
  return Math.min(Math.max(score, 0), 100)
}

function generateSmartSummary(listing: ComprehensiveAirbnbListing): string {
  const score = calculateSmartScore(listing)
  const rating = listing.reviews?.summary?.rating || 0
  const reviewCount = listing.reviews?.summary?.totalCount || 0
  
  if (score >= 85) {
    return `Excellent listing performing in the top 10% of properties. With ${rating}/5.0 from ${reviewCount} reviews and ${listing.host?.isSuperhost ? 'Superhost status' : 'strong host metrics'}, this property is well-positioned for premium pricing and high occupancy.`
  } else if (score >= 70) {
    return `Strong listing with above-average performance. The ${rating}/5.0 rating from ${reviewCount} reviews shows solid guest satisfaction, but specific improvements in amenities and presentation could unlock 20-30% revenue growth.`
  } else if (score >= 55) {
    return `Average performing listing with significant optimization potential. Current ${rating}/5.0 rating indicates guest satisfaction issues that need addressing. Implementing our recommendations could improve bookings by 40-50%.`
  } else {
    return `This listing needs substantial improvements to compete effectively. With targeted enhancements to reviews, amenities, and host performance, this property could double its booking rate within 3 months.`
  }
}

function determinePosition(listing: ComprehensiveAirbnbListing): 'leader' | 'above-average' | 'average' | 'below-average' | 'needs-work' {
  const score = calculateSmartScore(listing)
  if (score >= 85) return 'leader'
  if (score >= 70) return 'above-average'
  if (score >= 55) return 'average'
  if (score >= 40) return 'below-average'
  return 'needs-work'
}

function generateCategoryAnalysis(category: string, listing: ComprehensiveAirbnbListing): any {
  // Generate intelligent analysis for each category based on the data
  const analyses: Record<string, any> = {
    photos: {
      score: Math.min((listing.photos?.length || 0) * 3.33, 100),
      insights: [
        `Currently ${listing.photos?.length || 0} photos - ${listing.photos?.length >= 30 ? 'excellent coverage' : 'needs more photos'}`,
        `Photo coverage impacts conversion by up to 40%`
      ],
      actionItems: listing.photos?.length < 20 ? [
        'Add photos of all rooms and spaces',
        'Include lifestyle shots with good lighting'
      ] : ['Consider professional photography for hero images']
    },
    reviews: {
      score: ((listing.reviews?.summary?.rating || 0) / 5) * 100,
      insights: [
        `${listing.reviews?.summary?.totalCount || 0} reviews with ${listing.reviews?.summary?.rating || 0}/5.0 average`,
        listing.reviews?.summary?.categories?.cleanliness < 4.7 ? 'Cleanliness scores need attention' : 'Strong category scores across the board'
      ],
      actionItems: [
        listing.reviews?.summary?.totalCount < 30 ? 'Focus on getting more reviews through follow-ups' : 'Maintain review quality',
        'Address any recurring complaints in recent reviews'
      ]
    },
    amenities: {
      score: Math.min((listing.amenities?.basic?.length || 0) * 2, 100),
      insights: [
        `${listing.amenities?.basic?.length || 0} amenities listed`,
        'Key amenities affect search ranking significantly'
      ],
      actionItems: [
        'Add missing essential amenities',
        'Highlight unique features that differentiate'
      ]
    },
    pricing: {
      score: 75, // Default, would need market data for accurate scoring
      insights: [
        `Base price $${listing.pricing?.basePrice}/night`,
        (listing.pricing?.cleaningFee || 0) > (listing.pricing?.basePrice || 150) * 0.5 ? 'High cleaning fee may deter short stays' : 'Fee structure is balanced'
      ],
      actionItems: [
        !listing.pricing?.weeklyDiscount ? 'Add weekly discount to attract longer stays' : 'Discount strategy in place',
        'Consider dynamic pricing for peak seasons'
      ]
    },
    host: {
      score: listing.host?.isSuperhost ? 90 : 60,
      insights: [
        listing.host?.isSuperhost ? 'Superhost status is a major advantage' : 'Not yet a Superhost',
        `Response rate: ${listing.host?.responseRate || 'Unknown'}%`
      ],
      actionItems: listing.host?.isSuperhost ? [
        'Maintain Superhost requirements'
      ] : [
        'Work towards Superhost status',
        'Improve response time to under 1 hour'
      ]
    },
    description: {
      score: listing.description ? Math.min(listing.description.split(' ').length / 5, 100) : 20,
      insights: [
        `Description has ${listing.description?.split(' ').length || 0} words`,
        listing.descriptionSections?.theSpace ? 'Good section coverage' : 'Missing key description sections'
      ],
      actionItems: [
        'Expand description to 500+ words',
        'Add local attraction information'
      ]
    },
    safety: {
      score: Math.min((listing.amenities?.homeSafety?.length || 0) * 15, 100),
      insights: [
        `${listing.amenities?.homeSafety?.length || 0} safety features listed`,
        'Safety features build trust and are often required'
      ],
      actionItems: [
        'Add smoke and CO detectors if missing',
        'Include first aid kit and fire extinguisher'
      ]
    }
  }
  
  return analyses[category] || { score: 50, insights: [], actionItems: [] }
}

function generateSmartRecommendations(listing: ComprehensiveAirbnbListing): EnhancedRecommendation[] {
  const recommendations: EnhancedRecommendation[] = []
  
  // Photo recommendations
  if ((listing.photos?.length || 0) < 20) {
    recommendations.push({
      id: '1',
      priority: 'high',
      category: 'Photos',
      title: 'Add more high-quality photos',
      description: `You have ${listing.photos?.length || 0} photos. Listings with 20+ photos get 40% more bookings. Add photos of all spaces, amenities, and local attractions.`,
      impact: {
        bookings: '+40%',
        revenue: `+$${Math.round((listing.pricing?.basePrice || 150) * 0.4 * 0.65 * 365)}/year`,
        rating: '+0.1 stars'
      },
      effort: 'easy',
      timeframe: '1 day',
      cost: '$0'
    })
  }
  
  // Review recommendations
  if ((listing.reviews?.summary?.totalCount || 0) < 30) {
    recommendations.push({
      id: '2',
      priority: 'critical',
      category: 'Reviews',
      title: 'Build review volume',
      description: 'Send personalized follow-up messages 2 days after checkout asking for reviews. Mention specific highlights of their stay.',
      impact: {
        bookings: '+35%',
        revenue: `+$${Math.round((listing.pricing?.basePrice || 150) * 0.35 * 0.65 * 365)}/year`,
        rating: '+0.2 stars'
      },
      effort: 'medium',
      timeframe: '3 months',
      cost: '$0'
    })
  }
  
  // Superhost recommendation
  if (!listing.host?.isSuperhost) {
    recommendations.push({
      id: '3',
      priority: 'high',
      category: 'Host Status',
      title: 'Achieve Superhost status',
      description: 'Superhosts earn 22% more on average. Maintain 4.8+ rating, 90%+ response rate, <1hr response time, and 10+ stays/year.',
      impact: {
        bookings: '+22%',
        revenue: `+$${Math.round((listing.pricing?.basePrice || 150) * 0.22 * 0.65 * 365)}/year`,
        rating: '+0.3 stars'
      },
      effort: 'hard',
      timeframe: '3 months',
      cost: '$0'
    })
  }
  
  // Pricing recommendations
  if (!listing.pricing?.weeklyDiscount && !listing.pricing?.monthlyDiscount) {
    recommendations.push({
      id: '4',
      priority: 'medium',
      category: 'Pricing',
      title: 'Add length-of-stay discounts',
      description: 'Offer 10% weekly and 20% monthly discounts to increase average booking length and reduce turnover costs.',
      impact: {
        bookings: '+15%',
        revenue: `+$${Math.round((listing.pricing?.basePrice || 150) * 0.1 * 0.65 * 365)}/year`,
        rating: '+0.0 stars'
      },
      effort: 'quick-win',
      timeframe: '5 minutes',
      cost: '$0'
    })
  }
  
  // Category-specific recommendations based on low scores
  const categories = listing.reviews?.summary?.categories || {}
  if (categories.cleanliness && categories.cleanliness < 4.7) {
    recommendations.push({
      id: '5',
      priority: 'critical',
      category: 'Operations',
      title: 'Improve cleanliness standards',
      description: `Cleanliness score is ${categories.cleanliness}/5.0. Implement a detailed cleaning checklist and consider professional cleaning service.`,
      impact: {
        bookings: '+25%',
        revenue: `+$${Math.round((listing.pricing?.basePrice || 150) * 0.25 * 0.65 * 365)}/year`,
        rating: '+0.4 stars'
      },
      effort: 'medium',
      timeframe: '1 week',
      cost: '$100-200/month'
    })
  }
  
  return recommendations.slice(0, 7) // Return top 7 recommendations
}

function generateEnhancedMockAnalysis(listing: ComprehensiveAirbnbListing): EnhancedAnalysisResult {
  const score = calculateSmartScore(listing)
  
  return {
    score,
    summary: generateSmartSummary(listing),
    competitivePosition: determinePosition(listing),
    
    categories: {
      photos: generateCategoryAnalysis('photos', listing),
      description: generateCategoryAnalysis('description', listing),
      amenities: generateCategoryAnalysis('amenities', listing),
      reviews: generateCategoryAnalysis('reviews', listing),
      pricing: generateCategoryAnalysis('pricing', listing),
      host: generateCategoryAnalysis('host', listing),
      safety: generateCategoryAnalysis('safety', listing),
    },
    
    recommendations: generateSmartRecommendations(listing),
    
    marketInsights: {
      optimalPrice: Math.round((listing.pricing?.basePrice || 150) * 
        (listing.reviews?.summary?.rating >= 4.8 ? 1.1 : 1.0)),
      suggestedDiscounts: {
        weekly: listing.pricing?.weeklyDiscount || 10,
        monthly: listing.pricing?.monthlyDiscount || 20
      },
      peakSeasonMultiplier: 1.3,
      targetOccupancy: 65
    },
    
    guestPersona: {
      primaryType: determineGuestType(listing),
      preferences: [
        'Clean and well-maintained space',
        'Clear communication',
        'Accurate listing description'
      ],
      painPoints: [
        'Hidden fees',
        'Unclear check-in process',
        'Inaccurate photos'
      ]
    },
    
    improvedContent: {
      title: generateOptimizedTitle(listing),
      highlights: [
        `★${listing.reviews?.summary?.rating || 0} Rating · ${listing.reviews?.summary?.totalCount || 0} Reviews`,
        listing.host?.isSuperhost ? '🏆 Superhost' : '✓ Verified Host',
        `${listing.spaces?.bedrooms || 0} BR · ${listing.spaces?.bathrooms || 0} BA · Sleeps ${listing.guestCapacity?.total || 0}`
      ]
    },
    
    riskFactors: identifyRisks(listing),
    opportunities: identifyOpportunities(listing),
    competitiveAdvantages: identifyAdvantages(listing)
  }
}

function determineGuestType(listing: ComprehensiveAirbnbListing): string {
  const hasWorkspace = listing.amenities?.basic?.some(a => 
    a.toLowerCase().includes('workspace') || a.toLowerCase().includes('desk')
  )
  const hasFamily = listing.amenities?.basic?.some(a => 
    a.toLowerCase().includes('crib') || a.toLowerCase().includes('high chair')
  )
  const price = listing.pricing?.basePrice || 150
  
  if (hasWorkspace && listing.pricing?.monthlyDiscount) return 'Digital nomads'
  if (hasFamily) return 'Families'
  if (price > 300) return 'Luxury travelers'
  if (price < 100) return 'Budget travelers'
  if (listing.spaces?.bedrooms === 1) return 'Couples'
  return 'General travelers'
}

function generateOptimizedTitle(listing: ComprehensiveAirbnbListing): string {
  const features: string[] = []
  
  if (listing.host?.isSuperhost) features.push('Superhost')
  if (listing.reviews?.summary?.rating >= 4.8) features.push('★4.8+')
  if (listing.amenities?.basic?.some(a => a.toLowerCase().includes('pool'))) features.push('Pool')
  if (listing.amenities?.basic?.some(a => a.toLowerCase().includes('hot tub'))) features.push('Hot Tub')
  if (listing.amenities?.basic?.some(a => a.toLowerCase().includes('view'))) features.push('Great Views')
  
  const prefix = features.length > 0 ? features.slice(0, 2).join('·') + ' ' : ''
  const suffix = ` · ${listing.spaces?.bedrooms || 0}BR ${listing.propertyType}`
  
  return prefix + (listing.title?.slice(0, 50) || 'Cozy Stay') + suffix
}

function identifyRisks(listing: ComprehensiveAirbnbListing): string[] {
  const risks: string[] = []
  
  if ((listing.reviews?.summary?.rating || 0) < 4.5) {
    risks.push('Low rating affecting visibility and bookings')
  }
  if ((listing.reviews?.summary?.totalCount || 0) < 10) {
    risks.push('Insufficient reviews for guest trust')
  }
  if (!listing.host?.isSuperhost && (listing.host?.responseRate || 0) < 90) {
    risks.push('Poor response metrics damaging booking potential')
  }
  if ((listing.photos?.length || 0) < 10) {
    risks.push('Insufficient photos leading to low conversion')
  }
  if (listing.reviews?.summary?.categories?.cleanliness < 4.5) {
    risks.push('Cleanliness issues causing negative reviews')
  }
  
  return risks
}

function identifyOpportunities(listing: ComprehensiveAirbnbListing): string[] {
  const opportunities: string[] = []
  
  if (!listing.pricing?.weeklyDiscount) {
    opportunities.push('Add weekly discounts to attract longer stays')
  }
  if (!listing.host?.isSuperhost) {
    opportunities.push('Achieve Superhost status for 22% revenue boost')
  }
  if ((listing.amenities?.basic?.length || 0) < 20) {
    opportunities.push('Expand amenity list to improve search ranking')
  }
  if (!listing.amenities?.basic?.some(a => a.toLowerCase().includes('workspace'))) {
    opportunities.push('Add workspace amenities for remote workers')
  }
  if ((listing.pricing?.cleaningFee || 0) > (listing.pricing?.basePrice || 150) * 0.5) {
    opportunities.push('Optimize fee structure for short stays')
  }
  
  return opportunities
}

function identifyAdvantages(listing: ComprehensiveAirbnbListing): string[] {
  const advantages: string[] = []
  
  if (listing.host?.isSuperhost) {
    advantages.push('Superhost badge builds instant trust')
  }
  if ((listing.reviews?.summary?.rating || 0) >= 4.8) {
    advantages.push('Exceptional rating above market average')
  }
  if ((listing.reviews?.summary?.totalCount || 0) >= 50) {
    advantages.push('Strong review volume establishes credibility')
  }
  if ((listing.amenities?.basic?.length || 0) >= 30) {
    advantages.push('Comprehensive amenity offering')
  }
  if (listing.amenities?.basic?.some(a => 
    a.toLowerCase().includes('pool') || 
    a.toLowerCase().includes('hot tub') || 
    a.toLowerCase().includes('sauna')
  )) {
    advantages.push('Premium amenities justify higher pricing')
  }
  
  return advantages
}