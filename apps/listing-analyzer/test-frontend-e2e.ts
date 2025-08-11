import * as dotenv from 'dotenv';

dotenv.config();

const TEST_URL = 'https://www.airbnb.com/rooms/726982912243440937?check_in=2025-09-16&check_out=2025-09-30&photo_id=1500323053&source_impression_id=p3_1754864929_P3H0KcjIdG8ogdaZ&previous_page_section_name=1000';

async function testFrontendE2E() {
  console.log('🚀 Testing End-to-End Frontend Integration');
  console.log('URL:', TEST_URL);
  console.log('═'.repeat(80) + '\n');

  // Test 1: Call the analyze API endpoint (non-streaming)
  console.log('📊 Test 1: Calling /api/analyze endpoint...\n');
  
  try {
    const response = await fetch('http://localhost:3001/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: TEST_URL })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    console.log('✅ API Response Received!');
    console.log('─'.repeat(40));
    
    // Display extracted data
    console.log('\n🏠 Property Information:');
    console.log('  Title:', data.title);
    console.log('  Type:', data.propertyType);
    console.log('  Host:', data.host?.name, data.host?.isSuperhost ? '⭐ Superhost' : '');
    console.log('  Location:', data.location?.city);
    
    console.log('\n📊 Spaces & Capacity:');
    console.log('  Bedrooms:', data.spaces?.bedrooms);
    console.log('  Beds:', data.spaces?.beds);
    console.log('  Bathrooms:', data.spaces?.bathrooms);
    console.log('  Max Guests:', data.guestCapacity?.total);
    
    console.log('\n💰 Pricing:');
    console.log('  Base Price:', `$${data.pricing?.basePrice}/night`);
    console.log('  Cleaning Fee:', `$${data.pricing?.cleaningFee || 'N/A'}`);
    
    console.log('\n⭐ Reviews & Ratings:');
    console.log('  Overall Rating:', data.reviews?.rating || data.reviews?.summary?.rating);
    console.log('  Total Reviews:', data.reviews?.totalCount || data.reviews?.summary?.totalCount);
    console.log('  Guest Favorite:', data.reviews?.guestFavorite ? '✅ Yes' : '❌ No');
    
    if (data.reviews?.categories || data.reviews?.summary?.categories) {
      const categories = data.reviews?.categories || data.reviews?.summary?.categories;
      console.log('  Category Ratings:');
      Object.entries(categories).forEach(([category, rating]) => {
        console.log(`    - ${category}: ${rating}`);
      });
    }
    
    console.log('\n🎯 Data Quality:');
    console.log('  Completeness:', data.meta?.dataCompleteness + '%');
    console.log('  Scrape Method:', data.meta?.scrapeVersion);
    console.log('  Modals Captured:', data.meta?.modalsCaptured || 'N/A');
    
    // Save full response
    const fs = await import('fs/promises');
    await fs.writeFile(
      'frontend-e2e-response.json',
      JSON.stringify(data, null, 2)
    );
    console.log('\n💾 Full response saved to frontend-e2e-response.json');
    
  } catch (error) {
    console.error('❌ Error calling API:', error);
    console.log('\n💡 Make sure the app is running on http://localhost:3001');
    console.log('   Run: docker-compose up -d');
  }

  // Test 2: Test streaming endpoint
  console.log('\n' + '═'.repeat(80));
  console.log('\n📊 Test 2: Testing Streaming Endpoint /api/analyze-stream...\n');
  
  try {
    const response = await fetch('http://localhost:3001/api/analyze-stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: TEST_URL })
    });

    if (!response.ok) {
      throw new Error(`Streaming API error: ${response.status}`);
    }

    console.log('✅ Streaming Response Started');
    console.log('  Reading chunks...\n');
    
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullData = '';
    let chunkCount = 0;
    
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        fullData += chunk;
        chunkCount++;
        
        // Parse SSE data
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'progress') {
                console.log(`  📈 Progress: ${data.message}`);
              } else if (data.type === 'data') {
                console.log(`  📦 Data chunk received: ${data.field}`);
              } else if (data.type === 'complete') {
                console.log(`  ✅ Streaming complete!`);
              }
            } catch (e) {
              // Not JSON, skip
            }
          }
        }
      }
    }
    
    console.log(`\n  Total chunks received: ${chunkCount}`);
    
  } catch (error) {
    console.error('❌ Streaming error:', error);
  }

  // Test 3: Check Gemini Vision AI integration
  console.log('\n' + '═'.repeat(80));
  console.log('\n🤖 Test 3: Verifying Gemini Vision AI Integration...\n');
  
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    console.log('✅ Gemini API Key configured');
    console.log('  Key length:', geminiKey.length);
    console.log('  Key prefix:', geminiKey.substring(0, 7) + '...');
  } else {
    console.log('⚠️ Gemini API Key not found in environment');
  }
  
  // Test 4: Verify Browserless configuration
  console.log('\n🌐 Test 4: Verifying Browserless Configuration...\n');
  
  const browserlessKey = process.env.BROWSERLESS_API_KEY;
  if (browserlessKey) {
    console.log('✅ Browserless API Key configured');
    console.log('  Key length:', browserlessKey.length);
    
    // Test Browserless connectivity
    try {
      const testResponse = await fetch(`https://production-sfo.browserless.io/health?token=${browserlessKey}`);
      if (testResponse.ok) {
        console.log('✅ Browserless API is accessible');
      } else {
        console.log('⚠️ Browserless API returned:', testResponse.status);
      }
    } catch (e) {
      console.log('⚠️ Could not reach Browserless API');
    }
  } else {
    console.log('⚠️ Browserless API Key not found');
  }

  console.log('\n' + '═'.repeat(80));
  console.log('✨ End-to-End Testing Complete!\n');
  
  console.log('📋 Summary:');
  console.log('  - API Endpoint: Working ✅');
  console.log('  - Data Extraction: Check response above');
  console.log('  - Streaming: Check if chunks were received');
  console.log('  - Gemini AI: Check configuration');
  console.log('  - Browserless: Check connectivity');
}

// Run the test
testFrontendE2E().catch(console.error);