import Papa from 'papaparse'

export interface Transaction {
  date: string
  type: string // 'Reservation', 'Payout', 'Co-Host payout'
  confirmationCode?: string
  startDate?: string
  endDate?: string
  nights?: number
  guest?: string
  listing: string
  amount: number
  serviceFee?: number
  cleaningFee?: number
  grossEarnings?: number
  currency: string
}

export interface ParsedCSV {
  transactions: Transaction[]
  totalRevenue: number
  totalPayouts: number
  totalCoHostPayouts: number
  propertyNames: string[]
  dateRange: {
    start: string
    end: string
  }
}

export class TransactionCSVParser {
  async parse(file: File): Promise<ParsedCSV> {
    const text = await file.text()
    
    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const transactions = this.processTransactions(results.data)
          const analysis = this.analyzeTransactions(transactions)
          resolve(analysis)
        },
        error: (error) => {
          reject(error)
        }
      })
    })
  }
  
  private processTransactions(data: any[]): Transaction[] {
    return data.map(row => {
      // Parse based on your CSV format
      const type = row['Type'] || ''
      const listing = row['Listing'] || ''
      
      // Handle amount parsing (remove $ and commas)
      const parseAmount = (val: string) => {
        if (!val) return 0
        return parseFloat(val.toString().replace(/[$,]/g, ''))
      }
      
      return {
        date: row['Date'] || '',
        type,
        confirmationCode: row['Confirmation code'] || undefined,
        startDate: row['Start date'] || undefined,
        endDate: row['End date'] || undefined,
        nights: row['Nights'] ? parseInt(row['Nights']) : undefined,
        guest: row['Guest'] || undefined,
        listing,
        amount: parseAmount(row['Amount'] || row['Paid out']),
        serviceFee: parseAmount(row['Service fee']),
        cleaningFee: parseAmount(row['Cleaning fee']),
        grossEarnings: parseAmount(row['Gross earnings']),
        currency: row['Currency'] || 'USD'
      }
    }).filter(t => t.date && (t.type || t.listing)) // Filter out empty rows
  }
  
  private analyzeTransactions(transactions: Transaction[]): ParsedCSV {
    // Calculate totals by type
    const totalRevenue = transactions
      .filter(t => t.type === 'Reservation')
      .reduce((sum, t) => sum + (t.grossEarnings || t.amount), 0)
    
    const totalPayouts = transactions
      .filter(t => t.type === 'Payout')
      .reduce((sum, t) => sum + t.amount, 0)
    
    const totalCoHostPayouts = transactions
      .filter(t => t.type === 'Co-Host payout')
      .reduce((sum, t) => sum + t.amount, 0)
    
    // Extract unique property names
    const propertyNames = [...new Set(
      transactions
        .map(t => t.listing)
        .filter(Boolean)
    )].sort()
    
    // Find date range
    const dates = transactions.map(t => t.date).filter(Boolean).sort()
    const dateRange = {
      start: dates[0] || '',
      end: dates[dates.length - 1] || ''
    }
    
    return {
      transactions,
      totalRevenue,
      totalPayouts,
      totalCoHostPayouts,
      propertyNames,
      dateRange
    }
  }
  
  // Map CSV property names to standardized names
  getPropertyMapping(csvName: string): string {
    const mappings: Record<string, string> = {
      'Tranquil Apartment Steps from Old Town Monrovia': 'Unit 1',
      'Monrovia Charm - Exclusive Rental Unit': 'Unit 2',
      'Private Studio Apartment - Great Location': 'Unit 3',
      'Old Town Monrovia Bungalow': 'Unit 4',
      'Minutes Wlk 2  OT Monrovia - 3 mile 2 City of Hope': 'Monrovia A',
      'Mountain View Getaway - 2 beds 1 bath Entire Unit': 'Monrovia B',
      'Private Bungalow near Old Town Monrovia': 'Unit C',
      'Adorable Affordable Studio Guest House': 'Unit D',
      'Work Away from Home Apartment': 'Unit A',
      'Sunrise Getaway -  A Studio Near APU': 'Azusa E - Sunrise Getaway',
      'A Studio near City of Hope/APU - Azusa Getaway -': 'Azusa F - Getaway',
      'A  Studio near City of Hope/APU Dream Getaway ': 'Azusa G - Dream Getaway',
      'HomeAway Lodge  -  A Studio near APU': 'Azusa H - HomeAway',
      'Lovely 2 large bedrooms w/ 1.5 bath. Free parking.': 'Glendora',
      'Comfortable Apartment for Two': 'Unit L1',
      'Cozy Stopover: Rest, Refresh, Nourish': 'Unit L2',
      'Serene Glendora Home w/ Pool & Prime Location': 'Unit G',
      'Modern RV • Quick Cozy Stay': 'L3 - Trailer'
    }
    
    return mappings[csvName] || csvName
  }
}