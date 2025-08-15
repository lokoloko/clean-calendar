const fs = require('fs');
const FormData = require('form-data');

async function testRealUpload() {
  console.log('=== TESTING REAL CSV UPLOAD ===\n');
  
  const csvPath = '/Users/richard/Desktop/test airbnb files/airbnb_.csv';
  
  if (\!fs.existsSync(csvPath)) {
    console.log('CSV file not found at:', csvPath);
    return;
  }
  
  const csvContent = fs.readFileSync(csvPath);
  
  const form = new FormData();
  form.append('csv', csvContent, {
    filename: 'airbnb_.csv',
    contentType: 'text/csv'
  });
  
  try {
    console.log('Uploading CSV to /api/upload...');
    const response = await fetch('http://localhost:9003/api/upload', {
      method: 'POST',
      body: form
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Upload successful\!\n');
      console.log('Properties returned:', result.data.properties?.length || 0);
      
      if (result.data.properties?.length > 0) {
        console.log('\nFirst 5 properties with revenue:');
        result.data.properties.slice(0, 5).forEach((p, i) => {
          const name = p.name || 'Unknown';
          const revenue = p.revenue || p.netEarnings || 0;
          const nights = p.nightsBooked || 0;
          const hasRevenue = p.revenue \!== undefined;
          
          console.log(`${i+1}. ${name}`);
          console.log(`   Revenue: ${revenue}`);
          console.log(`   Nights: ${nights}`);
          console.log(`   Has revenue field: ${hasRevenue}`);
        });
        
        // Check for zero revenue properties
        const zeroRevenue = result.data.properties.filter(p => \!p.revenue || p.revenue === 0);
        console.log(`\nProperties with zero/missing revenue: ${zeroRevenue.length}`);
        if (zeroRevenue.length > 0) {
          console.log('First 3 zero revenue properties:');
          zeroRevenue.slice(0, 3).forEach(p => {
            console.log(`  - ${p.name}: revenue=${p.revenue}`);
          });
        }
      }
      
    } else {
      console.log('Upload failed:', result.error);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testRealUpload();
