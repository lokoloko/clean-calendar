#!/usr/bin/env npx tsx

import * as dotenv from 'dotenv';

dotenv.config();

// Test URLs
const TEST_URLS = [
  'https://www.airbnb.com/rooms/726982912243440937', // Jimmy's listing - 131 reviews
  'https://www.airbnb.com/rooms/645598452510568412', // David's listing - 166 reviews
];

async function testFrontendOn9004() {
  console.log('🚀 Testing Frontend on http://localhost:9004');
  console.log('═'.repeat(80));
  
  // Check if the app is accessible
  console.log('\n🔍 Checking app status...\n');
  
  try {
    const healthCheck = await fetch('http://localhost:9004');
    console.log(`✅ App is running! (Status: ${healthCheck.status})`);
  } catch (error) {
    console.log('❌ App not accessible on port 9004');
    console.log('   Make sure the Docker container is running');
    return;
  }
  
  // Test the API endpoint with a real URL
  console.log('\n📊 Testing API with new URL...\n');
  console.log('URL:', TEST_URLS[0]);
  console.log('─'.repeat(60));
  
  try {
    const response = await fetch('http://localhost:9004/api/analyze-stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: TEST_URLS[0] }),
    });

    if (!response.ok) {
      console.log(`❌ API Error: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.log('Response:', text);
      return;
    }

    console.log('✅ API is processing the request\n');
    console.log('📡 Streaming updates:');
    
    // Read the SSE stream
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    
    if (!reader) {
      console.log('❌ No response stream');
      return;
    }
    
    let finalData = null;
    let lastProgress = 0;
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            
            if (data.type === 'status') {
              // Show progress bar
              if (data.progress > lastProgress) {
                const progressBar = '█'.repeat(Math.floor(data.progress / 2)) + '░'.repeat(50 - Math.floor(data.progress / 2));
                console.log(`  [${progressBar}] ${data.progress}%`);
                console.log(`  ${data.stage.toUpperCase()}: ${data.message}`);
                lastProgress = data.progress;
              }
              
              // Show details if available
              if (data.details) {
                console.log('  Details:', JSON.stringify(data.details, null, 2));
              }
            } else if (data.type === 'complete') {
              finalData = data.data;
              console.log('\n✅ ANALYSIS COMPLETE!\n');
            } else if (data.type === 'error') {
              console.log(`\n❌ Error: ${data.message}`);
              return;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }
    
    // Display final results
    if (finalData) {
      const listing = finalData.listing;
      console.log('═'.repeat(60));
      console.log('\n📋 EXTRACTION RESULTS:\n');
      
      console.log('🏠 Property Information:');
      console.log(`  Title: ${listing.title || 'N/A'}`);
      console.log(`  Type: ${listing.propertyType || 'N/A'}`);
      console.log(`  Host: ${listing.host?.name || 'N/A'}${listing.host?.isSuperhost ? ' ⭐ (Superhost)' : ''}`);
      console.log(`  Location: ${listing.location?.city || 'N/A'}`);
      
      console.log('\n💰 Pricing:');
      console.log(`  Base Price: $${listing.pricing?.basePrice || 'N/A'}/night`);
      console.log(`  Cleaning Fee: $${listing.pricing?.cleaningFee || 'N/A'}`);
      
      console.log('\n⭐ Reviews:');
      const reviews = listing.reviews?.summary || listing.reviews;
      console.log(`  Rating: ${reviews?.rating || reviews?.averageRating || 'N/A'}/5`);
      console.log(`  Total Reviews: ${reviews?.totalCount || reviews?.reviewCount || 0}`);
      
      if (reviews?.categories || reviews?.categoryRatings) {
        const cats = reviews.categories || reviews.categoryRatings;
        console.log('  Categories:');
        Object.entries(cats).forEach(([cat, rating]) => {
          console.log(`    - ${cat}: ${rating}`);
        });
      }
      
      console.log('\n🏠 Amenities:');
      const amenityCount = listing.amenities?.basic?.length || 0;
      console.log(`  Total: ${amenityCount} amenities`);
      if (amenityCount > 0) {
        console.log(`  Sample: ${listing.amenities.basic.slice(0, 5).join(', ')}`);
      }
      
      console.log('\n📊 Data Quality:');
      console.log(`  Completeness: ${listing.meta?.dataCompleteness || 0}%`);
      console.log(`  Method: ${finalData.metrics?.bestMethod || 'N/A'}`);
      console.log(`  Time: ${(finalData.metrics?.totalTime / 1000).toFixed(1)}s`);
      
      // Show AI analysis if available
      if (finalData.analysis) {
        console.log('\n🤖 AI Analysis Available:');
        console.log(`  Score: ${finalData.analysis.score || 'N/A'}/100`);
        console.log(`  Recommendations: ${finalData.analysis.recommendations?.length || 0}`);
      }
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  // Show browser instructions
  console.log('\n' + '═'.repeat(80));
  console.log('\n🌐 BROWSER TESTING INSTRUCTIONS:\n');
  console.log('1. Open your browser to: http://localhost:9004');
  console.log('\n2. On the homepage, you should see:');
  console.log('   ✓ GoStudioM logo');
  console.log('   ✓ "Boost Your Airbnb Bookings" headline');
  console.log('   ✓ URL input field');
  console.log('   ✓ "Analyze Now" button');
  console.log('\n3. Paste this URL in the input field:');
  console.log(`   ${TEST_URLS[0]}`);
  console.log('\n4. Click "Analyze Now" and observe:');
  console.log('   ✓ Progress animation with real-time updates');
  console.log('   ✓ Status messages changing');
  console.log('   ✓ Progress bar filling up');
  console.log('\n5. After ~60 seconds, you\'ll be redirected to /analyze with:');
  console.log('   ✓ Property score display');
  console.log('   ✓ Host metrics');
  console.log('   ✓ Amenities breakdown');
  console.log('   ✓ Review analytics');
  console.log('   ✓ Pricing insights');
  console.log('   ✓ AI recommendations');
  
  console.log('\n✨ Test complete! The frontend should be fully functional.');
}

// Run the test
testFrontendOn9004().catch(console.error);