#!/usr/bin/env node
import { config } from 'dotenv'
import { resolve } from 'path'
import { scrapeWithEnhancedFunction } from './lib/scraper-enhanced-function'

// Load environment variables
config({ path: resolve(__dirname, '.env.local') })

async function testEnhancedReviews() {
  const url = 'https://www.airbnb.com/rooms/1438491833009688203?check_in=2025-09-16&check_out=2025-09-30'
  
  console.log('🧪 Testing Enhanced Reviews Extraction')
  console.log(`📍 URL: ${url}`)
  console.log('=' .repeat(80))
  
  try {
    // Run the enhanced scraper
    const listing = await scrapeWithEnhancedFunction(url)
    
    console.log('\n📊 Extraction Results:')
    console.log(`Data Completeness: ${listing.meta?.dataCompleteness}%`)
    console.log(`Modals Captured: ${listing.meta?.modalsCaptured}`)
    
    // Check reviews
    if (listing.reviews) {
      console.log('\n💬 Reviews Extracted:')
      console.log(`Total Reviews: ${listing.reviews.length}`)
      
      listing.reviews.forEach((review, index) => {
        console.log(`\n${index + 1}. ${review.reviewer || 'Anonymous'}`)
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
          const text = review.review.length > 150 
            ? review.review.substring(0, 150) + '...' 
            : review.review
          console.log(`   "${text}"`)
        }
      })
      
      // Check review summary
      if (listing.reviewsSummary) {
        console.log('\n⭐ Review Summary:')
        console.log(`Overall Rating: ${listing.reviewsSummary.averageRating || 'N/A'}`)
        console.log(`Total Count: ${listing.reviewsSummary.reviewCount || 'N/A'}`)
        
        if (listing.reviewsSummary.categoryRatings) {
          console.log('\nCategory Ratings:')
          Object.entries(listing.reviewsSummary.categoryRatings).forEach(([key, value]) => {
            console.log(`  - ${key}: ${value}`)
          })
        }
      }
    } else {
      console.log('\n❌ No reviews extracted')
    }
    
    // Check data quality
    console.log('\n📈 Data Quality Check:')
    const fields = [
      { name: 'Title', value: listing.title },
      { name: 'Reviews', value: listing.reviews?.length || 0 },
      { name: 'Review Summary', value: listing.reviewsSummary },
      { name: 'Amenities', value: listing.amenities?.length || 0 },
      { name: 'Host Info', value: listing.host?.name },
      { name: 'Location', value: listing.location?.address }
    ]
    
    fields.forEach(field => {
      const status = field.value ? '✅' : '❌'
      console.log(`${status} ${field.name}: ${field.value || 'Missing'}`)
    })
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run test
testEnhancedReviews().catch(console.error)