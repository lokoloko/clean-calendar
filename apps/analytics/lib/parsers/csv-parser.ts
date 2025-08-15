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

export interface PropertyMetrics {
  name: string
  totalNights: number
  bookingCount: number
  avgStayLength: number
  totalRevenue: number
  avgNightlyRate: number
  dateRange: {
    start: string
    end: string
  }
}

export interface ParsedCSV {
  transactions: Transaction[]
  totalRevenue: number
  totalPayouts: number
  totalCoHostPayouts: number
  propertyNames: string[]
  propertyMetrics: PropertyMetrics[]
  dateRange: {
    start: string
    end: string
  }
  // Historical data for upsell features
  historicalData?: {
    totalTransactions: number
    totalRevenue: number
    totalNights: number
    dateRange: {
      start: string
      end: string
    }
    yearlyBreakdown?: Array<{
      year: number
      revenue: number
      nights: number
      bookings: number
    }>
  }
}

export class TransactionCSVParser {
  async parse(file: File, dateRange?: { start: string, end: string }): Promise<ParsedCSV> {
    const text = await file.text()
    
    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const allTransactions = this.processTransactions(results.data)
          let transactions = allTransactions
          
          // Calculate historical data before filtering
          let historicalData = undefined
          if (dateRange?.start && dateRange?.end) {
            // Calculate historical metrics from all data
            historicalData = this.calculateHistoricalData(allTransactions)
            
            // Then filter for the requested period
            const startDate = new Date(dateRange.start)
            const endDate = new Date(dateRange.end)
            
            console.log(`Filtering CSV transactions to date range: ${dateRange.start} to ${dateRange.end}`)
            console.log(`Full CSV contains ${allTransactions.length} transactions from ${historicalData.dateRange.start} to ${historicalData.dateRange.end}`)
            
            transactions = allTransactions.filter(t => {
              if (!t.date) return false
              const transDate = new Date(t.date)
              return transDate >= startDate && transDate <= endDate
            })
            
            console.log(`Filtered to ${transactions.length} transactions for the period`)
          }
          
          const analysis = this.analyzeTransactions(transactions)
          if (historicalData) {
            analysis.historicalData = historicalData
          }
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
    // Group reservations by confirmation code to handle duplicate payment rows
    const groupedReservations = this.groupReservationsByConfirmationCode(transactions)
    
    // Calculate totals using grouped data for accurate metrics
    const totalRevenue = Array.from(groupedReservations.values())
      .reduce((sum, booking) => sum + booking.totalRevenue, 0)
    
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
    
    // Calculate property metrics using grouped data
    const propertyMetrics = this.getPropertyMetricsFromGrouped(groupedReservations)
    
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
      propertyMetrics,
      dateRange
    }
  }
  
  // Group reservations by confirmation code to handle duplicate payment rows
  private groupReservationsByConfirmationCode(transactions: Transaction[]): Map<string, {
    listing: string
    nights: number
    totalRevenue: number
    startDate: string
    endDate: string
    bookingDate: string
    guest: string
  }> {
    const grouped = new Map<string, any>()
    
    // Only process reservation transactions
    const reservations = transactions.filter(t => t.type === 'Reservation')
    
    for (const transaction of reservations) {
      const code = transaction.confirmationCode
      
      // If no confirmation code, treat as unique transaction
      if (!code) {
        const uniqueKey = `no-code-${Math.random()}`
        grouped.set(uniqueKey, {
          listing: transaction.listing,
          nights: transaction.nights || 0,
          totalRevenue: transaction.grossEarnings || transaction.amount || 0,
          startDate: transaction.startDate || transaction.date,
          endDate: transaction.endDate || transaction.date,
          bookingDate: transaction.date,
          guest: transaction.guest || ''
        })
        continue
      }
      
      if (!grouped.has(code)) {
        // First occurrence - initialize the booking
        grouped.set(code, {
          listing: transaction.listing,
          nights: transaction.nights || 0, // Take nights value once
          totalRevenue: 0,
          startDate: transaction.startDate || transaction.date,
          endDate: transaction.endDate || transaction.date,
          bookingDate: transaction.date,
          guest: transaction.guest || ''
        })
      }
      
      // Add revenue from this row (handles multiple payments)
      const booking = grouped.get(code)
      booking.totalRevenue += transaction.grossEarnings || transaction.amount || 0
      
      // Update dates if earlier/later (using proper date comparison)
      const transStart = transaction.startDate ? new Date(transaction.startDate) : null
      const transEnd = transaction.endDate ? new Date(transaction.endDate) : null
      const bookingStart = booking.startDate ? new Date(booking.startDate) : null
      const bookingEnd = booking.endDate ? new Date(booking.endDate) : null
      
      if (transStart && (!bookingStart || transStart < bookingStart)) {
        booking.startDate = transaction.startDate
      }
      if (transEnd && (!bookingEnd || transEnd > bookingEnd)) {
        booking.endDate = transaction.endDate
      }
    }
    
    return grouped
  }
  
  // Calculate property metrics from grouped reservations
  private getPropertyMetricsFromGrouped(groupedReservations: Map<string, any>): PropertyMetrics[] {
    const propertyMap = new Map<string, PropertyMetrics>()
    
    for (const booking of groupedReservations.values()) {
      const propertyName = booking.listing
      if (!propertyName) continue
      
      if (!propertyMap.has(propertyName)) {
        propertyMap.set(propertyName, {
          name: propertyName,
          totalNights: 0,
          bookingCount: 0,
          avgStayLength: 0,
          totalRevenue: 0,
          avgNightlyRate: 0,
          dateRange: {
            start: booking.startDate,
            end: booking.endDate
          }
        })
      }
      
      const metrics = propertyMap.get(propertyName)!
      
      // Update metrics with correct values
      metrics.totalNights += booking.nights
      metrics.bookingCount += 1
      metrics.totalRevenue += booking.totalRevenue
      
      // Update date range to encompass all bookings (using proper date comparison)
      const bookingStart = booking.startDate ? new Date(booking.startDate) : null
      const bookingEnd = booking.endDate ? new Date(booking.endDate) : null
      const currentStart = metrics.dateRange.start ? new Date(metrics.dateRange.start) : null
      const currentEnd = metrics.dateRange.end ? new Date(metrics.dateRange.end) : null
      
      if (bookingStart && (!currentStart || bookingStart < currentStart)) {
        metrics.dateRange.start = booking.startDate
      }
      if (bookingEnd && (!currentEnd || bookingEnd > currentEnd)) {
        metrics.dateRange.end = booking.endDate
      }
    }
    
    // Calculate averages and occupancy correctly
    for (const metrics of propertyMap.values()) {
      if (metrics.bookingCount > 0) {
        metrics.avgStayLength = metrics.totalNights / metrics.bookingCount
      }
      if (metrics.totalNights > 0) {
        metrics.avgNightlyRate = metrics.totalRevenue / metrics.totalNights
      }
      
      // Validate date range
      if (metrics.dateRange.start && metrics.dateRange.end) {
        const start = new Date(metrics.dateRange.start)
        const end = new Date(metrics.dateRange.end)
        
        // If end is before start, swap them
        if (end < start) {
          const temp = metrics.dateRange.start
          metrics.dateRange.start = metrics.dateRange.end
          metrics.dateRange.end = temp
        }
      }
    }
    
    // Sort by revenue descending
    return Array.from(propertyMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue)
  }
  
  // Calculate accurate metrics for each property from transactions
  getPropertyMetrics(transactions: Transaction[]): PropertyMetrics[] {
    const propertyMap = new Map<string, PropertyMetrics>()
    
    // Only process reservation transactions (actual bookings)
    const reservations = transactions.filter(t => t.type === 'Reservation' && t.listing)
    
    for (const transaction of reservations) {
      const propertyName = transaction.listing
      
      if (!propertyMap.has(propertyName)) {
        propertyMap.set(propertyName, {
          name: propertyName,
          totalNights: 0,
          bookingCount: 0,
          avgStayLength: 0,
          totalRevenue: 0,
          avgNightlyRate: 0,
          dateRange: {
            start: transaction.startDate || transaction.date,
            end: transaction.endDate || transaction.date
          }
        })
      }
      
      const metrics = propertyMap.get(propertyName)!
      
      // Update metrics
      metrics.totalNights += transaction.nights || 0
      metrics.bookingCount += 1
      metrics.totalRevenue += transaction.grossEarnings || transaction.amount || 0
      
      // Update date range
      if (transaction.startDate && transaction.startDate < metrics.dateRange.start) {
        metrics.dateRange.start = transaction.startDate
      }
      if (transaction.endDate && transaction.endDate > metrics.dateRange.end) {
        metrics.dateRange.end = transaction.endDate
      }
    }
    
    // Calculate averages
    for (const metrics of propertyMap.values()) {
      if (metrics.bookingCount > 0) {
        metrics.avgStayLength = metrics.totalNights / metrics.bookingCount
      }
      if (metrics.totalNights > 0) {
        metrics.avgNightlyRate = metrics.totalRevenue / metrics.totalNights
      }
    }
    
    // Sort by revenue descending
    return Array.from(propertyMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue)
  }
  
  // Calculate historical analytics from all transactions
  private calculateHistoricalData(transactions: Transaction[]): ParsedCSV['historicalData'] {
    // Group reservations by confirmation code for accurate metrics
    const groupedReservations = this.groupReservationsByConfirmationCode(transactions)
    
    // Get date range
    const dates = transactions.map(t => t.date).filter(Boolean).sort()
    
    // Calculate yearly breakdown
    const yearlyData = new Map<number, { revenue: number, nights: number, bookings: number }>()
    
    for (const booking of groupedReservations.values()) {
      const bookingDate = booking.bookingDate
      if (!bookingDate) continue
      
      const year = new Date(bookingDate).getFullYear()
      
      if (!yearlyData.has(year)) {
        yearlyData.set(year, { revenue: 0, nights: 0, bookings: 0 })
      }
      
      const yearData = yearlyData.get(year)!
      yearData.revenue += booking.totalRevenue
      yearData.nights += booking.nights
      yearData.bookings += 1
    }
    
    // Convert to array and sort by year
    const yearlyBreakdown = Array.from(yearlyData.entries())
      .map(([year, data]) => ({ year, ...data }))
      .sort((a, b) => a.year - b.year)
    
    // Calculate totals from grouped data
    const totalRevenue = Array.from(groupedReservations.values())
      .reduce((sum, booking) => sum + booking.totalRevenue, 0)
    const totalNights = Array.from(groupedReservations.values())
      .reduce((sum, booking) => sum + booking.nights, 0)
    
    return {
      totalTransactions: transactions.length,
      totalRevenue,
      totalNights,
      dateRange: {
        start: dates[0] || '',
        end: dates[dates.length - 1] || ''
      },
      yearlyBreakdown
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