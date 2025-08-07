import { NextRequest, NextResponse } from 'next/server'
import { PDFParseWrapper } from '@/lib/parsers/pdf-parse-wrapper'
import { TransactionCSVParser } from '@/lib/parsers/csv-parser'

export async function POST(request: NextRequest) {
  try {
    console.log('Upload API: Starting file processing...')
    
    const formData = await request.formData()
    const pdfFile = formData.get('pdf') as File | null
    const csvFile = formData.get('csv') as File | null
    
    console.log('Upload API: Files received:', {
      hasPDF: !!pdfFile,
      hasCSV: !!csvFile,
      pdfSize: pdfFile?.size,
      csvSize: csvFile?.size
    })
    
    const results = {
      pdf: null as any,
      csv: null as any,
      properties: [] as any[],
      dataSource: 'pdf-only' as 'pdf-only' | 'pdf-csv',
      summary: {
        totalRevenue: 0,
        activeProperties: 0,
        inactiveProperties: 0,
        totalNights: 0
      }
    }
    
    // Parse PDF if provided
    if (pdfFile) {
      console.log('Upload API: Parsing PDF on server...')
      const pdfParser = new PDFParseWrapper()
      const pdfData = await pdfParser.parse(pdfFile)
      console.log('Upload API: PDF parsed successfully, found', pdfData.properties.length, 'properties')
      results.pdf = pdfData
      
      // Extract properties from PDF
      const activeProps = pdfData.properties.filter(p => p.netEarnings > 0)
      const inactiveProps = pdfData.properties.filter(p => p.netEarnings === 0)
      
      results.summary.totalRevenue = pdfData.totalNetEarnings
      results.summary.activeProperties = activeProps.length
      results.summary.inactiveProperties = inactiveProps.length
      results.summary.totalNights = pdfData.totalNightsBooked
      
      results.properties = pdfData.properties
    }
    
    // Parse CSV if provided
    if (csvFile) {
      console.log('Upload API: Parsing CSV for accurate property metrics...')
      const csvParser = new TransactionCSVParser()
      
      // If we have a PDF, use its date range to filter CSV transactions
      let dateFilter = undefined
      if (results.pdf?.dateRange) {
        // Extract start and end dates from PDF dateRange string (e.g., "Jan 1, 2024 - Dec 31, 2024")
        const dateMatch = results.pdf.dateRange.match(/(\w+ \d+, \d{4})\s*-\s*(\w+ \d+, \d{4})/)
        if (dateMatch) {
          dateFilter = {
            start: new Date(dateMatch[1]).toISOString().split('T')[0],
            end: new Date(dateMatch[2]).toISOString().split('T')[0]
          }
          console.log(`Using PDF date range for CSV filtering: ${dateFilter.start} to ${dateFilter.end}`)
        }
      }
      
      const csvData = await csvParser.parse(csvFile, dateFilter)
      results.csv = csvData
      results.dataSource = 'pdf-csv'
      
      console.log(`CSV parsed: ${csvData.propertyMetrics.length} properties with accurate metrics`)
      console.log(`CSV date range: ${csvData.dateRange.start} to ${csvData.dateRange.end}`)
      
      // If we have both PDF and CSV, merge the data for accurate metrics
      if (pdfFile && results.pdf) {
        console.log('Merging CSV metrics with PDF data...')
        
        // Create a map of CSV property metrics for easy lookup
        const csvMetricsMap = new Map<string, any>()
        for (const metric of csvData.propertyMetrics) {
          // Try both the original name and mapped name
          const mappedName = csvParser.getPropertyMapping(metric.name)
          csvMetricsMap.set(metric.name.toLowerCase(), metric)
          csvMetricsMap.set(mappedName.toLowerCase(), metric)
        }
        
        // Update PDF properties with accurate CSV data
        for (const property of results.properties) {
          const csvMetric = csvMetricsMap.get(property.name.toLowerCase())
          if (csvMetric) {
            // Override PDF estimates with CSV actuals
            property.nightsBooked = csvMetric.totalNights
            property.avgNightStay = csvMetric.avgStayLength
            property.bookingCount = csvMetric.bookingCount
            property.avgNightlyRate = csvMetric.avgNightlyRate
            property.hasAccurateMetrics = true
            console.log(`Updated ${property.name}: ${csvMetric.totalNights} nights, ${csvMetric.avgStayLength.toFixed(1)} avg stay`)
          } else {
            property.hasAccurateMetrics = false
            console.log(`No CSV match for ${property.name}, using PDF estimates`)
          }
        }
        
        // Update summary with accurate totals from CSV
        const totalAccurateNights = csvData.propertyMetrics.reduce((sum, m) => sum + m.totalNights, 0)
        if (totalAccurateNights > 0) {
          results.summary.totalNights = totalAccurateNights
        }
      } else if (!pdfFile) {
        // If we have CSV data but no PDF, use CSV for everything
        results.summary.totalRevenue = csvData.totalRevenue
        results.summary.totalNights = csvData.propertyMetrics.reduce((sum, m) => sum + m.totalNights, 0)
        
        // Create properties from CSV metrics
        results.properties = csvData.propertyMetrics.map(metric => ({
          name: metric.name,
          pdfName: metric.name,
          csvName: metric.name,
          netEarnings: metric.totalRevenue,
          revenue: metric.totalRevenue,
          nightsBooked: metric.totalNights,
          avgNightStay: metric.avgStayLength,
          bookingCount: metric.bookingCount,
          avgNightlyRate: metric.avgNightlyRate,
          hasAccurateMetrics: true,
          status: metric.totalRevenue > 0 ? 'active' : 'inactive'
        }))
        
        results.summary.activeProperties = results.properties.filter(p => p.status === 'active').length
        results.summary.inactiveProperties = results.properties.filter(p => p.status === 'inactive').length
      }
    }
    
    // Store in session storage (in real app, would use database)
    // For now, we'll return the data to the client
    
    return NextResponse.json({
      success: true,
      data: results
    })
    
  } catch (error) {
    console.error('Upload API Error:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to process files',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}