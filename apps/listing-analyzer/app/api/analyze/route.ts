import { NextRequest, NextResponse } from 'next/server'
import { scrapeAirbnbListing } from '@/lib/scraper-working'
import { scrapeAirbnbWithBrowserQL, browserQLToSimplified } from '@/lib/scraper-browserql-enhanced'
import { scrapeAirbnbWithFunction, functionToSimplified } from '@/lib/scraper-function'
import { scrapeAirbnbWithPuppeteer, puppeteerToSimplified } from '@/lib/scraper-puppeteer'
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

    // Try scrapers in order of sophistication
    let listingData
    let scrapingMethod = 'basic'
    
    try {
      // Try Puppeteer WebSocket connection first (most comprehensive)
      console.log('Attempting Puppeteer scrape...')
      const puppeteerData = await scrapeAirbnbWithPuppeteer(url)
      listingData = puppeteerToSimplified(puppeteerData)
      scrapingMethod = 'puppeteer'
      console.log('Puppeteer scrape successful')
    } catch (error) {
      console.log('Puppeteer failed, trying BrowserQL:', error)
      
      try {
        // Try BrowserQL as fallback
        console.log('Attempting BrowserQL scrape...')
        const browserQLData = await scrapeAirbnbWithBrowserQL(url)
        listingData = browserQLToSimplified(browserQLData)
        scrapingMethod = 'browserql'
        console.log('BrowserQL scrape successful')
      } catch (bqlError) {
        console.log('BrowserQL failed, trying Function endpoint:', bqlError)
        
        try {
          // Try Function endpoint (Puppeteer code)
          const functionData = await scrapeAirbnbWithFunction(url)
          listingData = functionToSimplified(functionData)
          scrapingMethod = 'function'
          console.log('Function scrape successful')
        } catch (funcError) {
          console.log('Function failed, using basic scraper:', funcError)
          // Fall back to basic working scraper
          listingData = await scrapeAirbnbListing(url)
          scrapingMethod = 'basic'
        }
      }
    }
    
    console.log('Scraped data:', {
      method: scrapingMethod,
      title: listingData.title,
      price: listingData.price,
      rating: listingData.rating,
      reviewCount: listingData.reviewCount,
      amenities: listingData.amenities.length,
      dataQuality: listingData.dataQuality,
      hasReviews: listingData.recentReviews?.length > 0,
      hasCategories: !!listingData.reviewCategories
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