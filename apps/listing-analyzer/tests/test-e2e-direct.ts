import { scrapeWithEnhancedFunction } from './lib/scraper-enhanced-function';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';

dotenv.config();

const TEST_URL = 'https://www.airbnb.com/rooms/726982912243440937';

async function testE2EWithGemini() {
  console.log('🚀 End-to-End Test with Gemini Vision AI');
  console.log('URL:', TEST_URL);
  console.log('═'.repeat(80) + '\n');

  // Step 1: Check environment configuration
  console.log('🔧 Step 1: Checking Configuration...\n');
  
  const geminiKey = process.env.GEMINI_API_KEY;
  const browserlessKey = process.env.BROWSERLESS_API_KEY;
  
  if (!geminiKey) {
    console.error('❌ GEMINI_API_KEY not found in environment');
    return;
  }
  console.log('✅ Gemini API Key:', geminiKey.substring(0, 7) + '...');
  
  if (!browserlessKey) {
    console.error('❌ BROWSERLESS_API_KEY not found in environment');
    return;
  }
  console.log('✅ Browserless API Key:', browserlessKey.substring(0, 10) + '...');

  // Step 2: Run the enhanced scraper
  console.log('\n📊 Step 2: Running Enhanced Scraper with Vision AI...\n');
  
  try {
    const startTime = Date.now();
    const result = await scrapeWithEnhancedFunction(TEST_URL);
    const endTime = Date.now();
    
    console.log('✅ Scraping Complete!');
    console.log(`  Time taken: ${(endTime - startTime) / 1000}s`);
    console.log(`  Data completeness: ${result.meta?.dataCompleteness}%`);
    console.log(`  Modals captured: ${result.meta?.modalsCaptured}`);
    
    // Step 3: Display extracted data
    console.log('\n📋 Step 3: Extracted Data Summary\n');
    console.log('─'.repeat(40));
    
    console.log('\n🏠 Property Details:');
    console.log(`  Title: ${result.title}`);
    console.log(`  Type: ${result.propertyType}`);
    console.log(`  Host: ${result.host?.name}${result.host?.isSuperhost ? ' ⭐ (Superhost)' : ''}`);
    console.log(`  Location: ${result.location?.city}, ${result.location?.state || result.location?.country}`);
    
    console.log('\n🛏️ Spaces:');
    console.log(`  Bedrooms: ${result.spaces?.bedrooms}`);
    console.log(`  Beds: ${result.spaces?.beds}`);
    console.log(`  Bathrooms: ${result.spaces?.bathrooms}`);
    console.log(`  Max Guests: ${result.guestCapacity?.total}`);
    
    console.log('\n💰 Pricing:');
    console.log(`  Base Price: $${result.pricing?.basePrice}/night`);
    console.log(`  Cleaning Fee: $${result.pricing?.cleaningFee || 'N/A'}`);
    console.log(`  Service Fee: $${result.pricing?.serviceFee || 'N/A'}`);
    
    console.log('\n⭐ Reviews & Ratings:');
    console.log(`  Overall Rating: ${result.reviews?.rating || result.reviews?.averageRating || 'N/A'}`);
    console.log(`  Total Reviews: ${result.reviews?.totalCount || result.reviews?.reviewCount || 0}`);
    console.log(`  Guest Favorite: ${result.reviews?.guestFavorite ? '✅ Yes' : '❌ No'}`);
    
    // Display category ratings if available
    const categories = result.reviews?.categories || result.reviews?.categoryRatings;
    if (categories) {
      console.log('  Category Ratings:');
      Object.entries(categories).forEach(([category, rating]) => {
        console.log(`    - ${category.charAt(0).toUpperCase() + category.slice(1)}: ${rating}`);
      });
    }
    
    console.log('\n🏠 Amenities:');
    const allAmenities = [
      ...(result.amenities?.basic || []),
      ...(result.amenities?.safety || []),
      ...(result.amenities?.standout || [])
    ];
    console.log(`  Total: ${allAmenities.length} amenities`);
    if (allAmenities.length > 0) {
      console.log(`  Sample: ${allAmenities.slice(0, 5).join(', ')}${allAmenities.length > 5 ? '...' : ''}`);
    }
    
    // Step 4: Test Gemini Vision AI directly
    console.log('\n🤖 Step 4: Testing Gemini Vision AI Directly...\n');
    
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      // Test with a simple prompt
      const testPrompt = 'What is 2+2? Reply with just the number.';
      const testResult = await model.generateContent(testPrompt);
      const testResponse = await testResult.response;
      
      console.log('✅ Gemini AI Test:');
      console.log(`  Prompt: "${testPrompt}"`);
      console.log(`  Response: "${testResponse.text().trim()}"`);
      console.log('  Status: Working correctly');
      
    } catch (geminiError) {
      console.error('❌ Gemini AI Error:', geminiError.message);
    }
    
    // Step 5: Analyze data quality
    console.log('\n📊 Step 5: Data Quality Analysis\n');
    
    const fieldsExtracted = {
      title: !!result.title,
      propertyType: !!result.propertyType,
      host: !!result.host?.name,
      location: !!result.location?.city,
      bedrooms: result.spaces?.bedrooms !== undefined,
      pricing: !!result.pricing?.basePrice,
      rating: !!result.reviews?.rating || !!result.reviews?.averageRating,
      reviewCount: result.reviews?.totalCount !== undefined || result.reviews?.reviewCount !== undefined,
      amenities: allAmenities.length > 0,
      houseRules: !!result.houseRules,
      cancellationPolicy: !!result.cancellationPolicy
    };
    
    const extractedCount = Object.values(fieldsExtracted).filter(v => v).length;
    const totalFields = Object.keys(fieldsExtracted).length;
    const percentage = Math.round((extractedCount / totalFields) * 100);
    
    console.log('Field Extraction Status:');
    Object.entries(fieldsExtracted).forEach(([field, extracted]) => {
      console.log(`  ${extracted ? '✅' : '❌'} ${field}`);
    });
    
    console.log(`\n  Overall: ${extractedCount}/${totalFields} fields (${percentage}%)`);
    
    // Save full results
    const fs = await import('fs/promises');
    await fs.writeFile(
      'e2e-test-results.json',
      JSON.stringify({
        url: TEST_URL,
        timestamp: new Date().toISOString(),
        executionTime: `${(endTime - startTime) / 1000}s`,
        dataCompleteness: result.meta?.dataCompleteness,
        fieldsExtracted: extractedCount,
        totalFields: totalFields,
        extractionPercentage: percentage,
        result
      }, null, 2)
    );
    
    console.log('\n💾 Full results saved to e2e-test-results.json');
    
    // Step 6: Frontend simulation
    console.log('\n🖥️ Step 6: Simulating Frontend Display\n');
    console.log('The frontend would display:');
    console.log('  1. HeroSection with property image');
    console.log('  2. ScoreDisplay showing', result.reviews?.rating || 'N/A', 'rating');
    console.log('  3. HostMetrics for', result.host?.name || 'Unknown host');
    console.log('  4. AmenitiesAnalysis with', allAmenities.length, 'amenities');
    console.log('  5. ReviewAnalytics with category breakdowns');
    console.log('  6. PricingInsights comparing $' + result.pricing?.basePrice);
    console.log('  7. RecommendationCard with improvement suggestions');
    
  } catch (error) {
    console.error('❌ Scraping Error:', error);
    console.error('Stack:', error.stack);
  }

  console.log('\n' + '═'.repeat(80));
  console.log('✨ End-to-End Test Complete!\n');
}

// Run the test
testE2EWithGemini().catch(console.error);