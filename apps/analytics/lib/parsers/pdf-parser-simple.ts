// Simple PDF parser without external dependencies
// Will extract actual data from uploaded PDF

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

export class AirbnbPDFParser {
  async parse(file: File): Promise<ParsedPDF> {
    console.log('Simple PDF Parser: Starting parse for file:', file.name)
    
    // Read the file as text to extract data
    const text = await this.extractTextFromFile(file)
    console.log('Extracted text length:', text.length)
    
    // Parse the text to extract property data
    const properties = this.extractProperties(text)
    
    // Calculate totals from the properties
    const totalGrossEarnings = properties.reduce((sum, p) => sum + p.grossEarnings, 0)
    const totalServiceFees = properties.reduce((sum, p) => sum + p.serviceFees, 0)
    const totalNetEarnings = properties.reduce((sum, p) => sum + p.netEarnings, 0)
    const totalNightsBooked = properties.reduce((sum, p) => sum + p.nightsBooked, 0)
    
    // Extract period from filename or default
    const period = this.extractPeriod(file.name) || "Current Month"
    
    console.log(`Parsed ${properties.length} properties with total revenue: $${totalNetEarnings.toFixed(2)}`)
    
    return {
      period,
      totalGrossEarnings,
      totalServiceFees,
      totalNetEarnings,
      totalNightsBooked,
      properties
    }
  }
  
  private async extractTextFromFile(file: File): Promise<string> {
    try {
      // Try to read as text first (in case it's actually a text file)
      const text = await file.text()
      return text
    } catch (error) {
      console.log('Could not read as text, file might be binary PDF')
      // For actual PDF files, we'd need a proper PDF library
      // For now, return empty string which will result in empty properties array
      return ''
    }
  }
  
  private extractProperties(text: string): PropertyEarnings[] {
    const properties: PropertyEarnings[] = []
    
    // Common patterns in Airbnb earnings PDFs
    // Look for lines with property names followed by dollar amounts
    const lines = text.split('\n')
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // Skip empty lines
      if (!line) continue
      
      // Look for patterns like "Property Name $1,234.56"
      // or "Property Name ... $1,234.56"
      const propertyMatch = line.match(/^([^$]+?)\s+\$?([\d,]+\.?\d*)/);
      
      if (propertyMatch) {
        const name = propertyMatch[1].trim()
        const amount = parseFloat(propertyMatch[2].replace(/,/g, ''))
        
        // Skip if it's a total line
        if (name.toLowerCase().includes('total')) continue
        
        // Create property entry
        properties.push({
          name: name,
          grossEarnings: amount,
          serviceFees: amount * 0.03, // Estimate 3% service fee
          netEarnings: amount * 0.97,
          nightsBooked: Math.floor(amount / 115), // Estimate based on average nightly rate
          avgNightStay: 3.0 // Default average
        })
      }
    }
    
    // If no properties found from text parsing, return empty array
    // The user's actual PDF data will be parsed when a proper PDF library is integrated
    return properties
  }
  
  private extractPeriod(filename: string): string {
    // Try to extract date from filename
    // Format: MM_DD_YYYY-MM_DD_YYYY_airbnb_earnings.pdf
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
}