import { NextRequest, NextResponse } from 'next/server'
import { scrapeAirbnbHybrid } from '@/lib/scraper-hybrid'
import { analyzeListingWithEnhancedAI } from '@/lib/analyzer-enhanced'

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

    // Use hybrid scraper for comprehensive data
    const hybridResult = await scrapeAirbnbHybrid(url)
    const comprehensiveData = hybridResult.listing
    
    console.log('Scraped comprehensive data:', {
      method: hybridResult.bestMethod,
      title: comprehensiveData.title,
      basePrice: comprehensiveData.pricing?.basePrice,
      rating: comprehensiveData.reviews?.summary?.rating,
      reviewCount: comprehensiveData.reviews?.summary?.totalCount,
      amenities: comprehensiveData.amenities?.basic?.length || 0,
      dataCompleteness: comprehensiveData.meta?.dataCompleteness,
      hasReviewDistribution: !!comprehensiveData.reviews?.summary?.distribution,
      hasReviewCategories: !!comprehensiveData.reviews?.summary?.categories,
      totalTime: `${hybridResult.totalTime}ms`,
      methodsAttempted: hybridResult.metrics.length,
      successfulMethods: hybridResult.metrics.filter(m => m.success).length
    })

    // Step 2: Analyze with enhanced AI
    const analysis = await analyzeListingWithEnhancedAI(comprehensiveData)
    console.log('Analysis complete:', {
      score: analysis.score,
      recommendations: analysis.recommendations.length
    })

    // Step 3: Return comprehensive results
    return NextResponse.json({
      success: true,
      data: comprehensiveData,
      analysis,
      metrics: {
        bestMethod: hybridResult.bestMethod,
        totalTime: hybridResult.totalTime,
        dataCompleteness: comprehensiveData.meta?.dataCompleteness || 0
      }
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