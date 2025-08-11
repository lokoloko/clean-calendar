#!/usr/bin/env node
import { config } from 'dotenv'
import { resolve } from 'path'
import { writeFileSync } from 'fs'
import { scrapeReviewsIsolated } from './lib/scraper-reviews-isolated'

// Load environment variables
config({ path: resolve(__dirname, '.env.local') })

async function testIsolatedReviews() {
  const url = 'https://www.airbnb.com/rooms/1265375125128052388?check_in=2025-09-16&check_out=2025-09-30'
  
  console.log('🧪 Testing Isolated Review Scraper (Multi-Screenshot)')
  console.log(`📍 URL: ${url}`)
  console.log('=' .repeat(80))
  
  try {
    // Run the isolated review scraper
    const result = await scrapeReviewsIsolated(url)
    
    console.log('\n📊 Extraction Results:')
    console.log(`Total Reviews Extracted: ${result.reviews.length}`)
    console.log(`Review Count (from page): ${result.totalCount}`)
    console.log(`Overall Rating: ${result.overallRating}`)
    console.log(`Screenshots Captured: ${result.screenshots.length}`)
    
    if (result.categoryRatings && Object.keys(result.categoryRatings).length > 0) {
      console.log('\n⭐ Category Ratings:')
      Object.entries(result.categoryRatings).forEach(([key, value]) => {
        console.log(`  - ${key}: ${value}`)
      })
    }
    
    if (result.reviews.length > 0) {
      console.log('\n💬 Extracted Reviews:')
      result.reviews.forEach((review, index) => {
        console.log(`\n${index + 1}. ${review.reviewer}`)
        if (review.reviewerLocation) {
          console.log(`   From: ${review.reviewerLocation}`)
        }
        if (review.date) {
          console.log(`   Date: ${review.date}`)
        }
        if (review.rating) {
          console.log(`   Rating: ${review.rating} stars`)
        }
        if (review.stayDuration) {
          console.log(`   Stay: ${review.stayDuration}`)
        }
        if (review.review) {
          const text = review.review.length > 200 
            ? review.review.substring(0, 200) + '...' 
            : review.review
          console.log(`   Review: "${text}"`)
        }
        if (review.hostResponse) {
          console.log(`   Host Response: "${review.hostResponse.substring(0, 100)}..."`)
        }
      })
    } else {
      console.log('\n⚠️ No reviews were extracted')
    }
    
    // Save screenshots for debugging
    if (result.screenshots.length > 0) {
      console.log(`\n💾 Saving ${result.screenshots.length} screenshots for inspection...`)
      result.screenshots.forEach((screenshot, i) => {
        const buffer = Buffer.from(screenshot, 'base64')
        const filename = `review-screenshot-${i}.jpg`
        writeFileSync(filename, buffer)
        console.log(`  - ${filename} saved`)
      })
    }
    
    // Save debug logs
    if (result.logs.length > 0) {
      console.log('\n📋 Debug Logs:')
      result.logs.forEach(log => console.log(`  - ${log}`))
    }
    
    // Save results to JSON
    const jsonResult = {
      url,
      timestamp: new Date().toISOString(),
      totalExtracted: result.reviews.length,
      totalCount: result.totalCount,
      overallRating: result.overallRating,
      categoryRatings: result.categoryRatings,
      reviews: result.reviews,
      screenshotCount: result.screenshots.length
    }
    
    writeFileSync('reviews-isolated-results.json', JSON.stringify(jsonResult, null, 2))
    console.log('\n💾 Results saved to reviews-isolated-results.json')
    
    // Performance summary
    console.log('\n📈 Performance Summary:')
    console.log(`  - Extraction Rate: ${Math.round((result.reviews.length / result.totalCount) * 100)}%`)
    console.log(`  - Reviews per Screenshot: ${(result.reviews.length / result.screenshots.length).toFixed(1)}`)
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run test
testIsolatedReviews().catch(console.error)