import { NextResponse } from 'next/server'
import { PropertyStore } from '@/lib/storage/property-store'

export async function GET() {
  try {
    // Get all properties
    const properties = PropertyStore.getAll()
    let fixed = 0
    
    for (const property of properties) {
      if (property.dataSources.csv?.propertyMetrics) {
        // Find the metrics for this specific property
        const csvMetrics = property.dataSources.csv.propertyMetrics
        const thisPropertyMetrics = csvMetrics.find((m: any) => {
          const csvName = m.name?.toLowerCase().trim() || ''
          const propName = (property.name || property.standardName || '').toLowerCase().trim()
          return csvName === propName || 
                 (propName.includes('monrovia') && csvName.includes('monrovia') && csvName.includes('charm'))
        })
        
        if (thisPropertyMetrics) {
          console.log(`Fixing metrics for ${property.name}:`)
          console.log(`  CSV shows: ${thisPropertyMetrics.totalNights} nights, $${thisPropertyMetrics.totalRevenue} revenue`)
          console.log(`  Average rate: $${thisPropertyMetrics.avgNightlyRate}/night`)
          
          // Force recalculation
          property.metrics = PropertyStore['calculateMetrics'](property)
          PropertyStore.save(property)
          fixed++
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Fixed metrics for ${fixed} properties`,
      fixed
    })
  } catch (error) {
    console.error('Error fixing metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fix metrics' },
      { status: 500 }
    )
  }
}