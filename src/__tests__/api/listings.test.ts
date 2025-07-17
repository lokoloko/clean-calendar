import { GET, POST } from '@/app/api/listings/route'
import { db } from '@/lib/db'
import { NextRequest } from 'next/server'

// Mock the database module
jest.mock('@/lib/db')

describe('/api/listings', () => {
  const mockDb = db as jest.Mocked<typeof db>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return listings for authenticated user', async () => {
      const mockListings = [
        { id: '1', name: 'Beach House' },
        { id: '2', name: 'Mountain Cabin' },
      ]

      mockDb.getListings.mockResolvedValueOnce(mockListings)

      const request = new NextRequest('http://localhost:3000/api/listings')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockListings)
      expect(mockDb.getListings).toHaveBeenCalledWith('00000000-0000-0000-0000-000000000001')
    })

    it('should handle database errors', async () => {
      mockDb.getListings.mockRejectedValueOnce(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/listings')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Failed to fetch listings' })
    })
  })

  describe('POST', () => {
    it('should create a new listing', async () => {
      const newListing = {
        name: 'New Property',
        ics_url: 'http://example.com/cal.ics',
        cleaning_fee: 75,
        timezone: 'America/New_York',
        is_active_on_airbnb: true,
      }

      const mockCreatedListing = { id: 'new-id', ...newListing }
      mockDb.createListing.mockResolvedValueOnce(mockCreatedListing)

      const request = new NextRequest('http://localhost:3000/api/listings', {
        method: 'POST',
        body: JSON.stringify(newListing),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockCreatedListing)
      expect(mockDb.createListing).toHaveBeenCalledWith(
        '00000000-0000-0000-0000-000000000001',
        newListing
      )
    })

    it('should validate required fields', async () => {
      const invalidListing = {
        // missing name
        ics_url: 'http://example.com/cal.ics',
      }

      const request = new NextRequest('http://localhost:3000/api/listings', {
        method: 'POST',
        body: JSON.stringify(invalidListing),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Name is required' })
      expect(mockDb.createListing).not.toHaveBeenCalled()
    })
  })
})