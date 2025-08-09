import { NextResponse } from 'next/server'
import { PropertyStore } from '@/lib/storage/property-store'

export async function GET() {
  const properties = PropertyStore.getAll()
  
  const report = properties.map(prop => {
    const csvMetrics = prop.dataSources?.csv?.propertyMetrics || []
    
    // Find metrics for this specific property
    const myMetrics = csvMetrics.find((m: any) => {
      if (!m?.name) return false
      const csvName = m.name.toLowerCase().trim()
      const propName = (prop.name || prop.standardName || '').toLowerCase().trim()
      
      // Exact match
      if (csvName === propName) return true
      
      // Partial matches for common cases
      if (propName.includes('tranquil') && csvName.includes('tranquil')) return true
      if (propName.includes('monrovia charm') && csvName.includes('monrovia charm')) return true
      if (propName.includes('private studio') && csvName.includes('private studio')) return true
      if (propName.includes('old town monrovia bungalow') && csvName.includes('old town monrovia bungalow')) return true
      if (propName.includes('private bungalow') && csvName.includes('private bungalow')) return true
      if (propName.includes('work away') && csvName.includes('work away')) return true
      if (propName.includes('adorable') && csvName.includes('adorable')) return true
      if (propName.includes('comfortable apartment') && csvName.includes('comfortable apartment')) return true
      if (propName.includes('cozy stopover') && csvName.includes('cozy stopover')) return true
      if (propName.includes('modern rv') && csvName.includes('modern rv')) return true
      
      return false
    })
    
    return {
      name: prop.name || prop.standardName,
      hasCSV: !!prop.dataSources?.csv,
      csvMetricsCount: csvMetrics.length,
      foundMatch: !!myMetrics,
      matchedName: myMetrics?.name || 'NOT FOUND',
      revenue: myMetrics?.totalRevenue || 0,
      nights: myMetrics?.totalNights || 0,
      avgRate: myMetrics?.avgNightlyRate || 0,
      currentMetrics: {
        revenue: prop.metrics?.revenue?.value || 0,
        occupancy: prop.metrics?.occupancy?.value || 0,
        pricing: prop.metrics?.pricing?.value || 0
      }
    }
  })
  
  return NextResponse.json({
    totalProperties: properties.length,
    propertiesWithCSV: report.filter(r => r.hasCSV).length,
    propertiesWithMatches: report.filter(r => r.foundMatch).length,
    details: report
  })
}