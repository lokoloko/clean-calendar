/**
 * Utility functions for deduplicating transactions by confirmation code
 * Handles multiple transaction line items for the same booking
 */

export interface Transaction {
  confirmationCode?: string
  startDate: string
  endDate: string
  nights: number
  amount: number
  grossEarnings?: number
  type?: string
  guest?: string
  listing?: string
  [key: string]: any
}

export interface UniqueBooking {
  confirmationCode: string
  startDate: string
  endDate: string
  nights: number
  revenue: number // Total of all positive amounts
  mainAmount: number // Largest single amount
  transactionCount: number
  guest?: string
  listing?: string
  transactions: Transaction[] // All related transactions
}

/**
 * Deduplicate transactions by confirmation code
 * Groups transactions with the same confirmation code and aggregates their values
 */
export function deduplicateTransactions(transactions: Transaction[]): {
  uniqueBookings: UniqueBooking[]
  stats: {
    totalTransactions: number
    uniqueBookingCount: number
    totalNights: number
    uniqueNights: number
    totalRevenue: number
  }
} {
  // Group by confirmation code
  const bookingsByCode = new Map<string, Transaction[]>()
  const transactionsWithoutCode: Transaction[] = []
  
  transactions.forEach(transaction => {
    const code = transaction.confirmationCode
    
    if (code) {
      if (!bookingsByCode.has(code)) {
        bookingsByCode.set(code, [])
      }
      bookingsByCode.get(code)!.push(transaction)
    } else {
      // Handle transactions without confirmation codes
      transactionsWithoutCode.push(transaction)
    }
  })
  
  // Process grouped bookings
  const uniqueBookings: UniqueBooking[] = []
  let totalNights = 0
  let uniqueNights = 0
  let totalRevenue = 0
  
  // Process bookings with confirmation codes
  bookingsByCode.forEach((bookingTransactions, code) => {
    // Sort by amount to find the main booking (highest positive amount)
    const sortedTransactions = [...bookingTransactions].sort((a, b) => b.amount - a.amount)
    const mainBooking = sortedTransactions[0]
    
    // Only process bookings with positive amounts and nights
    if (mainBooking.amount > 0 && mainBooking.nights > 0) {
      // Calculate total revenue from all positive amounts
      const bookingRevenue = bookingTransactions
        .filter(t => t.amount > 0)
        .reduce((sum, t) => sum + (t.grossEarnings || t.amount || 0), 0)
      
      uniqueBookings.push({
        confirmationCode: code,
        startDate: mainBooking.startDate,
        endDate: mainBooking.endDate,
        nights: mainBooking.nights,
        revenue: bookingRevenue,
        mainAmount: mainBooking.amount,
        transactionCount: bookingTransactions.length,
        guest: mainBooking.guest,
        listing: mainBooking.listing,
        transactions: bookingTransactions
      })
      
      uniqueNights += mainBooking.nights
      totalRevenue += bookingRevenue
    }
    
    // Count all nights from all transactions for comparison
    bookingTransactions.forEach(t => {
      totalNights += t.nights || 0
    })
  })
  
  // Process transactions without confirmation codes (treat each as unique)
  transactionsWithoutCode.forEach(transaction => {
    if (transaction.amount > 0 && transaction.nights > 0) {
      const revenue = transaction.grossEarnings || transaction.amount || 0
      
      uniqueBookings.push({
        confirmationCode: `no-code-${transaction.startDate}-${transaction.endDate}`,
        startDate: transaction.startDate,
        endDate: transaction.endDate,
        nights: transaction.nights,
        revenue: revenue,
        mainAmount: transaction.amount,
        transactionCount: 1,
        guest: transaction.guest,
        listing: transaction.listing,
        transactions: [transaction]
      })
      
      uniqueNights += transaction.nights
      totalRevenue += revenue
    }
    
    totalNights += transaction.nights || 0
  })
  
  return {
    uniqueBookings,
    stats: {
      totalTransactions: transactions.length,
      uniqueBookingCount: uniqueBookings.length,
      totalNights, // Sum of all transaction nights (includes duplicates)
      uniqueNights, // Sum of unique booking nights
      totalRevenue
    }
  }
}

/**
 * Calculate monthly aggregates from unique bookings
 */
export function aggregateBookingsByMonth(
  bookings: UniqueBooking[],
  startDate?: Date,
  endDate?: Date
): Map<string, { revenue: number; nights: number; bookings: number }> {
  const monthlyData = new Map<string, { revenue: number; nights: number; bookings: number }>()
  
  bookings.forEach(booking => {
    const date = new Date(booking.startDate)
    
    // Skip if outside date range
    if (startDate && date < startDate) return
    if (endDate && date > endDate) return
    
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear()
      const month = date.getMonth()
      const key = `${year}-${month}`
      
      if (!monthlyData.has(key)) {
        monthlyData.set(key, { revenue: 0, nights: 0, bookings: 0 })
      }
      
      const data = monthlyData.get(key)!
      data.revenue += booking.revenue
      data.nights += booking.nights
      data.bookings += 1
    }
  })
  
  return monthlyData
}

/**
 * Calculate average stay length from unique bookings
 */
export function calculateAverageStay(bookings: UniqueBooking[]): number {
  if (bookings.length === 0) return 0
  
  const totalNights = bookings.reduce((sum, b) => sum + b.nights, 0)
  return totalNights / bookings.length
}

/**
 * Calculate occupancy rate from unique bookings
 */
export function calculateOccupancy(
  bookings: UniqueBooking[],
  startDate: Date,
  endDate: Date
): number {
  const uniqueNights = bookings.reduce((sum, b) => sum + b.nights, 0)
  const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
  
  return Math.min(100, (uniqueNights / totalDays) * 100)
}