#!/usr/bin/env npx tsx

import * as dotenv from 'dotenv';

dotenv.config();

// Test URLs
const TEST_URLS = [
  'https://www.airbnb.com/rooms/726982912243440937', // Jimmy's listing - 131 reviews
  'https://www.airbnb.com/rooms/645598452510568412', // David's listing - 166 reviews
  'https://www.airbnb.com/rooms/1084268803864282186', // Original test listing
];

async function testFrontendFlow() {
  console.log('🚀 Testing Frontend Flow for Listing Analyzer');
  console.log('═'.repeat(80));
  
  // Check if the app would be running (in Docker container)
  console.log('\n📱 Frontend App Configuration:');
  console.log('  URL: http://localhost:3001');
  console.log('  Main Page: / (with URL input form)');
  console.log('  Analysis Page: /analyze (results display)');
  console.log('  API Endpoint: /api/analyze-stream (SSE streaming)');
  
  // Test the API directly
  console.log('\n🔧 Testing API Endpoint...\n');
  
  for (const testUrl of TEST_URLS) {
    console.log(`\n📍 Testing: ${testUrl.split('/').pop()}`);
    console.log('─'.repeat(60));
    
    try {
      // Call the streaming API endpoint
      const response = await fetch('http://localhost:3001/api/analyze-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: testUrl }),
      });

      if (!response.ok) {
        console.log(`❌ API returned ${response.status}: ${response.statusText}`);
        
        // If app not running, show instructions
        if (response.status === 0 || !response.status) {
          console.log('\n⚠️ App doesn\'t appear to be running.');
          console.log('\n📝 To start the app in Docker:');
          console.log('  1. cd apps/listing-analyzer');
          console.log('  2. docker-compose up -d');
          console.log('  3. Visit http://localhost:3001');
          console.log('\n📝 Or run locally:');
          console.log('  1. npm install');
          console.log('  2. npm run dev');
          break;
        }
        continue;
      }

      console.log('✅ API is responding');
      
      // Read the SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        console.log('❌ No response stream');
        continue;
      }
      
      let finalData = null;
      let lastStatus = '';
      
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
                if (data.message !== lastStatus) {
                  console.log(`  📊 ${data.stage}: ${data.message} (${data.progress}%)`);
                  lastStatus = data.message;
                }
              } else if (data.type === 'complete') {
                finalData = data.data;
                console.log('  ✅ Analysis complete!');
              } else if (data.type === 'error') {
                console.log(`  ❌ Error: ${data.message}`);
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
      
      // Display results summary
      if (finalData) {
        const listing = finalData.listing;
        console.log('\n  📋 Extracted Data:');
        console.log(`    Title: ${listing.title || 'N/A'}`);
        console.log(`    Host: ${listing.host?.name || 'N/A'}${listing.host?.isSuperhost ? ' (Superhost)' : ''}`);
        console.log(`    Price: $${listing.pricing?.basePrice || 'N/A'}/night`);
        console.log(`    Rating: ${listing.reviews?.summary?.rating || listing.reviews?.averageRating || 'N/A'}/5`);
        console.log(`    Reviews: ${listing.reviews?.summary?.totalCount || listing.reviews?.reviewCount || 0}`);
        console.log(`    Amenities: ${listing.amenities?.basic?.length || 0} items`);
        console.log(`    Data Completeness: ${listing.meta?.dataCompleteness || 0}%`);
      }
      
    } catch (error) {
      console.log('❌ Error:', error.message);
    }
  }
  
  // Show frontend instructions
  console.log('\n' + '═'.repeat(80));
  console.log('\n📱 Frontend Testing Instructions:\n');
  console.log('1. Open your browser to http://localhost:3001');
  console.log('2. You should see:');
  console.log('   - GoStudioM logo at the top');
  console.log('   - "Boost Your Airbnb Bookings" headline');
  console.log('   - URL input field with "Analyze Now" button');
  console.log('   - Trust badges (100% Free, No Signup, Real-Time)');
  console.log('   - Feature grid at the bottom');
  console.log('\n3. Enter one of these test URLs:');
  TEST_URLS.forEach(url => {
    console.log(`   - ${url}`);
  });
  console.log('\n4. Click "Analyze Now" and watch:');
  console.log('   - Progress animation with stages');
  console.log('   - Real-time status messages');
  console.log('   - Automatic redirect to results page');
  console.log('\n5. On the results page, verify:');
  console.log('   - Score display (rating out of 5)');
  console.log('   - Host metrics section');
  console.log('   - Amenities analysis');
  console.log('   - Review analytics with charts');
  console.log('   - Pricing insights');
  console.log('   - AI recommendations');
  console.log('   - Competitor comparison');
  
  // Test data flow
  console.log('\n' + '═'.repeat(80));
  console.log('\n🔄 Data Flow Summary:\n');
  console.log('1. User enters URL on / (main page)');
  console.log('2. Frontend calls /api/analyze-stream');
  console.log('3. API uses scraper-hybrid.ts which:');
  console.log('   - Tries enhanced function scraper first');
  console.log('   - Falls back to simple scraper if needed');
  console.log('   - Extracts data with Browserless.io');
  console.log('   - Uses Gemini Vision AI for screenshots');
  console.log('4. Sends real-time updates via SSE');
  console.log('5. Frontend shows progress animation');
  console.log('6. On completion, redirects to /analyze');
  console.log('7. Results page displays all extracted data');
  
  console.log('\n✨ Frontend testing setup complete!');
}

// Run the test
testFrontendFlow().catch(console.error);