/**
 * Test the upload flow to ensure CSV and PDF data is being saved properly
 */

async function testUploadFlow() {
  console.log('Testing upload flow with localStorage...\n')
  
  // Simulate login first
  const loginResponse = await fetch('http://localhost:9003/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test@gostudiom.com',
      password: 'analytics123'
    })
  })
  
  const loginResult = await loginResponse.json()
  const cookies = loginResponse.headers.get('set-cookie')
  console.log(`Login: ${loginResult.success ? '✅ Success' : '❌ Failed'}`)
  
  if (!loginResult.success) {
    console.error('Login failed:', loginResult.error)
    return
  }
  
  // Prepare test data similar to what the upload page sends
  const uploadData = {
    properties: [
      {
        name: 'API Test Property 1',
        pdfName: 'API Test Property 1',
        csvName: 'API Test Property 1',
        netEarnings: 8000,
        grossEarnings: 9000,
        serviceFees: 900,
        adjustments: 0,
        taxWithheld: 100,
        nightsBooked: 40,
        avgNightStay: 4.2,
        bookingCount: 10,
        avgNightlyRate: 225,
        hasAccurateMetrics: true,
        status: 'active'
      },
      {
        name: 'API Test Property 2',
        pdfName: 'API Test Property 2',
        csvName: 'API Test Property 2',
        netEarnings: 6000,
        grossEarnings: 7000,
        serviceFees: 800,
        adjustments: 0,
        taxWithheld: 200,
        nightsBooked: 30,
        avgNightStay: 3.0,
        bookingCount: 10,
        avgNightlyRate: 200,
        hasAccurateMetrics: true,
        status: 'active'
      }
    ],
    csv: {
      propertyMetrics: [
        {
          name: 'API Test Property 1',
          totalRevenue: 8000,
          totalNights: 40,
          avgStayLength: 4.2,
          bookingCount: 10,
          avgNightlyRate: 225
        },
        {
          name: 'API Test Property 2',
          totalRevenue: 6000,
          totalNights: 30,
          avgStayLength: 3.0,
          bookingCount: 10,
          avgNightlyRate: 200
        }
      ],
      dateRange: {
        start: '2024-01-01',
        end: '2024-12-31'
      },
      totalRevenue: 14000,
      recordCount: 20
    },
    period: '2024',
    dateRange: 'Jan 1, 2024 - Dec 31, 2024',
    fileName: 'test-api-earnings.pdf',
    totalRevenue: 14000,
    activeProperties: 2,
    inactiveProperties: 0,
    totalProperties: 2,
    totalNights: 70,
    dataSource: 'pdf-csv',
    replace: true
  }
  
  // Save properties
  console.log('\nSaving properties via API...')
  const saveResponse = await fetch('http://localhost:9003/api/properties', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': cookies || ''
    },
    body: JSON.stringify(uploadData)
  })
  
  const saveResult = await saveResponse.json()
  console.log(`Save: ${saveResult.success ? '✅ Success' : '❌ Failed'}`)
  
  if (saveResult.success) {
    console.log(`Saved ${saveResult.count} properties`)
  } else {
    console.error('Save failed:', saveResult.error)
    return
  }
  
  // Fetch properties to verify
  console.log('\nFetching saved properties...')
  const fetchResponse = await fetch('http://localhost:9003/api/properties', {
    headers: { 'Cookie': cookies || '' }
  })
  
  const fetchResult = await fetchResponse.json()
  console.log(`Fetch: ${fetchResult.success ? '✅ Success' : '❌ Failed'}`)
  
  if (fetchResult.success && fetchResult.properties) {
    console.log(`\nFound ${fetchResult.properties.length} properties:`)
    
    for (const prop of fetchResult.properties) {
      console.log(`\n📊 ${prop.name}:`)
      console.log(`  - Revenue: $${prop.metrics?.revenue?.value || 0}`)
      console.log(`  - Occupancy: ${prop.metrics?.occupancy?.value || 0}%`)
      console.log(`  - Pricing: $${prop.metrics?.pricing?.value || 0}/night`)
      console.log(`  - Has PDF data: ${!!prop.dataSources?.pdf}`)
      console.log(`  - Has CSV data: ${!!prop.dataSources?.csv}`)
      
      if (prop.dataSources?.csv) {
        console.log(`  - CSV metrics count: ${prop.dataSources.csv.propertyMetrics?.length || 0}`)
        
        if (prop.dataSources.csv.propertyMetrics?.length > 0) {
          console.log('  - CSV property metrics:')
          for (const metric of prop.dataSources.csv.propertyMetrics) {
            console.log(`    • ${metric.name}: $${metric.totalRevenue}, ${metric.totalNights} nights`)
          }
        }
      }
    }
  }
}

// Run the test
testUploadFlow().catch(console.error)