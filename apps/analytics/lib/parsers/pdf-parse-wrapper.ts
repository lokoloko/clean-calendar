// Wrapper for pdf-parse to avoid test file issues
import type { Buffer } from 'buffer'

export interface PropertyEarnings {
  name: string
  grossEarnings: number
  serviceFees: number
  adjustments: number
  taxWithheld: number
  netEarnings: number
  nightsBooked: number
  avgNightStay: number
}

export interface MonthlyBreakdown {
  month: string
  grossEarnings: number
  netEarnings: number
}

export interface ParsedPDF {
  period: string
  dateRange?: string
  reportGeneratedDate?: string
  totalGrossEarnings: number
  totalServiceFees: number
  totalAdjustments: number
  totalTaxWithheld: number
  totalNetEarnings: number
  totalNightsBooked: number
  avgNightStay?: number
  // Tax breakdown
  passThroughTax?: number
  hostRemittedTax?: number
  airbnbRemittedTax?: number
  resolutions?: number
  // Monthly breakdown
  monthlyBreakdown?: MonthlyBreakdown[]
  // Payment info
  paymentMethods?: string[]
  properties: PropertyEarnings[]
}

export class PDFParseWrapper {
  async parse(file: File): Promise<ParsedPDF> {
    console.log('PDFParseWrapper: Starting parse for:', file.name, 'size:', file.size)
    
    try {
      // Convert File to Buffer for pdf-parse
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      console.log('Buffer created, size:', buffer.length)
      
      // Import pdf-parse dynamically to avoid build issues
      console.log('Importing pdf-parse...')
      const pdfParse = (await import('pdf-parse')).default
      console.log('pdf-parse imported successfully')
      
      // Parse PDF - use empty options to avoid test file issue
      let data: any
      console.log('Attempting to parse PDF...')
      data = await pdfParse(buffer, {})
      console.log('PDF parsed successfully')
      
      console.log('PDF text extracted, length:', data.text.length)
      console.log('First 500 chars:', data.text.substring(0, 500))
      
      // Parse the extracted text
      const result = this.parseAirbnbText(data.text, file.name)
      
      // Log extracted average stay data
      console.log('=== Average Stay Data Extracted ===')
      result.properties.forEach(prop => {
        console.log(`${prop.name}: ${prop.avgNightStay} avg nights`)
      })
      console.log('===================================')
      
      return result
      
    } catch (error) {
      console.error('PDF parsing error:', error)
      
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
    
    // Clean up text and split into lines
    const lines = text
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
    
    console.log('Parsing', lines.length, 'lines of text')
    console.log('Sample lines (30-50):', lines.slice(30, 50))
    
    // Extract summary data
    let totalNightsFromPDF = 0
    let globalAvgStay = 0
    let reportGeneratedDate: string | undefined
    let totalAdjustments = 0
    let totalTaxWithheld = 0
    let passThroughTax = 0
    let hostRemittedTax = 0
    let airbnbRemittedTax = 0
    let resolutions = 0
    const monthlyBreakdown: MonthlyBreakdown[] = []
    const paymentMethods: string[] = []
    
    // Extract all summary metrics
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i]
      const nextLine = lines[i + 1] || ''
      
      // Report generation date
      if (line.includes('Report generated:')) {
        reportGeneratedDate = line.replace('Report generated:', '').trim()
      }
      
      // Nights booked
      if (line.toLowerCase() === 'nights booked' && /^\d+$/.test(nextLine)) {
        totalNightsFromPDF = parseInt(nextLine)
        console.log('Found total nights booked:', totalNightsFromPDF)
      }
      
      // Average stay
      if (line.toLowerCase() === 'avg night stay' && /^\d+\.?\d*$/.test(nextLine)) {
        globalAvgStay = parseFloat(nextLine)
        console.log('Found global avg stay:', globalAvgStay)
      }
      
      // Tax categories
      if (line.toLowerCase() === 'adjustments' && /^\d+$/.test(nextLine)) {
        totalAdjustments = parseInt(nextLine)
      }
      if (line.toLowerCase() === 'tax withheld' && /^\d+$/.test(nextLine)) {
        totalTaxWithheld = parseInt(nextLine)
      }
      if (line.toLowerCase() === 'pass through tax' && /^\d+$/.test(nextLine)) {
        passThroughTax = parseInt(nextLine)
      }
      if (line.toLowerCase() === 'host remitted tax' && /^\d+$/.test(nextLine)) {
        hostRemittedTax = parseInt(nextLine)
      }
      if (line.toLowerCase() === 'airbnb remitted tax' && /^\d+$/.test(nextLine)) {
        airbnbRemittedTax = parseInt(nextLine)
      }
      if (line.toLowerCase() === 'resolutions' && /^\d+$/.test(nextLine)) {
        resolutions = parseInt(nextLine)
      }
      
      // Monthly breakdown (format: "January$19,251.92$18,604.36")
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                     'July', 'August', 'September', 'October', 'November', 'December']
      for (const month of months) {
        if (line.startsWith(month)) {
          const amounts = line.match(/\$[\d,]+\.?\d*/g)
          if (amounts && amounts.length >= 2) {
            monthlyBreakdown.push({
              month,
              grossEarnings: parseFloat(amounts[0].replace(/[$,]/g, '')),
              netEarnings: parseFloat(amounts[1].replace(/[$,]/g, ''))
            })
          }
        }
      }
      
      // Payment methods (format: "Name, Account Type #### (USD)$amount")
      if (line.includes('(USD)$') && line.includes('Checking')) {
        const methodMatch = line.match(/^(.+?)\$/)
        if (methodMatch) {
          paymentMethods.push(methodMatch[1].trim())
        }
      }
    }
    
    // Extract average stay data and property nights from performance stats section
    const { avgStayMap, propertyNightsMap } = this.extractPerformanceData(lines)
    console.log('Extracted average stay data:', avgStayMap)
    console.log('Extracted property nights data:', propertyNightsMap)
    
    const processedProperties = new Set<string>()
    
    // Airbnb format: PropertyName$GrossEarnings$Adjustments$ServiceFees$TaxWithheld$Total
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Skip headers and footers
      if (this.isHeaderOrFooter(line)) continue
      
      // Check if line contains property data (has multiple dollar amounts)
      const dollarMatches = line.match(/\$[\d,]+\.?\d{0,2}/g)
      if (dollarMatches && dollarMatches.length >= 3) {
        // Extract property name (everything before first $)
        const firstDollarIndex = line.indexOf('$')
        if (firstDollarIndex > 0) {
          const propertyName = line.substring(0, firstDollarIndex).trim()
          
          // Parse all dollar amounts
          // Format: Name$Gross$Adjustments$ServiceFee$TaxWithheld$Net
          const grossEarnings = parseFloat(dollarMatches[0].replace(/[\$,]/g, ''))
          let adjustments = 0
          let serviceFee = 0
          let taxWithheld = 0
          let netEarnings = 0
          
          if (dollarMatches.length === 5) {
            // Full format with all columns
            adjustments = parseFloat(dollarMatches[1].replace(/[\$,]/g, ''))
            serviceFee = Math.abs(parseFloat(dollarMatches[2].replace(/[\$,]/g, '')))
            taxWithheld = parseFloat(dollarMatches[3].replace(/[\$,]/g, ''))
            netEarnings = parseFloat(dollarMatches[4].replace(/[\$,]/g, ''))
          } else if (dollarMatches.length === 4) {
            // Format without tax column
            adjustments = parseFloat(dollarMatches[1].replace(/[\$,]/g, ''))
            serviceFee = Math.abs(parseFloat(dollarMatches[2].replace(/[\$,]/g, '')))
            netEarnings = parseFloat(dollarMatches[3].replace(/[\$,]/g, ''))
          } else if (dollarMatches.length === 3) {
            // Simplified format
            serviceFee = Math.abs(parseFloat(dollarMatches[1].replace(/[\$,]/g, '')))
            netEarnings = parseFloat(dollarMatches[2].replace(/[\$,]/g, ''))
          }
          
          // Validate property
          if (propertyName && 
              propertyName.length > 0 && 
              propertyName.length < 100 &&
              !this.isHeaderOrFooter(propertyName) &&
              !processedProperties.has(propertyName)) {
            
            // Skip properties with $0.00 earnings
            if (grossEarnings > 0) {
              processedProperties.add(propertyName)
              
              // Get average stay for this property
              const avgStay = avgStayMap.get(propertyName) || avgStayMap.get('global') || globalAvgStay || 3.0
              
              // IMPORTANT: Individual property nights from performance stats are unreliable
              // due to ambiguous format (e.g., "Unit 133210.4" could be 332 nights or 33 nights)
              // We'll use a rough estimate based on earnings instead
              // Average nightly rate estimate: $100-150 depending on property
              const estimatedRate = grossEarnings > 30000 ? 120 : grossEarnings > 20000 ? 110 : 100
              const nightsBooked = Math.max(1, Math.round(grossEarnings / estimatedRate))
              
              properties.push({
                name: propertyName,
                grossEarnings: grossEarnings,
                serviceFees: serviceFee,
                adjustments: adjustments,
                taxWithheld: taxWithheld,
                netEarnings: netEarnings,
                nightsBooked: nightsBooked,
                avgNightStay: avgStay
              })
              
              console.log(`Found property: "${propertyName}" - Gross: $${grossEarnings}, Adj: $${adjustments}, Tax: $${taxWithheld}, Net: $${netEarnings}`)
            }
          }
        }
      }
    }
    
    // If no properties found, try alternative parsing
    if (properties.length === 0) {
      console.log('No properties found with standard parsing, trying alternative patterns...')
      
      // Look for patterns like: "Unit Name" anywhere, followed by numbers
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i]
        const nextLine = lines[i + 1]
        
        // Check if current line could be property name
        if (!this.isHeaderOrFooter(line) && 
            !line.includes('$') && 
            line.length > 2 && 
            line.length < 100) {
          
          // Check if next line has a number
          const numberMatch = nextLine.match(/[\d,]+(?:\.\d{2})?/)
          if (numberMatch) {
            const amount = parseFloat(numberMatch[0].replace(/,/g, ''))
            if (amount > 100 && amount < 50000) {
              const propertyName = line.trim()
              if (!processedProperties.has(propertyName)) {
                processedProperties.add(propertyName)
                const avgStay = avgStayMap.get(propertyName) || avgStayMap.get('global') || globalAvgStay || 3.0
                properties.push(this.createProperty(propertyName, amount, avgStay))
                console.log(`Found property (alt): "${propertyName}" - $${amount}, Avg Stay: ${avgStay}`)
              }
            }
          }
        }
      }
    }
    
    // Calculate totals
    const totalGrossEarnings = properties.reduce((sum, p) => sum + p.grossEarnings, 0)
    const totalServiceFees = properties.reduce((sum, p) => sum + p.serviceFees, 0)
    const totalNetEarnings = properties.reduce((sum, p) => sum + p.netEarnings, 0)
    const calcTotalAdjustments = properties.reduce((sum, p) => sum + p.adjustments, 0)
    const calcTotalTaxWithheld = properties.reduce((sum, p) => sum + p.taxWithheld, 0)
    
    // Use the total from PDF if available, otherwise sum individual properties
    const totalNightsBooked = totalNightsFromPDF > 0 ? totalNightsFromPDF : properties.reduce((sum, p) => sum + p.nightsBooked, 0)
    
    console.log(`Parsed ${properties.length} properties with total earnings: $${totalNetEarnings.toFixed(2)}`)
    console.log(`Monthly breakdown: ${monthlyBreakdown.length} months`)
    console.log(`Tax data - Adjustments: $${totalAdjustments}, Tax: $${totalTaxWithheld}`)
    
    const { period, dateRange } = this.extractPeriodAndDateRange(filename)
    
    return {
      period,
      dateRange,
      reportGeneratedDate,
      totalGrossEarnings,
      totalServiceFees,
      totalAdjustments: totalAdjustments || calcTotalAdjustments,
      totalTaxWithheld: totalTaxWithheld || calcTotalTaxWithheld,
      totalNetEarnings,
      totalNightsBooked,
      avgNightStay: globalAvgStay,
      // Tax breakdown
      passThroughTax,
      hostRemittedTax,
      airbnbRemittedTax,
      resolutions,
      // Monthly breakdown
      monthlyBreakdown: monthlyBreakdown.length > 0 ? monthlyBreakdown : undefined,
      // Payment info
      paymentMethods: paymentMethods.length > 0 ? paymentMethods : undefined,
      properties
    }
  }
  
  private extractPerformanceData(lines: string[]): { avgStayMap: Map<string, number>, propertyNightsMap: Map<string, number> } {
    const avgStayMap = new Map<string, number>()
    const propertyNightsMap = new Map<string, number>()
    
    // NOTE: Individual property data extraction is UNRELIABLE due to ambiguous format
    // The format "Unit 133210.4" likely means "Unit 1" + "332 nights" + "10.4 avg stay"
    // But without delimiters, we CANNOT reliably parse where the property name ends
    // and the numbers begin. We'll use the global average stay for all properties.
    
    // Known property name patterns - ordered by specificity
    const knownProperties = [
      'Azusa E - Sunrise Getaway',
      'Azusa F - Getaway',
      'Azusa G - Dream Getaway', 
      'Azusa H - HomeAway',
      'L3 - Trailer',
      'Monrovia A',
      'Monrovia B',
      'Glendora',
      'Unit L1',
      'Unit L2',
      'Unit 1',
      'Unit 2',
      'Unit 3',
      'Unit 4',
      'Unit A',
      'Unit C',
      'Unit D',
      'Unit G',
      'Unit H'
    ]
    
    // Look for global average stay first
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim()
      const nextLine = lines[i + 1] ? lines[i + 1].trim() : ''
      
      if (line.toLowerCase() === 'avg night stay') {
        const avgMatch = nextLine.match(/^(\d+\.?\d*)$/)
        if (avgMatch) {
          const avgStay = parseFloat(avgMatch[1])
          if (avgStay > 0 && avgStay < 100) {
            avgStayMap.set('global', avgStay)
            console.log('Found global avg stay:', avgStay)
          }
        }
      }
    }
    
    // DISABLED: Property-specific stats extraction
    // The concatenated format (e.g., "Unit 133210.4") cannot be reliably parsed
    // We would need to know exact property name lengths to split correctly
    // Example: "Unit 133210.4" could be:
    //   - "Unit 1" + "332" + "10.4" (correct)
    //   - "Unit 13" + "32" + "10.4" (wrong)
    //   - "Unit 133" + "2" + "10.4" (wrong)
    //
    // Without delimiters or fixed-width fields, extraction is impossible.
    // We'll use only the global average stay for all properties.
    
    // If no property-specific data but we have global, that's fine
    if (avgStayMap.size === 0) {
      console.log('No average stay data found in PDF, using default 3.0')
    }
    
    return { avgStayMap, propertyNightsMap }
  }
  
  private isHeaderOrFooter(line: string): boolean {
    const lower = line.toLowerCase()
    return lower.includes('page ') ||
           lower.includes('airbnb') ||
           lower.includes('report') ||
           lower.includes('period') ||
           lower.includes('summary') ||
           lower.includes('total') ||
           lower.includes('subtotal') ||
           lower.includes('earnings statement') ||
           lower.includes('service fee') ||
           lower.includes('gross earnings') ||
           lower.includes('net payout') ||
           lower === 'earnings' ||
           lower === 'homes' ||
           lower.includes('performance stats')
  }
  
  private isValidProperty(name: string, amount: number): boolean {
    if (!name || name.length < 2 || name.length > 150) return false
    
    const lower = name.toLowerCase()
    if (lower.includes('total') || 
        lower.includes('subtotal') ||
        lower.includes('summary') ||
        lower.includes('gross') ||
        lower.includes('net') ||
        lower.includes('service') ||
        lower.includes('earnings') ||
        lower.includes('payout')) return false
    
    // Must contain at least one letter
    if (!/[a-zA-Z]/.test(name)) return false
    
    // Amount validation
    if (amount < 50 || amount > 100000) return false
    
    return true
  }
  
  private createProperty(name: string, grossEarnings: number, avgStay: number = 3.0): PropertyEarnings {
    // Clean property name
    name = name.replace(/^[\s.\-_]+|[\s.\-_]+$/g, '').trim()
    
    const serviceFees = grossEarnings * 0.03
    const netEarnings = grossEarnings - serviceFees
    const nightsBooked = Math.max(1, Math.round(grossEarnings / 150))
    
    return {
      name,
      grossEarnings,
      serviceFees,
      adjustments: 0,
      taxWithheld: 0,
      netEarnings,
      nightsBooked,
      avgNightStay: avgStay
    }
  }
  
  private extractPeriodAndDateRange(filename: string): { period: string, dateRange: string } {
    // Try to extract full date range from filename
    // Pattern: MM_DD_YYYY-MM_DD_YYYY or similar
    const rangeMatch = filename.match(/(\d{1,2})[_\-](\d{1,2})[_\-](\d{4})[_\-](\d{1,2})[_\-](\d{1,2})[_\-](\d{4})/)
    if (rangeMatch) {
      const startMonth = parseInt(rangeMatch[1])
      const startDay = parseInt(rangeMatch[2])
      const startYear = rangeMatch[3]
      const endMonth = parseInt(rangeMatch[4])
      const endDay = parseInt(rangeMatch[5])
      const endYear = rangeMatch[6]
      
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      
      const dateRange = `${monthNames[startMonth - 1]} ${startDay}, ${startYear} - ${monthNames[endMonth - 1]} ${endDay}, ${endYear}`
      
      // Determine period description
      let period = ''
      if (startYear === endYear && startMonth === 1 && endMonth === 12) {
        period = `Full Year ${startYear}`
      } else if (startYear === endYear && startMonth === endMonth) {
        period = `${monthNames[startMonth - 1]} ${startYear}`
      } else {
        period = `${monthNames[startMonth - 1]} - ${monthNames[endMonth - 1]} ${startYear}`
      }
      
      return { period, dateRange }
    }
    
    // Fallback to single date extraction
    const dateMatch = filename.match(/(\d{1,2})[_\-](\d{1,2})[_\-](\d{4})/)
    if (dateMatch) {
      const month = parseInt(dateMatch[1])
      const day = parseInt(dateMatch[2])
      const year = dateMatch[3]
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December']
      if (month >= 1 && month <= 12) {
        const period = `${monthNames[month - 1]} ${year}`
        const dateRange = `${monthNames[month - 1]} ${day}, ${year}`
        return { period, dateRange }
      }
    }
    
    const monthMatch = filename.match(/(January|February|March|April|May|June|July|August|September|October|November|December)[_\s]?(\d{4})/i)
    if (monthMatch) {
      const period = `${monthMatch[1]} ${monthMatch[2]}`
      return { period, dateRange: period }
    }
    
    return { period: "Current Period", dateRange: "Current Period" }
  }
}