import { NextRequest, NextResponse } from 'next/server'
import { TransactionCSVParser } from '@/lib/parsers/csv-parser'
import { PropertyMatcher } from '@/lib/property-matcher'

export async function POST(request: NextRequest) {
  try {
    console.log('CSV Upload API: Processing CSV addition...')
    
    const formData = await request.formData()
    const csvFile = formData.get('csv') as File | null
    const pdfDataStr = formData.get('pdfData') as string | null
    
    if (!csvFile) {
      return NextResponse.json(
        { success: false, error: 'No CSV file provided' },
        { status: 400 }
      )
    }
    
    console.log('CSV Upload API: File received:', {
      csvSize: csvFile.size,
      hasPdfData: !!pdfDataStr
    })
    
    // Parse PDF data if provided (for date filtering)
    let pdfData = null
    let dateFilter = undefined
    
    if (pdfDataStr) {
      try {
        pdfData = JSON.parse(pdfDataStr)
        
        // Extract date range for filtering
        if (pdfData.dateRange) {
          const dateMatch = pdfData.dateRange.match(/(\w+ \d+, \d{4})\s*-\s*(\w+ \d+, \d{4})/)
          if (dateMatch) {
            dateFilter = {
              start: new Date(dateMatch[1]).toISOString().split('T')[0],
              end: new Date(dateMatch[2]).toISOString().split('T')[0]
            }
            console.log(`Using date range for CSV filtering: ${dateFilter.start} to ${dateFilter.end}`)
          }
        }
      } catch (e) {
        console.error('Failed to parse PDF data:', e)
      }
    }
    
    // Parse CSV with date filtering
    const csvParser = new TransactionCSVParser()
    const csvData = await csvParser.parse(csvFile, dateFilter)
    
    console.log(`CSV parsed: ${csvData.propertyMetrics.length} properties with accurate metrics`)
    
    // If we have PDF properties, merge the data
    let mergedProperties = []
    if (pdfData?.properties) {
      console.log('Using smart matching to merge CSV with existing PDF data...')
      
      // Prepare data for smart matching
      const pdfPropData = pdfData.properties.map((p: any) => ({
        name: p.name,
        revenue: p.netEarnings || p.revenue || 0,
        nights: p.nightsBooked,
        source: 'pdf' as const
      }))
      
      const csvPropData = csvData.propertyMetrics.map(m => ({
        name: m.name,
        revenue: m.totalRevenue,
        nights: m.totalNights,
        source: 'csv' as const
      }))
      
      // Use smart matching to find property matches
      const propertyMatches = PropertyMatcher.matchProperties(pdfPropData, csvPropData)
      console.log(`Smart matching found ${propertyMatches.size} property matches`)
      
      // Create a map of CSV metrics for easy lookup
      const csvMetricsMap = new Map<string, any>()
      for (const metric of csvData.propertyMetrics) {
        csvMetricsMap.set(metric.name, metric)
      }
      
      // Update PDF properties with CSV data
      mergedProperties = pdfData.properties.map((property: any) => {
        // Check if we have a match for this PDF property
        const csvPropertyName = propertyMatches.get(property.name)
        
        if (csvPropertyName) {
          const csvMetric = csvMetricsMap.get(csvPropertyName)
          if (csvMetric) {
            return {
              ...property,
              nightsBooked: csvMetric.totalNights,
              avgNightStay: csvMetric.avgStayLength,
              bookingCount: csvMetric.bookingCount,
              avgNightlyRate: csvMetric.avgNightlyRate,
              hasAccurateMetrics: true,
              csvName: csvPropertyName // Store the matched CSV name
            }
          }
        }
        
        return {
          ...property,
          hasAccurateMetrics: false
        }
      })
      
      console.log(`Merged ${mergedProperties.filter((p: any) => p.hasAccurateMetrics).length} properties with CSV data`)
    }
    
    return NextResponse.json({
      success: true,
      data: {
        csv: csvData,
        properties: mergedProperties.length > 0 ? mergedProperties : csvData.propertyMetrics
      }
    })
    
  } catch (error) {
    console.error('CSV Upload API Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to process CSV'
      },
      { status: 500 }
    )
  }
}