import { NextRequest } from 'next/server'
import { GET, POST } from '../cleaners/route'

// Mock dependencies
jest.mock('@/lib/auth-server', () => ({
  requireAuth: jest.fn()
}))

jest.mock('@/lib/db', () => ({
  db: {
    getCleaners: jest.fn(),
    createCleaner: jest.fn()
  }
}))

jest.mock('@/lib/subscription', () => ({
  canCreateCleaner: jest.fn()
}))

import { requireAuth } from '@/lib/auth-server'
import { db } from '@/lib/db'
import { canCreateCleaner } from '@/lib/subscription'

const mockedRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>
const mockedDb = db as jest.Mocked<typeof db>
const mockedCanCreateCleaner = canCreateCleaner as jest.MockedFunction<typeof canCreateCleaner>

describe('Cleaners API Route', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' }

  beforeEach(() => {
    jest.clearAllMocks()
    mockedRequireAuth.mockResolvedValue(mockUser)
  })

  describe('GET /api/cleaners', () => {
    it('should return cleaners for authenticated user', async () => {
      const mockCleaners = [
        { id: '1', name: 'John Doe', phone: '555-1234' },
        { id: '2', name: 'Jane Smith', email: 'jane@example.com' }
      ]
      mockedDb.getCleaners.mockResolvedValue(mockCleaners)

      const request = new NextRequest('http://localhost/api/cleaners')
      const response = await GET(request)

      expect(mockedRequireAuth).toHaveBeenCalled()
      expect(mockedDb.getCleaners).toHaveBeenCalledWith(mockUser.id)
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockCleaners)
    })

    it('should handle authentication failure', async () => {
      mockedRequireAuth.mockRejectedValue(new Error('Unauthorized'))

      const request = new NextRequest('http://localhost/api/cleaners')
      const response = await GET(request)

      expect(response.status).toBe(401) // Proper unauthorized response
    })
  })

  describe('POST /api/cleaners', () => {
    it('should create cleaner with valid data', async () => {
      mockedCanCreateCleaner.mockResolvedValue({ allowed: true })
      
      const newCleaner = { id: '3', name: 'New Cleaner', phone: '555-9999' }
      mockedDb.createCleaner.mockResolvedValue(newCleaner)

      // Create a mock request with proper JSON method
      const mockRequest = {
        url: 'http://localhost/api/cleaners',
        method: 'POST',
        headers: new Map(),
        nextUrl: new URL('http://localhost/api/cleaners'),
        json: jest.fn().mockResolvedValue({ name: 'New Cleaner', phone: '555-9999' })
      } as any

      const response = await POST(mockRequest)

      expect(mockedRequireAuth).toHaveBeenCalled()
      expect(mockedCanCreateCleaner).toHaveBeenCalledWith(mockUser.id)
      expect(mockedDb.createCleaner).toHaveBeenCalledWith(mockUser.id, 
        expect.objectContaining({
          name: 'New Cleaner',
          phone: '555-9999'
        })
      )
      expect(response.status).toBe(201)

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data).toEqual(newCleaner)
    })

    it('should reject when cleaner limit reached', async () => {
      mockedCanCreateCleaner.mockResolvedValue({
        allowed: false,
        reason: 'Cleaner limit reached',
        limit: 3,
        current: 3
      })

      const request = new NextRequest('http://localhost/api/cleaners', {
        method: 'POST',
        body: JSON.stringify({ name: 'New Cleaner' })
      })

      const response = await POST(request)

      expect(response.status).toBe(403) // Forbidden due to limit
      expect(mockedDb.createCleaner).not.toHaveBeenCalled()
    })

    it('should validate required fields', async () => {
      mockedCanCreateCleaner.mockResolvedValue({ allowed: true })

      const request = new NextRequest('http://localhost/api/cleaners', {
        method: 'POST',
        body: JSON.stringify({ phone: '555-1234' }) // Missing name
      })

      const response = await POST(request)

      expect(response.status).toBe(400) // Bad request - validation error
      expect(mockedDb.createCleaner).not.toHaveBeenCalled()
    })

    it('should trim whitespace from name', async () => {
      mockedCanCreateCleaner.mockResolvedValue({ allowed: true })
      
      const newCleaner = { id: '4', name: 'Trimmed Name', phone: '555-0000' }
      mockedDb.createCleaner.mockResolvedValue(newCleaner)

      const mockRequest = {
        url: 'http://localhost/api/cleaners',
        method: 'POST',
        headers: new Map(),
        nextUrl: new URL('http://localhost/api/cleaners'),
        json: jest.fn().mockResolvedValue({ name: '  Trimmed Name  ', phone: '555-0000' })
      } as any

      const response = await POST(mockRequest)

      expect(mockedDb.createCleaner).toHaveBeenCalledWith(mockUser.id, 
        expect.objectContaining({
          name: 'Trimmed Name',
          phone: '555-0000'
        })
      )
      expect(response.status).toBe(201)
    })

    it('should handle invalid JSON body', async () => {
      // Create a request that will fail JSON parsing
      const mockRequest = {
        url: 'http://localhost/api/cleaners',
        method: 'POST',
        headers: new Map(),
        nextUrl: new URL('http://localhost/api/cleaners'),
        json: jest.fn().mockRejectedValue(new SyntaxError('Invalid JSON'))
      } as any

      const response = await POST(mockRequest)

      expect(response.status).toBe(400) // Bad request - invalid JSON
      expect(mockedDb.createCleaner).not.toHaveBeenCalled()
    })
  })
})