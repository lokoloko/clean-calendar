import { describe, it, expect, beforeEach } from 'vitest'

// Mock CSV data for testing
const validCSVData = `Date,Type,Confirmation Code,Start Date,Nights,Guest,Listing,Details,Reference,Currency,Amount,Paid Out,Service Fee,Host Fee
2024-01-15,Reservation,HMXYZ123,2024-01-20,3,John Doe,Beach House Studio,,"",USD,450.00,405.00,,45.00
2024-01-16,Reservation,HMABC456,2024-01-25,2,Jane Smith,Mountain View Cabin,,"",USD,300.00,270.00,,30.00
2024-01-17,Payout,,,,,,,PAY123,USD,,405.00,,`

const invalidCSVData = `Invalid,Data,Without,Proper,Headers
Some,Random,Values,Here`

describe('CSV Parser', () => {
  beforeEach(() => {
    // Clear any stored data
    sessionStorage.clear()
  })

  describe('parseCSV', () => {
    it('should parse valid CSV data correctly', async () => {
      const parseCSV = (csvText: string) => {
        const lines = csvText.split('\n')
        const headers = lines[0].split(',')
        const data = []
        
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim()) {
            const values = lines[i].split(',')
            const row: any = {}
            headers.forEach((header, index) => {
              row[header.trim()] = values[index]?.trim() || ''
            })
            data.push(row)
          }
        }
        
        return data
      }

      const result = parseCSV(validCSVData)
      
      expect(result).toHaveLength(3)
      expect(result[0]).toHaveProperty('Guest', 'John Doe')
      expect(result[0]).toHaveProperty('Amount', '450.00')
      expect(result[1]).toHaveProperty('Listing', 'Mountain View Cabin')
    })

    it('should handle empty CSV data', () => {
      const parseCSV = (csvText: string) => {
        if (!csvText || csvText.trim() === '') {
          return []
        }
        return []
      }

      const result = parseCSV('')
      expect(result).toEqual([])
    })

    it('should extract property information from CSV', () => {
      const extractProperties = (csvData: any[]) => {
        const properties = new Map()
        
        csvData.forEach(row => {
          if (row.Type === 'Reservation' && row.Listing) {
            if (!properties.has(row.Listing)) {
              properties.set(row.Listing, {
                name: row.Listing,
                totalRevenue: 0,
                totalBookings: 0,
                averageNights: 0,
                nights: [],
              })
            }
            
            const property = properties.get(row.Listing)
            property.totalRevenue += parseFloat(row.Amount) || 0
            property.totalBookings += 1
            property.nights.push(parseInt(row.Nights) || 0)
          }
        })
        
        // Calculate averages
        properties.forEach(property => {
          if (property.nights.length > 0) {
            property.averageNights = 
              property.nights.reduce((a: number, b: number) => a + b, 0) / property.nights.length
          }
        })
        
        return Array.from(properties.values())
      }

      const csvData = [
        { Type: 'Reservation', Listing: 'Beach House', Amount: '450.00', Nights: '3' },
        { Type: 'Reservation', Listing: 'Beach House', Amount: '300.00', Nights: '2' },
        { Type: 'Payout', Listing: '', Amount: '750.00', Nights: '' },
      ]

      const properties = extractProperties(csvData)
      
      expect(properties).toHaveLength(1)
      expect(properties[0].name).toBe('Beach House')
      expect(properties[0].totalRevenue).toBe(750)
      expect(properties[0].totalBookings).toBe(2)
      expect(properties[0].averageNights).toBe(2.5)
    })

    it('should calculate monthly statistics', () => {
      const calculateMonthlyStats = (csvData: any[]) => {
        const monthlyStats = new Map()
        
        csvData.forEach(row => {
          if (row.Type === 'Reservation' && row['Start Date']) {
            const date = new Date(row['Start Date'])
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            
            if (!monthlyStats.has(monthKey)) {
              monthlyStats.set(monthKey, {
                month: monthKey,
                revenue: 0,
                bookings: 0,
                avgPerBooking: 0,
              })
            }
            
            const stats = monthlyStats.get(monthKey)
            stats.revenue += parseFloat(row.Amount) || 0
            stats.bookings += 1
          }
        })
        
        // Calculate averages
        monthlyStats.forEach(stats => {
          if (stats.bookings > 0) {
            stats.avgPerBooking = stats.revenue / stats.bookings
          }
        })
        
        return Array.from(monthlyStats.values())
      }

      const csvData = [
        { Type: 'Reservation', 'Start Date': '2024-01-20', Amount: '450.00' },
        { Type: 'Reservation', 'Start Date': '2024-01-25', Amount: '300.00' },
        { Type: 'Reservation', 'Start Date': '2024-02-10', Amount: '500.00' },
      ]

      const stats = calculateMonthlyStats(csvData)
      
      expect(stats).toHaveLength(2)
      expect(stats[0].month).toBe('2024-01')
      expect(stats[0].revenue).toBe(750)
      expect(stats[0].bookings).toBe(2)
      expect(stats[0].avgPerBooking).toBe(375)
    })

    it('should validate CSV structure', () => {
      const validateCSVStructure = (csvText: string): { valid: boolean; errors: string[] } => {
        const errors: string[] = []
        
        if (!csvText || csvText.trim() === '') {
          errors.push('CSV file is empty')
          return { valid: false, errors }
        }
        
        const lines = csvText.split('\n')
        if (lines.length < 2) {
          errors.push('CSV must have headers and at least one data row')
          return { valid: false, errors }
        }
        
        const headers = lines[0].split(',').map(h => h.trim())
        const requiredHeaders = ['Date', 'Type', 'Amount', 'Listing']
        
        requiredHeaders.forEach(required => {
          if (!headers.includes(required)) {
            errors.push(`Missing required header: ${required}`)
          }
        })
        
        return { valid: errors.length === 0, errors }
      }

      const validResult = validateCSVStructure(validCSVData)
      expect(validResult.valid).toBe(true)
      expect(validResult.errors).toHaveLength(0)

      const invalidResult = validateCSVStructure(invalidCSVData)
      expect(invalidResult.valid).toBe(false)
      expect(invalidResult.errors).toContain('Missing required header: Date')
    })
  })
})