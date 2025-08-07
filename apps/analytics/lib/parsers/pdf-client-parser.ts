// Client-side PDF parser using PDF.js
// Only import pdfjs-dist when running in browser
let pdfjsLib: any = null

// Use a stable CDN version that's known to exist
const PDFJS_VERSION = '3.11.174'

// Dynamically load PDF.js in browser only
if (typeof window !== 'undefined') {
  import('pdfjs-dist').then((module) => {
    pdfjsLib = module
    // Use the stable version for the worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`
  })
}

export interface PropertyEarnings {
  name: string
  grossEarnings: number
  serviceFees: number
  netEarnings: number
  nightsBooked: number
  avgNightStay: number
}

export interface ParsedPDF {
  period: string
  totalGrossEarnings: number
  totalServiceFees: number
  totalNetEarnings: number
  totalNightsBooked: number
  properties: PropertyEarnings[]
}

export class PDFClientParser {
  async parse(file: File): Promise<ParsedPDF> {
    console.log('PDF Client Parser: Starting parse for:', file.name)
    
    try {
      // Ensure PDF.js is loaded
      if (!pdfjsLib) {
        console.log('Loading PDF.js library...')
        const module = await import('pdfjs-dist')
        pdfjsLib = module
        // Use the stable version for the worker
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`
      }
      
      // Convert file to array buffer
      const arrayBuffer = await file.arrayBuffer()
      
      // Load the PDF document
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      console.log('PDF loaded, pages:', pdf.numPages)
      
      // Extract text from all pages
      let fullText = ''
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        
        // Group text items by their y-position to reconstruct lines
        const items = textContent.items as any[]
        const lines: Map<number, string[]> = new Map()
        
        items.forEach((item) => {
          if (item.str && item.str.trim()) {
            // Round y-position to group items on same line
            const y = Math.round(item.transform[5])
            if (!lines.has(y)) {
              lines.set(y, [])
            }
            lines.get(y)!.push(item.str)
          }
        })
        
        // Sort by y-position (top to bottom) and join text on same line
        const sortedLines = Array.from(lines.entries())
          .sort((a, b) => b[0] - a[0]) // Sort descending (top to bottom in PDF coords)
          .map(([_, texts]) => texts.join(' ').trim())
          .filter(line => line.length > 0)
        
        fullText += sortedLines.join('\n') + '\n'
      }
      
      console.log('Extracted text length:', fullText.length)
      console.log('First 1000 chars of extracted text:', fullText.substring(0, 1000))
      
      // If we got PDF structure data instead of text, return empty
      if (fullText.includes('/Pages') || fullText.includes('/Font') || fullText.includes('/MediaBox')) {
        console.error('PDF extraction failed - got structure data instead of text content')
        // Try fallback to simple text extraction
        return this.fallbackParse(file, filename)
      }
      
      // Parse the extracted text
      return this.parseEarningsText(fullText, file.name)
    } catch (error) {
      console.error('PDF parsing error:', error)
      // Return empty data if parsing fails
      return {
        period: this.extractPeriod(file.name),
        totalGrossEarnings: 0,
        totalServiceFees: 0,
        totalNetEarnings: 0,
        totalNightsBooked: 0,
        properties: []
      }
    }
  }
  
  private parseEarningsText(text: string, filename: string): ParsedPDF {
    const properties: PropertyEarnings[] = []
    
    console.log('Parsing earnings text, first 500 chars:', text.substring(0, 500))
    
    // Split text into lines
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
    
    // Debug: Log first 20 lines to understand structure
    console.log('First 20 lines of PDF:', lines.slice(0, 20))
    
    // Look for property entries with earnings
    // Common patterns in Airbnb PDFs:
    // 1. Property name on one line, amount on next line
    // 2. Property name and amount on same line separated by spaces/dots
    // 3. Table format with columns
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Skip headers and footers
      if (line.toLowerCase().includes('page') ||
          line.toLowerCase().includes('airbnb') ||
          line.toLowerCase().includes('report') ||
          line.toLowerCase().includes('period') ||
          line.toLowerCase().includes('summary')) continue
      
      // Method 1: Look for lines with dollar amounts
      const dollarMatch = line.match(/\$\s?([\d,]+\.?\d{0,2})/)
      if (dollarMatch) {
        const amount = parseFloat(dollarMatch[1].replace(/,/g, ''))
        
        // Extract property name from same line (before the dollar amount)
        const beforeDollar = line.substring(0, line.indexOf('$')).trim()
        
        if (beforeDollar && beforeDollar.length > 2 && amount > 10 && amount < 100000) {
          // Remove any trailing dots or spaces
          const propertyName = beforeDollar.replace(/\.+$/, '').trim()
          
          properties.push({
            name: propertyName,
            grossEarnings: amount,
            serviceFees: amount * 0.03, // Estimate 3% fee
            netEarnings: amount * 0.97,
            nightsBooked: Math.max(1, Math.floor(amount / 150)), // Estimate nights
            avgNightStay: 3.0 // Default
          })
        } else if (i > 0 && amount > 10 && amount < 100000) {
          // Method 2: Property name might be on previous line
          const prevLine = lines[i - 1]
          if (prevLine && !prevLine.includes('$') && prevLine.length > 2) {
            properties.push({
              name: prevLine.replace(/\.+$/, '').trim(),
              grossEarnings: amount,
              serviceFees: amount * 0.03,
              netEarnings: amount * 0.97,
              nightsBooked: Math.max(1, Math.floor(amount / 150)),
              avgNightStay: 3.0
            })
          }
        }
      }
    }
    
    // Calculate totals
    const totalGrossEarnings = properties.reduce((sum, p) => sum + p.grossEarnings, 0)
    const totalServiceFees = properties.reduce((sum, p) => sum + p.serviceFees, 0)
    const totalNetEarnings = properties.reduce((sum, p) => sum + p.netEarnings, 0)
    const totalNightsBooked = properties.reduce((sum, p) => sum + p.nightsBooked, 0)
    
    console.log(`Parsed ${properties.length} properties from PDF`)
    
    return {
      period: this.extractPeriod(filename),
      totalGrossEarnings,
      totalServiceFees,
      totalNetEarnings,
      totalNightsBooked,
      properties
    }
  }
  
  private extractPeriod(filename: string): string {
    // Extract date from filename format: MM_DD_YYYY-MM_DD_YYYY_airbnb_earnings.pdf
    const dateMatch = filename.match(/(\d{2})_\d{2}_(\d{4})/);
    if (dateMatch) {
      const month = parseInt(dateMatch[1])
      const year = dateMatch[2]
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                         'July', 'August', 'September', 'October', 'November', 'December']
      return `${monthNames[month - 1]} ${year}`
    }
    return "Current Period"
  }
  
  private async fallbackParse(file: File, filename: string): Promise<ParsedPDF> {
    console.log('Using fallback parser - returning empty data for now')
    
    // For now, return empty data
    // In production, you might want to use server-side parsing
    return {
      period: this.extractPeriod(filename),
      totalGrossEarnings: 0,
      totalServiceFees: 0,
      totalNetEarnings: 0,
      totalNightsBooked: 0,
      properties: []
    }
  }
}