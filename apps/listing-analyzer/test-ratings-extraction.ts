#!/usr/bin/env node
import { config } from 'dotenv'
import { resolve } from 'path'
import { readFileSync } from 'fs'
import { extractRatingsFromScreenshot } from './lib/extract-ratings-only'

// Load environment variables
config({ path: resolve(__dirname, '.env.local') })

async function testRatingsExtraction() {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
  
  if (!geminiKey) {
    throw new Error('Gemini API key not configured')
  }
  
  console.log('🧪 Testing Ratings Extraction from Screenshot')
  console.log('=' .repeat(80))
  
  try {
    // Read the screenshot we already have
    const screenshotPath = 'review-screenshot-0.jpg'
    const screenshotBuffer = readFileSync(screenshotPath)
    const screenshotBase64 = screenshotBuffer.toString('base64')
    
    console.log(`📸 Using screenshot: ${screenshotPath}`)
    console.log('🤖 Extracting ratings with Vision AI...')
    
    const ratings = await extractRatingsFromScreenshot(screenshotBase64, geminiKey)
    
    if (ratings) {
      console.log('\n✅ Ratings Extracted Successfully!\n')
      console.log('📊 Overall Rating:', ratings.overallRating)
      console.log('📝 Total Reviews:', ratings.totalReviews)
      console.log('⭐ Guest Favorite:', ratings.guestFavorite ? 'Yes' : 'No')
      
      console.log('\n📈 Category Ratings:')
      console.log('  - Cleanliness:', ratings.categoryRatings.cleanliness)
      console.log('  - Accuracy:', ratings.categoryRatings.accuracy)
      console.log('  - Check-in:', ratings.categoryRatings.checkIn)
      console.log('  - Communication:', ratings.categoryRatings.communication)
      console.log('  - Location:', ratings.categoryRatings.location)
      if (ratings.categoryRatings.value > 0) {
        console.log('  - Value:', ratings.categoryRatings.value)
      }
      
      // Verify the data looks correct
      console.log('\n🔍 Data Validation:')
      const validRating = ratings.overallRating > 0 && ratings.overallRating <= 5
      const validReviews = ratings.totalReviews > 0
      const validCategories = Object.values(ratings.categoryRatings).some(v => v > 0)
      
      console.log('  - Valid overall rating:', validRating ? '✅' : '❌')
      console.log('  - Valid review count:', validReviews ? '✅' : '❌')
      console.log('  - Valid category ratings:', validCategories ? '✅' : '❌')
      
      if (validRating && validReviews && validCategories) {
        console.log('\n🎉 All ratings extracted successfully!')
      }
      
    } else {
      console.log('\n❌ Failed to extract ratings')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run test
testRatingsExtraction().catch(console.error)