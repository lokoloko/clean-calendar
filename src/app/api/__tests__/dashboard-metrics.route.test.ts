import { NextRequest } from 'next/server'
import { GET } from '../dashboard/metrics/route'
import { unstable_cache } from 'next/cache'

// Mock dependencies
jest.mock('@/lib/auth-server', () => ({
  getCurrentUser: jest.fn()
}))

jest.mock('@/lib/db', () => ({
  db: {
    transaction: jest.fn()
  }
}))

jest.mock('next/cache', () => ({
  unstable_cache: jest.fn()
}))

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn((message, error, context) => {
      console.log('Logger error:', message, error, context)
    }),
    debug: jest.fn()
  }
}))

import { getCurrentUser } from '@/lib/auth-server'
import { db } from '@/lib/db'

const mockedGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>
const mockedDb = db as jest.Mocked<typeof db>
const mockedUnstableCache = unstable_cache as jest.MockedFunction<typeof unstable_cache>

describe('Dashboard Metrics API Route', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' }
  
  const mockMetrics = {
    profile: { id: 'user-123', email: 'test@example.com', name: 'Test User' },
    listings: [
      { id: '1', name: 'Beach House', is_active_on_airbnb: true },
      { id: '2', name: 'Mountain Cabin', is_active_on_airbnb: false }
    ],
    cleaners: [
      { id: '1', name: 'John Doe', assignment_count: 2 },
      { id: '2', name: 'Jane Smith', assignment_count: 0 }
    ],
    schedule: [
      { id: '1', check_out: '2024-01-15', is_completed: true },
      { id: '2', check_out: '2024-01-20', is_completed: false }
    ],
    metrics: {
      totalListings: 2,
      activeListings: 1,
      totalCleaners: 2,
      activeCleaners: 1,
      totalCleanings: 2,
      completedCleanings: 1,
      todaysCleanings: 0,
      completionRate: 50
    },
    feedbackStats: {
      total_feedback: 10,
      clean_count: 7,
      normal_count: 2,
      dirty_count: 1,
      average_rating: 2.6
    },
    recentFeedback: [],
    upcomingCleanings: []
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock the cache function to return the fetcher directly
    mockedUnstableCache.mockImplementation((fetcher: any, keys: any, options: any) => {
      // Return the fetcher function directly for testing
      return fetcher
    })
  })

  it('should return metrics for authenticated user', async () => {
    mockedGetCurrentUser.mockResolvedValue(mockUser)
    
    // Mock the transaction to return our mock data
    mockedDb.transaction.mockImplementation(async (callback) => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [mockMetrics.profile] }) // Profile
          .mockResolvedValueOnce({ rows: mockMetrics.listings }) // Listings
          .mockResolvedValueOnce({ rows: mockMetrics.cleaners }) // Cleaners
          .mockResolvedValueOnce({ rows: mockMetrics.schedule }) // Schedule
          .mockResolvedValueOnce({ rows: [mockMetrics.feedbackStats] }) // Feedback stats
          .mockResolvedValueOnce({ rows: mockMetrics.recentFeedback }) // Recent feedback
          .mockResolvedValueOnce({ rows: mockMetrics.upcomingCleanings }) // Upcoming cleanings
      }
      try {
        return await callback(mockClient)
      } catch (error) {
        console.error('Transaction error:', error)
        throw error
      }
    })

    const request = new NextRequest('http://localhost/api/dashboard/metrics')
    const response = await GET(request)

    expect(mockedGetCurrentUser).toHaveBeenCalled()
    expect(response.status).toBe(200)
    
    const data = await response.json()
    expect(data.profile).toEqual(mockMetrics.profile)
    expect(data.listings).toEqual(mockMetrics.listings)
    expect(data.metrics.totalListings).toBe(2)
    expect(data.metrics.activeListings).toBe(1)
  })

  it('should return 401 for unauthenticated user', async () => {
    mockedGetCurrentUser.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/dashboard/metrics')
    const response = await GET(request)

    expect(response.status).toBe(401) // Unauthorized
    const data = await response.json()
    expect(data.error).toBeDefined()
  })

  it('should handle database errors gracefully', async () => {
    mockedGetCurrentUser.mockResolvedValue(mockUser)
    mockedDb.transaction.mockRejectedValue(new Error('Database connection failed'))

    const request = new NextRequest('http://localhost/api/dashboard/metrics')
    const response = await GET(request)

    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.error).toBeDefined()
  })

  it('should use caching mechanism', async () => {
    mockedGetCurrentUser.mockResolvedValue(mockUser)
    
    // Verify that unstable_cache is called with correct parameters
    const request = new NextRequest('http://localhost/api/dashboard/metrics')
    await GET(request)

    // Just verify it was called with correct number of arguments
    expect(mockedUnstableCache).toHaveBeenCalled()
    const [fetcher, keys, options] = mockedUnstableCache.mock.calls[0]
    expect(typeof fetcher).toBe('function')
    expect(keys).toEqual(['dashboard-metrics'])
    expect(options).toMatchObject({
      revalidate: 60,
      tags: ['dashboard-metrics']
    })
  })

  it('should calculate metrics correctly', async () => {
    mockedGetCurrentUser.mockResolvedValue(mockUser)
    
    const scheduleWithToday = [
      { id: '1', check_out: new Date().toISOString(), is_completed: false },
      { id: '2', check_out: '2024-01-20', is_completed: true, feedback_id: 'f1' },
      { id: '3', check_out: '2024-01-25', is_completed: false }
    ]

    mockedDb.transaction.mockImplementation(async (callback) => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [mockMetrics.profile] })
          .mockResolvedValueOnce({ rows: mockMetrics.listings })
          .mockResolvedValueOnce({ rows: mockMetrics.cleaners })
          .mockResolvedValueOnce({ rows: scheduleWithToday })
          .mockResolvedValueOnce({ rows: [mockMetrics.feedbackStats] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] })
      }
      return callback(mockClient)
    })

    const request = new NextRequest('http://localhost/api/dashboard/metrics')
    const response = await GET(request)
    
    const data = await response.json()
    
    // Check if we got an error response
    if (response.status !== 200) {
      console.error('Error response:', data)
    }
    
    expect(response.status).toBe(200)
    expect(data.metrics).toBeDefined()
    expect(data.metrics.todaysCleanings).toBe(1)
    expect(data.metrics.completedCleanings).toBe(1)
    expect(data.metrics.completionRate).toBe(33) // 1 out of 3
  })
})