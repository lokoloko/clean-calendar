import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('Test PDF endpoint called')
    
    const formData = await request.formData()
    const pdfFile = formData.get('pdf') as File | null
    
    if (!pdfFile) {
      return NextResponse.json({ error: 'No PDF file provided' }, { status: 400 })
    }
    
    console.log('PDF file received:', {
      name: pdfFile.name,
      size: pdfFile.size,
      type: pdfFile.type
    })
    
    // Try simple text extraction
    const arrayBuffer = await pdfFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Check if it's a PDF
    const header = buffer.toString('utf8', 0, 5)
    console.log('File header:', header)
    
    if (header !== '%PDF-') {
      return NextResponse.json({ error: 'Not a valid PDF file' }, { status: 400 })
    }
    
    // Try using pdf-parse
    try {
      const pdfParse = require('pdf-parse')
      // Don't pass any options to avoid test file loading
      const data = await pdfParse(buffer, {})
      
      console.log('PDF parsed successfully')
      console.log('Pages:', data.numpages)
      console.log('Text length:', data.text.length)
      console.log('First 1000 chars:', data.text.substring(0, 1000))
      
      // Parse for properties
      const lines = data.text.split('\n').filter((line: string) => line.trim())
      const properties: any[] = []
      
      for (const line of lines) {
        // Look for lines with property data (multiple dollar amounts)
        if (line.includes('$')) {
          const dollarMatches = line.match(/\$[\d,]+\.?\d{0,2}/g)
          if (dollarMatches && dollarMatches.length >= 3) {
            const firstDollarIndex = line.indexOf('$')
            if (firstDollarIndex > 0) {
              const propertyName = line.substring(0, firstDollarIndex).trim()
              const grossEarnings = parseFloat(dollarMatches[0].replace(/[\$,]/g, ''))
              
              // Skip headers and zero-earning properties
              if (propertyName && 
                  !propertyName.toLowerCase().includes('total') &&
                  !propertyName.toLowerCase().includes('earnings') &&
                  !propertyName.toLowerCase().includes('home') &&
                  grossEarnings > 0) {
                properties.push({
                  name: propertyName,
                  gross: grossEarnings,
                  line: line
                })
              }
            }
          }
        }
      }
      
      return NextResponse.json({
        success: true,
        pages: data.numpages,
        textLength: data.text.length,
        propertiesFound: properties.length,
        properties: properties,
        sampleText: data.text.substring(0, 500)
      })
      
    } catch (error: any) {
      console.error('pdf-parse error:', error)
      return NextResponse.json({
        error: 'PDF parsing failed',
        details: error.message
      }, { status: 500 })
    }
    
  } catch (error: any) {
    console.error('Test PDF error:', error)
    return NextResponse.json({
      error: 'Failed to process PDF',
      details: error.message
    }, { status: 500 })
  }
}