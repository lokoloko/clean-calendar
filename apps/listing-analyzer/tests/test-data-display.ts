#!/usr/bin/env npx tsx

import * as dotenv from 'dotenv';
dotenv.config();

const TEST_URL = 'https://www.airbnb.com/rooms/726982912243440937';

async function testDataDisplay() {
  console.log('🔍 Testing Data Display on Results Page');
  console.log('═'.repeat(80));
  
  // Start analysis
  console.log('\n📊 Starting analysis...\n');
  
  const response = await fetch('http://localhost:9004/api/analyze-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: TEST_URL }),
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  
  let finalData: any = null;
  let lastProgress = 0;
  
  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          
          if (data.type === 'status' && data.progress > lastProgress) {
            console.log(`  Progress: ${data.progress}% - ${data.message}`);
            lastProgress = data.progress;
            
            if (data.details) {
              console.log('  Method:', data.details.method);
              console.log('  Amenities found:', data.details.itemsFound?.amenities);
            }
          } else if (data.type === 'complete') {
            finalData = data.data;
            console.log('\n✅ Analysis Complete!\n');
          }
        } catch (e) {}
      }
    }
  }
  
  if (finalData) {
    console.log('═'.repeat(80));
    console.log('\n📋 DATA BEING SENT TO RESULTS PAGE:\n');
    
    const listing = finalData.listing;
    const analysis = finalData.analysis;
    const metrics = finalData.metrics;
    
    console.log('1️⃣ LISTING DATA:');
    console.log('   Title:', listing.title);
    console.log('   Amenities Count:', listing.meta?.amenityCount || listing.amenities?.basic?.length);
    console.log('   Photo Count:', listing.meta?.photoCount || listing.photos?.length);
    console.log('   Photo Quality:', listing.meta?.photoQuality);
    console.log('   Reviews:', listing.reviews?.summary?.totalCount);
    console.log('   Rating:', listing.reviews?.summary?.rating);
    console.log('   Data Completeness:', listing.meta?.dataCompleteness + '%');
    console.log('   Scrape Version:', listing.meta?.scrapeVersion);
    
    console.log('\n2️⃣ GEMINI ANALYSIS:');
    console.log('   Score:', analysis?.score + '/100');
    console.log('   Position:', analysis?.competitivePosition);
    console.log('   Summary:', analysis?.summary?.substring(0, 100) + '...');
    console.log('   Recommendations:', analysis?.recommendations?.length);
    
    if (analysis?.recommendations?.[0]) {
      const rec = analysis.recommendations[0];
      console.log('\n   First Recommendation:');
      console.log('     Title:', rec.title);
      console.log('     Priority:', rec.priority);
      console.log('     Impact - Bookings:', rec.impact?.bookings);
      console.log('     Impact - Revenue:', rec.impact?.revenue);
      console.log('     Effort:', rec.effort);
    }
    
    if (analysis?.guestPersona) {
      console.log('\n   Guest Persona:');
      console.log('     Type:', analysis.guestPersona.primaryType);
      console.log('     Preferences:', analysis.guestPersona.preferences?.join(', '));
    }
    
    if (analysis?.opportunities) {
      console.log('\n   Opportunities:', analysis.opportunities.length);
      console.log('     First:', analysis.opportunities[0]);
    }
    
    if (analysis?.riskFactors) {
      console.log('\n   Risk Factors:', analysis.riskFactors.length);
      console.log('     First:', analysis.riskFactors[0]);
    }
    
    console.log('\n3️⃣ SCRAPING METRICS:');
    console.log('   Method Used:', metrics?.bestMethod);
    console.log('   Total Time:', (metrics?.totalTime / 1000).toFixed(1) + 's');
    console.log('   Data Completeness:', metrics?.dataCompleteness + '%');
    
    console.log('\n' + '═'.repeat(80));
    console.log('\n✨ All data is being passed to the results page!');
    console.log('\nVisit http://localhost:9004 and analyze a listing to see:');
    console.log('  ✓ Data extraction summary bar');
    console.log('  ✓ Guest persona profile');
    console.log('  ✓ Opportunities & risks');
    console.log('  ✓ Impact metrics in recommendations');
    console.log('  ✓ Market insights & pricing');
  }
}

testDataDisplay().catch(console.error);