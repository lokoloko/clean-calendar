import { NextRequest, NextResponse } from 'next/server'
import { scrapeAirbnbListing } from '@/lib/scraper'
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

    // Step 1: Scrape the listing
    const listingData = await scrapeAirbnbListing(url)
    console.log('Scraped data:', {
      title: listingData.title,
      photos: listingData.photos.count,
      reviews: listingData.reviews.count,
      amenities: listingData.amenities.all.length
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