import { PropertyStoreDBPG } from './lib/storage/property-store-db-pg'

async function testDataSave() {
  console.log('Testing data save functionality...\n')
  
  // Test upload data similar to what comes from the upload API
  const uploadData = {
    properties: [
      {
        name: 'Test Property 1',
        pdfName: 'Test Property 1',
        csvName: 'Test Property 1',
        netEarnings: 5000,
        grossEarnings: 6000,
        serviceFees: 900,
        adjustments: 0,
        taxWithheld: 100,
        nightsBooked: 25,
        avgNightStay: 3.5,
        bookingCount: 7,
        avgNightlyRate: 200,
        hasAccurateMetrics: true
      },
      {
        name: 'Test Property 2',
        pdfName: 'Test Property 2',
        csvName: 'Test Property 2',
        netEarnings: 3000,
        grossEarnings: 3500,
        serviceFees: 450,
        adjustments: 0,
        taxWithheld: 50,
        nightsBooked: 15,
        avgNightStay: 2.5,
        bookingCount: 6,
        avgNightlyRate: 200,
        hasAccurateMetrics: true
      }
    ],
    csv: {
      propertyMetrics: [
        {
          name: 'Test Property 1',
          totalRevenue: 5000,
          totalNights: 25,
          avgStayLength: 3.5,
          bookingCount: 7,
          avgNightlyRate: 200
        },
        {
          name: 'Test Property 2',
          totalRevenue: 3000,
          totalNights: 15,
          avgStayLength: 2.5,
          bookingCount: 6,
          avgNightlyRate: 200
        }
      ],
      dateRange: {
        start: '2024-01-01',
        end: '2024-12-31'
      },
      totalRevenue: 8000,
      recordCount: 13
    },
    period: '2024',
    dateRange: 'Jan 1, 2024 - Dec 31, 2024',
    fileName: 'test-earnings.pdf'
  }
  
  try {
    // Test creating properties from upload
    console.log('Creating properties from upload data...')
    // Use a proper UUID for the test user
    const testUserId = '00000000-0000-0000-0000-000000000001'
    const properties = await PropertyStoreDBPG.createFromUpload(uploadData, testUserId)
    
    console.log(`✅ Created ${properties.length} properties\n`)
    
    for (const prop of properties) {
      console.log(`Property: ${prop.name}`)
      console.log(`  - ID: ${prop.id}`)
      console.log(`  - Revenue: $${prop.metrics?.revenue?.value || 0}`)
      console.log(`  - Occupancy: ${prop.metrics?.occupancy?.value || 0}%`)
      console.log(`  - Pricing: $${prop.metrics?.pricing?.value || 0}/night`)
      console.log(`  - Has PDF: ${!!prop.dataSources.pdf}`)
      console.log(`  - Has CSV: ${!!prop.dataSources.csv}`)
      console.log(`  - CSV Metrics Count: ${prop.dataSources.csv?.propertyMetrics?.length || 0}`)
      console.log('')
    }
    
    // Test fetching properties
    console.log('Fetching properties for user...')
    const fetched = await PropertyStoreDBPG.getAllForUser(testUserId)
    console.log(`✅ Fetched ${fetched.length} properties from database\n`)
    
    // Check if metrics and data sources were saved
    if (fetched.length > 0) {
      const firstProp = fetched[0]
      console.log('Checking saved data structure:')
      console.log(`  - Has metrics: ${!!firstProp.metrics}`)
      console.log(`  - Has data sources: ${!!firstProp.dataSources}`)
      console.log(`  - PDF data saved: ${!!firstProp.dataSources?.pdf}`)
      console.log(`  - CSV data saved: ${!!firstProp.dataSources?.csv}`)
      
      if (firstProp.dataSources?.csv) {
        console.log(`  - CSV property metrics: ${firstProp.dataSources.csv.propertyMetrics?.length || 0}`)
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Run the test
testDataSave()