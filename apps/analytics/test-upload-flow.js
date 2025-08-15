#!/usr/bin/env node

const fs = require('fs');
const FormData = require('form-data');

async function testUploadFlow() {
  console.log('=== TESTING CSV UPLOAD FLOW ===\n');
  
  // Read the CSV file
  const csvPath = '/Users/richard/Desktop/test airbnb files/airbnb_.csv';
  const csvContent = fs.readFileSync(csvPath);
  
  // Create form data
  const form = new FormData();
  form.append('csv', csvContent, {
    filename: 'airbnb_.csv',
    contentType: 'text/csv'
  });
  
  try {
    // Call the upload API
    console.log('1. Calling /api/upload...');
    const response = await fetch('http://localhost:9003/api/upload', {
      method: 'POST',
      body: form
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Upload successful!\n');
      console.log('2. Data returned from API:');
      console.log('   - Properties found:', result.data.properties?.length || 0);
      console.log('   - CSV data present:', !!result.data.csv);
      console.log('   - Total revenue:', result.data.summary?.totalRevenue || 0);
      console.log('   - Total nights:', result.data.summary?.totalNights || 0);
      
      if (result.data.csv) {
        console.log('\n3. CSV propertyMetrics:');
        result.data.csv.propertyMetrics?.slice(0, 3).forEach((metric, i) => {
          console.log(`   ${i+1}. ${metric.name}`);
          console.log(`      Revenue: $${metric.totalRevenue.toFixed(2)}`);
          console.log(`      Nights: ${metric.totalNights}`);
        });
      }
      
      console.log('\n4. Properties array (first 3):');
      result.data.properties?.slice(0, 3).forEach((prop, i) => {
        console.log(`   ${i+1}. ${prop.name || prop.csvName}`);
        console.log(`      Revenue: $${prop.revenue || prop.netEarnings}`);
        console.log(`      Nights: ${prop.nightsBooked}`);
      });
      
      // Simulate what gets stored in sessionStorage
      const uploadData = {
        ...result.data,
        propertyUrls: [],
        isAppend: false
      };
      
      console.log('\n5. What would be stored in sessionStorage:');
      console.log('   - Properties count:', uploadData.properties?.length || 0);
      console.log('   - CSV present:', !!uploadData.csv);
      console.log('   - Data source:', uploadData.dataSource || 'csv-only');
      
    } else {
      console.log('❌ Upload failed:', result.error);
    }
    
  } catch (error) {
    console.error('Error testing upload:', error);
  }
}

testUploadFlow();