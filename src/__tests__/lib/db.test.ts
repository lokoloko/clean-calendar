import { db } from '@/lib/db'
import { Pool } from 'pg'

// Mock the pg module
jest.mock('pg', () => {
  const mPool = {
    query: jest.fn(),
    end: jest.fn(),
  }
  return { Pool: jest.fn(() => mPool) }
})

describe('Database Functions', () => {
  let mockPool: any

  beforeEach(() => {
    jest.clearAllMocks()
    mockPool = new Pool()
  })

  describe('getListings', () => {
    it('should fetch listings for a user', async () => {
      const mockListings = [
        { id: '1', name: 'Beach House', ics_url: 'http://example.com' },
        { id: '2', name: 'Mountain Cabin', ics_url: null },
      ]

      mockPool.query.mockResolvedValueOnce({ rows: mockListings })

      const result = await db.getListings('user-123')

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM public.listings'),
        ['user-123']
      )
      expect(result).toEqual(mockListings)
    })

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'))

      await expect(db.getListings('user-123')).rejects.toThrow('Database error')
    })
  })

  describe('createListing', () => {
    it('should create a new listing', async () => {
      const newListing = {
        name: 'New Property',
        ics_url: 'http://example.com/cal.ics',
        cleaning_fee: 75,
        timezone: 'America/New_York',
        is_active_on_airbnb: true,
      }

      const mockCreatedListing = { id: 'new-id', ...newListing }
      mockPool.query.mockResolvedValueOnce({ rows: [mockCreatedListing] })

      const result = await db.createListing('user-123', newListing)

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO public.listings'),
        expect.arrayContaining([
          'user-123',
          newListing.name,
          newListing.ics_url,
          newListing.cleaning_fee,
          newListing.timezone,
          newListing.is_active_on_airbnb,
        ])
      )
      expect(result).toEqual(mockCreatedListing)
    })
  })

  describe('getCleaners', () => {
    it('should fetch cleaners for a user', async () => {
      const mockCleaners = [
        { id: '1', name: 'John', email: 'john@example.com', phone: '1234567890' },
        { id: '2', name: 'Jane', email: 'jane@example.com', phone: '0987654321' },
      ]

      mockPool.query.mockResolvedValueOnce({ rows: mockCleaners })

      const result = await db.getCleaners('user-123')

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM public.cleaners'),
        ['user-123']
      )
      expect(result).toEqual(mockCleaners)
    })
  })

  describe('getScheduleItems', () => {
    it('should fetch schedule items with optional history', async () => {
      const mockSchedule = [
        { id: '1', listing_id: 'list-1', check_out: '2024-01-01' },
        { id: '2', listing_id: 'list-2', check_out: '2024-01-02' },
      ]

      mockPool.query.mockResolvedValueOnce({ rows: mockSchedule })

      const result = await db.getScheduleItems('user-123', false)

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT s.*'),
        expect.any(Array)
      )
      expect(result).toEqual(mockSchedule)
    })

    it('should include history when requested', async () => {
      const mockSchedule = [{ id: '1', status: 'cancelled' }]
      mockPool.query.mockResolvedValueOnce({ rows: mockSchedule })

      await db.getScheduleItems('user-123', true)

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.not.stringContaining("AND s.status != 'cancelled'"),
        expect.any(Array)
      )
    })
  })
})