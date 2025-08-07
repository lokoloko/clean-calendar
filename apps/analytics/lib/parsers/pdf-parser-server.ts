// Server-side PDF parser for Vercel
// Uses pdf.js in Node.js environment without browser dependencies

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

export class ServerPDFParser {
  async parse(file: File): Promise<ParsedPDF> {
    console.log('Server PDF Parser: Starting parse for:', file.name)
    
    try {
      // Try to use a simpler approach first - just extract text
      const text = await file.text()
      console.log('File text length:', text.length)
      console.log('First 200 chars:', text.substring(0, 200))
      
      // Check if it's actually a PDF
      if (!text.startsWith('%PDF')) {
        console.log('Not a PDF file, trying to parse as text')
        return this.parseAirbnbText(text, file.name)
      }
      
      // Dynamic import to avoid build issues
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.js')
      
      // Convert file to array buffer
      const arrayBuffer = await file.arrayBuffer()
      
      // Load the PDF document
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        useSystemFonts: true,
      })
      
      const pdf = await loadingTask.promise
      console.log('PDF loaded on server, pages:', pdf.numPages)
      
      // Extract text from all pages
      let fullText = ''
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum)
        const textContent = await page.getTextContent()
        
        // Group items by y-position to maintain line structure
        const lines = new Map<number, string[]>()
        
        textContent.items.forEach((item: any) => {
          if (item.str && item.str.trim()) {
            // Round y-position to group items on same line
            const y = Math.round(item.transform ? item.transform[5] : 0)
            if (!lines.has(y)) {
              lines.set(y, [])
            }
            lines.get(y)!.push(item.str)
          }
        })
        
        // Sort by y-position and join
        const sortedLines = Array.from(lines.entries())
          .sort((a, b) => b[0] - a[0])
          .map(([_, texts]) => texts.join(' ').trim())
          .filter(line => line.length > 0)
        
        fullText += sortedLines.join('\n') + '\n'
      }
      
      console.log('Extracted text length:', fullText.length)
      console.log('First 500 chars:', fullText.substring(0, 500))
      
      // Parse the text
      return this.parseAirbnbText(fullText, file.name)
      
    } catch (error) {
      console.error('Server PDF parsing error:', error)
      
      // Return empty structure
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
  
  private parseAirbnbText(text: string, filename: string): ParsedPDF {
    const properties: PropertyEarnings[] = []
    
    // Clean up the text and split into lines
    const lines = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
    
    console.log('Parsing text with', lines.length, 'lines')
    console.log('Sample lines:', lines.slice(0, 10))
    
    // Look for patterns in Airbnb earnings PDFs
    // Common formats:
    // 1. "Property Name ................. $1,234.56"
    // 2. "Property Name" on one line, "$1,234.56" on next
    // 3. Table with columns: Property | Nights | Amount
    
    const processedProperties = new Set<string>()
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Skip headers, footers, and summary lines
      if (this.isHeaderOrFooter(line)) continue
      
      // Method 1: Line contains both property name and amount
      if (line.includes('$')) {
        const match = line.match(/^(.+?)\s*\.{2,}?\s*\$\s?([\d,]+\.?\d{0,2})/)
        if (match) {
          const name = match[1].trim()
          const amount = parseFloat(match[2].replace(/,/g, ''))
          
          if (this.isValidProperty(name, amount) && !processedProperties.has(name)) {
            processedProperties.add(name)
            properties.push(this.createProperty(name, amount))
          }
        } else {
          // Try simpler pattern: anything before $ is property name
          const dollarIndex = line.indexOf('$')
          if (dollarIndex > 0) {
            const name = line.substring(0, dollarIndex).trim()
            const amountStr = line.substring(dollarIndex + 1).trim()
            const amountMatch = amountStr.match(/^([\d,]+\.?\d{0,2})/)
            
            if (amountMatch) {
              const amount = parseFloat(amountMatch[1].replace(/,/g, ''))
              if (this.isValidProperty(name, amount) && !processedProperties.has(name)) {
                processedProperties.add(name)
                properties.push(this.createProperty(name, amount))
              }
            }
          }
        }
      }
      // Method 2: Property name on one line, amount on next
      else if (i < lines.length - 1) {
        const nextLine = lines[i + 1]
        if (nextLine.includes('$')) {
          const amountMatch = nextLine.match(/\$\s?([\d,]+\.?\d{0,2})/)
          if (amountMatch) {
            const amount = parseFloat(amountMatch[1].replace(/,/g, ''))
            if (this.isValidProperty(line, amount) && !processedProperties.has(line)) {
              processedProperties.add(line)
              properties.push(this.createProperty(line, amount))
              i++ // Skip the next line since we processed it
            }
          }
        }
      }
    }
    
    // Calculate totals
    const totalGrossEarnings = properties.reduce((sum, p) => sum + p.grossEarnings, 0)
    const totalServiceFees = properties.reduce((sum, p) => sum + p.serviceFees, 0)
    const totalNetEarnings = properties.reduce((sum, p) => sum + p.netEarnings, 0)
    const totalNightsBooked = properties.reduce((sum, p) => sum + p.nightsBooked, 0)
    
    console.log(`Parsed ${properties.length} properties with total earnings: $${totalNetEarnings.toFixed(2)}`)
    
    return {
      period: this.extractPeriod(filename),
      totalGrossEarnings,
      totalServiceFees,
      totalNetEarnings,
      totalNightsBooked,
      properties
    }
  }
  
  private isHeaderOrFooter(line: string): boolean {
    const lower = line.toLowerCase()
    return lower.includes('page') ||
           lower.includes('airbnb') ||
           lower.includes('report') ||
           lower.includes('period') ||
           lower.includes('summary') ||
           lower.includes('total') ||
           lower.includes('earnings statement') ||
           lower.includes('service fee')
  }
  
  private isValidProperty(name: string, amount: number): boolean {
    // Validate property name
    if (!name || name.length < 3 || name.length > 100) return false
    
    // Skip if it looks like a header or total
    const lower = name.toLowerCase()
    if (lower.includes('total') || 
        lower.includes('subtotal') ||
        lower.includes('summary') ||
        lower.includes('gross') ||
        lower.includes('net') ||
        lower.includes('service')) return false
    
    // Skip if name contains only numbers or special characters
    if (!/[a-zA-Z]/.test(name)) return false
    
    // Validate amount (reasonable range for monthly property earnings)
    if (amount < 10 || amount > 100000) return false
    
    return true
  }
  
  private createProperty(name: string, grossEarnings: number): PropertyEarnings {
    // Clean up property name
    name = name.replace(/\.{2,}/g, '').trim()
    
    // Airbnb typically charges 3% host service fee
    const serviceFees = grossEarnings * 0.03
    const netEarnings = grossEarnings - serviceFees
    
    // Estimate nights booked (average $150/night)
    const nightsBooked = Math.max(1, Math.round(grossEarnings / 150))
    
    return {
      name,
      grossEarnings,
      serviceFees,
      netEarnings,
      nightsBooked,
      avgNightStay: 3.0 // Default average stay
    }
  }
  
  private extractPeriod(filename: string): string {
    // Try to extract date from filename
    // Common formats:
    // - MM_DD_YYYY-MM_DD_YYYY_airbnb_earnings.pdf
    // - YYYY-MM_earnings.pdf
    // - December_2024_earnings.pdf
    
    // Try numeric date format
    const dateMatch = filename.match(/(\d{1,2})[_-](\d{1,2})[_-](\d{4})/)
    if (dateMatch) {
      const month = parseInt(dateMatch[1])
      const year = dateMatch[3]
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December']
      if (month >= 1 && month <= 12) {
        return `${monthNames[month - 1]} ${year}`
      }
    }
    
    // Try month name format
    const monthMatch = filename.match(/(January|February|March|April|May|June|July|August|September|October|November|December)[_\s]?(\d{4})/i)
    if (monthMatch) {
      return `${monthMatch[1]} ${monthMatch[2]}`
    }
    
    return "Current Period"
  }
}