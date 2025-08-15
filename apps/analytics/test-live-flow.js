// Test the actual data flow after our fix

const fs = require('fs');
const FormData = require('form-data');

async function testLiveFlow() {
  console.log('=== TESTING LIVE DATA FLOW ===\n');
  
  // Step 1: Upload CSV
  const csvPath = '/Users/richard/Desktop/test airbnb files/airbnb_.csv';
  const csvContent = fs.readFileSync(csvPath);
  
  const form = new FormData();
  form.append('csv', csvContent, {
    filename: 'airbnb_.csv',
    contentType: 'text/csv'
  });
  
  console.log('1. Uploading CSV...');
  const uploadResponse = await fetch('http://localhost:9003/api/upload', {
    method: 'POST',
    body: form
  });
  
  const uploadResult = await uploadResponse.json();
  
  if (!uploadResult.success) {
    console.error('Upload failed:', uploadResult.error);
    return;
  }
  
  console.log('   Properties returned:', uploadResult.data.properties.length);
  console.log('   First property:', {
    name: uploadResult.data.properties[0].name,
    revenue: uploadResult.data.properties[0].revenue,
    netEarnings: uploadResult.data.properties[0].netEarnings
  });
  
  // Step 2: Simulate mapping page processing
  const mappedProps = uploadResult.data.properties.map(prop => ({
    name: prop.name,
    revenue: prop.revenue || prop.netEarnings || 0,  // Our fix
    nightsBooked: prop.nightsBooked || 0,
    status: (prop.revenue || prop.netEarnings || 0) > 0 ? 'active' : 'inactive'
  }));
  
  console.log('\n2. After mapping (with fix):');
  console.log('   First mapped property:', mappedProps[0]);
  
  // Step 3: Simulate properties page transform
  const displayProps = mappedProps.map(prop => ({
    name: prop.name,
    metrics: {
      revenue: { value: prop.revenue }
    }
  }));
  
  console.log('\n3. For properties page display:');
  console.log('   First display property:', displayProps[0]);
  console.log('   Revenue will show as:', displayProps[0].metrics.revenue.value ? '$' + displayProps[0].metrics.revenue.value.toFixed(2) : 'N/A');
}

testLiveFlow().catch(console.error);