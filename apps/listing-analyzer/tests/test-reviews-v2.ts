#!/usr/bin/env node
import { config } from 'dotenv'
import { resolve } from 'path'
import { writeFileSync } from 'fs'
import { scrapeReviewsV2 } from './lib/scraper-reviews-v2'

// Load environment variables
config({ path: resolve(__dirname, '.env.local') })

async function testReviewsV2() {
  const listings = [
    {
      name: 'Listing with 29 reviews',
      url: 'https://www.airbnb.com/rooms/1265375125128052388?check_in=2025-09-16&check_out=2025-09-30'
    },
    {
      name: 'Listing with 4 reviews',
      url: 'https://www.airbnb.com/rooms/1438491833009688203?check_in=2025-09-16&check_out=2025-09-30'
    }
  ]
  
  // Test the first listing (or both if you want)
  const testListing = listings[0]
  
  console.log('🧪 Testing Review Scraper V2 (Improved Scrolling)')
  console.log(`📍 ${testListing.name}`)
  console.log(`URL: ${testListing.url}`)
  console.log('=' .repeat(80))
  
  try {
    const result = await scrapeReviewsV2(testListing.url)
    
    console.log('\n📊 Extraction Results:')
    console.log(`Success: ${result.success ? '✅' : '❌'}`)
    console.log(`Overall Rating: ${result.overallRating || 'N/A'}`)
    console.log(`Total Reviews (from page): ${result.totalCount}`)
    console.log(`Reviews Extracted: ${result.reviews.length}`)
    console.log(`Screenshots Captured: ${result.screenshots.length}`)
    
    if (result.categoryRatings) {
      console.log('\n⭐ Category Ratings:')
      Object.entries(result.categoryRatings).forEach(([key, value]) => {
        if (value > 0) {
          console.log(`  - ${key}: ${value}`)
        }
      })
    }
    
    if (result.reviews.length > 0) {
      console.log('\n💬 Extracted Reviews:')
      result.reviews.forEach((review, i) => {
        console.log(`\n${i + 1}. ${review.reviewer}`)
        if (review.reviewerLocation) {
          console.log(`   From: ${review.reviewerLocation}`)
        }
        if (review.date) {
          console.log(`   Date: ${review.date}`)
        }
        if (review.stayDuration) {
          console.log(`   Stay: ${review.stayDuration}`)
        }
        if (review.review) {
          const text = review.review.length > 150 
            ? review.review.substring(0, 150) + '...'
            : review.review
          console.log(`   Review: "${text}"`)
        }
      })
      
      // Show extraction rate
      if (result.totalCount > 0) {
        const extractionRate = Math.round((result.reviews.length / result.totalCount) * 100)
        console.log(`\n📈 Extraction Rate: ${extractionRate}% (${result.reviews.length}/${result.totalCount})`)
      }
    } else {
      console.log('\n⚠️ No reviews extracted')
    }
    
    // Save screenshots for inspection
    if (result.screenshots.length > 0) {
      console.log(`\n💾 Saving ${result.screenshots.length} screenshots...`)
      result.screenshots.forEach((screenshot, i) => {
        const buffer = Buffer.from(screenshot, 'base64')
        const filename = `review-v2-screenshot-${i}.jpg`
        writeFileSync(filename, buffer)
        console.log(`  - ${filename}`)
      })
    }
    
    // Show debug logs
    if (result.logs.length > 0) {
      console.log('\n🔍 Debug Logs:')
      result.logs.forEach(log => console.log(`  - ${log}`))
    }
    
    // Save results
    const jsonResult = {
      url: testListing.url,
      timestamp: new Date().toISOString(),
      success: result.success,
      overallRating: result.overallRating,
      totalCount: result.totalCount,
      extractedCount: result.reviews.length,
      extractionRate: result.totalCount > 0 
        ? Math.round((result.reviews.length / result.totalCount) * 100)
        : 0,
      reviews: result.reviews,
      screenshotCount: result.screenshots.length
    }
    
    writeFileSync('reviews-v2-results.json', JSON.stringify(jsonResult, null, 2))
    console.log('\n💾 Results saved to reviews-v2-results.json')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run test
testReviewsV2().catch(console.error)