import { NextRequest, NextResponse } from 'next/server'
import { AirbnbPDFParser } from '@/lib/parsers/pdf-parser'
import { TransactionCSVParser } from '@/lib/parsers/csv-parser'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const pdfFile = formData.get('pdf') as File | null
    const csvFile = formData.get('csv') as File | null
    
    const results = {
      pdf: null as any,
      csv: null as any,
      properties: [] as any[],
      summary: {
        totalRevenue: 0,
        activeProperties: 0,
        inactiveProperties: 0,
        totalNights: 0
      }
    }
    
    // Parse PDF if provided
    if (pdfFile) {
      const pdfParser = new AirbnbPDFParser()
      const pdfData = await pdfParser.parse(pdfFile)
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
      const csvParser = new TransactionCSVParser()
      const csvData = await csvParser.parse(csvFile)
      results.csv = csvData
      
      // If we have CSV data but no PDF, use CSV for summary
      if (!pdfFile) {
        results.summary.totalRevenue = csvData.totalRevenue
      }
    }
    
    // Store in session storage (in real app, would use database)
    // For now, we'll return the data to the client
    
    return NextResponse.json({
      success: true,
      data: results
    })
    
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process files' },
      { status: 500 }
    )
  }
}