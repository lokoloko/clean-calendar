import { NextRequest } from 'next/server'
import { GET } from '../dashboard/metrics-v2/route'

// Mock dependencies
jest.mock('@/lib/auth-server', () => ({
  getCurrentUser: jest.fn()
}))

// Mock Supabase client
jest.mock('@/lib/supabase-server', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: { id: 'user-123' }, error: null })),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
      gt: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      then: (resolve: any) => resolve({ data: [], error: null })
    }))
  }))
}))

jest.mock('@/lib/logger-edge', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn()
  }
}))

import { getCurrentUser } from '@/lib/auth-server'

const mockedGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>

describe('Dashboard Metrics API Route', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 401 for unauthenticated requests', async () => {
    mockedGetCurrentUser.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/dashboard/metrics')
    const response = await GET(request)

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error.message).toBe('Authentication required')
  })

  it('should return 200 for authenticated requests', async () => {
    mockedGetCurrentUser.mockResolvedValue(mockUser)

    const request = new NextRequest('http://localhost/api/dashboard/metrics')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    
    // Should have the basic structure
    expect(data).toHaveProperty('profile')
    expect(data).toHaveProperty('listings')
    expect(data).toHaveProperty('cleaners')
    expect(data).toHaveProperty('schedule')
    expect(data).toHaveProperty('metrics')
  })
})