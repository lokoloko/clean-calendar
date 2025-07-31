import { NextResponse } from 'next/server'
import { ApiError, ErrorCodes, handleApiError, ApiResponses } from '../api-errors'

// Mock logger to avoid console output in tests
jest.mock('../logger', () => ({
  logger: {
    error: jest.fn(),
  }
}))

// Ensure crypto.randomUUID is a jest mock
beforeAll(() => {
  if (!global.crypto.randomUUID || !jest.isMockFunction(global.crypto.randomUUID)) {
    global.crypto.randomUUID = jest.fn(() => 'test-request-id')
  }
})

describe('ApiError', () => {
  it('should create an error with all properties', () => {
    const error = new ApiError(400, 'Bad request', 'BAD_REQUEST', { field: 'test' })
    
    expect(error.statusCode).toBe(400)
    expect(error.message).toBe('Bad request')
    expect(error.code).toBe('BAD_REQUEST')
    expect(error.details).toEqual({ field: 'test' })
    expect(error.name).toBe('ApiError')
  })
})

describe('handleApiError', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should handle ApiError instances correctly', () => {
    const apiError = new ApiError(403, 'Forbidden', ErrorCodes.FORBIDDEN, { reason: 'test' })
    const response = handleApiError(apiError, { route: '/test', method: 'GET' })
    
    expect(response).toBeInstanceOf(NextResponse)
    expect(response.status).toBe(403)
  })

  it('should handle unauthorized errors', () => {
    const error = new Error('Unauthorized')
    const response = handleApiError(error)
    
    expect(response.status).toBe(401)
  })

  it('should handle duplicate key errors', () => {
    const error = new Error('duplicate key value violates unique constraint')
    const response = handleApiError(error)
    
    expect(response.status).toBe(409)
  })

  it('should handle generic errors in production', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    
    const error = new Error('Internal database error with sensitive info')
    const response = handleApiError(error)
    
    expect(response.status).toBe(500)
    
    process.env.NODE_ENV = originalEnv
  })

  it('should handle generic errors in development', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    
    const error = new Error('Internal database error')
    const response = handleApiError(error)
    
    expect(response.status).toBe(500)
    
    process.env.NODE_ENV = originalEnv
  })

  it('should handle unknown errors', () => {
    const response = handleApiError('string error')
    
    expect(response.status).toBe(500)
  })

  it('should include request ID in all responses', () => {
    const error = new Error('Test error')
    const response = handleApiError(error)
    
    expect(response.status).toBe(500)
    // Verify that randomUUID was called
    expect(crypto.randomUUID).toHaveBeenCalled()
  })
})

describe('ApiResponses', () => {
  it('should create unauthorized response', () => {
    const error = ApiResponses.unauthorized()
    expect(error.statusCode).toBe(401)
    expect(error.message).toBe('Authentication required')
    expect(error.code).toBe(ErrorCodes.UNAUTHORIZED)
  })

  it('should create unauthorized response with custom message', () => {
    const error = ApiResponses.unauthorized('Custom auth message')
    expect(error.statusCode).toBe(401)
    expect(error.message).toBe('Custom auth message')
  })

  it('should create forbidden response', () => {
    const error = ApiResponses.forbidden()
    expect(error.statusCode).toBe(403)
    expect(error.message).toBe('Access denied')
    expect(error.code).toBe(ErrorCodes.FORBIDDEN)
  })

  it('should create not found response', () => {
    const error = ApiResponses.notFound('User')
    expect(error.statusCode).toBe(404)
    expect(error.message).toBe('User not found')
    expect(error.code).toBe(ErrorCodes.NOT_FOUND)
  })

  it('should create validation error response', () => {
    const details = { field: 'email', reason: 'invalid format' }
    const error = ApiResponses.validationError('Invalid input', details)
    expect(error.statusCode).toBe(400)
    expect(error.message).toBe('Invalid input')
    expect(error.code).toBe(ErrorCodes.VALIDATION_ERROR)
    expect(error.details).toEqual(details)
  })

  it('should create conflict response', () => {
    const error = ApiResponses.conflict('Resource already exists')
    expect(error.statusCode).toBe(409)
    expect(error.message).toBe('Resource already exists')
    expect(error.code).toBe(ErrorCodes.CONFLICT)
  })

  it('should create internal error response', () => {
    const error = ApiResponses.internalError()
    expect(error.statusCode).toBe(500)
    expect(error.message).toBe('Internal server error')
    expect(error.code).toBe(ErrorCodes.INTERNAL_ERROR)
  })

  it('should create database error response', () => {
    const error = ApiResponses.databaseError()
    expect(error.statusCode).toBe(500)
    expect(error.message).toBe('Database operation failed')
    expect(error.code).toBe(ErrorCodes.DATABASE_ERROR)
  })
})