import { NextRequest, NextResponse } from 'next/server'
import { scrapeAirbnbHybrid, hybridToSimplified } from '@/lib/scraper-hybrid'
import { analyzeListingWithAI } from '@/lib/analyzer'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url } = body

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      )
    }

    // Validate Airbnb URL
    if (!url.includes('airbnb.com/rooms/') && !url.includes('airbnb.com/h/')) {
      return NextResponse.json(
        { success: false, error: 'Invalid Airbnb URL' },
        { status: 400 }
      )
    }

    console.log('Analyzing listing:', url)

    // Use hybrid scraper for maximum reliability
    const hybridResult = await scrapeAirbnbHybrid(url)
    const listingData = hybridToSimplified(hybridResult)
    
    console.log('Scraped data:', {
      method: hybridResult.bestMethod,
      title: listingData.title,
      price: listingData.price,
      rating: listingData.rating,
      reviewCount: listingData.reviewCount,
      amenities: listingData.amenities.length,
      dataQuality: listingData.dataQuality,
      hasReviews: (listingData.recentReviews?.length || 0) > 0,
      hasCategories: !!listingData.reviewCategories,
      totalTime: `${hybridResult.totalTime}ms`,
      methodsAttempted: hybridResult.metrics.length,
      successfulMethods: hybridResult.metrics.filter(m => m.success).length
    })

    // Step 2: Analyze with AI
    const analysis = await analyzeListingWithAI(listingData)
    console.log('Analysis complete:', {
      score: analysis.score,
      recommendations: analysis.recommendations.length
    })

    // Step 3: Return combined results
    return NextResponse.json({
      success: true,
      listing: listingData,
      analysis
    })

  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to analyze listing' 
      },
      { status: 500 }
    )
  }
}