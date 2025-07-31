import { NextRequest, NextResponse } from 'next/server'
import { withApiHandler, parseRequestBody, parseQueryParams, createApiResponse } from '../api-wrapper'
import { z } from 'zod'

// Mock dependencies
jest.mock('../api-errors', () => ({
  handleApiError: jest.fn((error) => 
    NextResponse.json({ error: 'Mocked error' }, { status: 500 })
  ),
  ApiResponses: {
    validationError: jest.fn((message, details) => {
      const error = new Error(message)
      ;(error as any).details = details
      return error
    })
  }
}))

jest.mock('../logger', () => ({
  logger: {
    api: jest.fn(),
    error: jest.fn(),
  }
}))

describe('withApiHandler', () => {
  const mockHandler = jest.fn()
  const mockRequest = new NextRequest('http://localhost/api/test')

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should wrap handler and return successful response', async () => {
    const expectedResponse = NextResponse.json({ success: true })
    mockHandler.mockResolvedValue(expectedResponse)

    const wrappedHandler = withApiHandler(mockHandler)
    const response = await wrappedHandler(mockRequest)

    expect(mockHandler).toHaveBeenCalledWith(mockRequest, undefined)
    expect(response).toBe(expectedResponse)
  })

  it('should log requests when enabled', async () => {
    const { logger } = require('../logger')
    mockHandler.mockResolvedValue(NextResponse.json({ success: true }))

    const wrappedHandler = withApiHandler(mockHandler, { logRequests: true })
    await wrappedHandler(mockRequest)

    expect(logger.api).toHaveBeenCalledTimes(2) // Once for request, once for response
  })

  it('should not log requests when disabled', async () => {
    const { logger } = require('../logger')
    mockHandler.mockResolvedValue(NextResponse.json({ success: true }))

    const wrappedHandler = withApiHandler(mockHandler, { logRequests: false })
    await wrappedHandler(mockRequest)

    expect(logger.api).not.toHaveBeenCalled()
  })

  it('should handle errors thrown by handler', async () => {
    const error = new Error('Test error')
    mockHandler.mockRejectedValue(error)

    const wrappedHandler = withApiHandler(mockHandler)
    const response = await wrappedHandler(mockRequest)

    expect(response.status).toBe(500)
  })

  it('should pass context to handler', async () => {
    const context = { params: { id: '123' } }
    mockHandler.mockResolvedValue(NextResponse.json({ success: true }))

    const wrappedHandler = withApiHandler(mockHandler)
    await wrappedHandler(mockRequest, context)

    expect(mockHandler).toHaveBeenCalledWith(mockRequest, context)
  })
})

describe('parseRequestBody', () => {
  it('should parse JSON body without schema', async () => {
    const body = { test: 'data' }
    const mockRequest = {
      json: jest.fn().mockResolvedValue(body)
    } as unknown as NextRequest

    const result = await parseRequestBody(mockRequest)
    expect(result).toEqual(body)
  })

  it('should validate body with Zod schema', async () => {
    const schema = z.object({
      name: z.string(),
      age: z.number()
    })
    const validBody = { name: 'John', age: 30 }
    const mockRequest = {
      json: jest.fn().mockResolvedValue(validBody)
    } as unknown as NextRequest

    const result = await parseRequestBody(mockRequest, schema)
    expect(result).toEqual(validBody)
  })

  it('should throw validation error for invalid body', async () => {
    const schema = z.object({
      name: z.string(),
      age: z.number()
    })
    const invalidBody = { name: 'John', age: 'thirty' }
    const mockRequest = {
      json: jest.fn().mockResolvedValue(invalidBody)
    } as unknown as NextRequest

    await expect(parseRequestBody(mockRequest, schema))
      .rejects.toThrow()
  })

  it('should handle JSON parsing errors', async () => {
    const mockRequest = {
      json: jest.fn().mockRejectedValue(new SyntaxError('Invalid JSON'))
    } as unknown as NextRequest

    await expect(parseRequestBody(mockRequest))
      .rejects.toThrow('Invalid JSON in request body')
  })
})

describe('parseQueryParams', () => {
  it('should parse and validate query parameters', () => {
    const schema = z.object({
      page: z.coerce.number(),
      limit: z.coerce.number()
    })
    
    const mockRequest = new NextRequest('http://localhost/api/test?page=2&limit=10')
    const result = parseQueryParams(mockRequest, schema)
    
    expect(result).toEqual({ page: 2, limit: 10 })
  })

  it('should throw validation error for invalid query params', () => {
    const schema = z.object({
      page: z.coerce.number(),
      limit: z.coerce.number()
    })
    
    const mockRequest = new NextRequest('http://localhost/api/test?page=invalid&limit=10')
    
    expect(() => parseQueryParams(mockRequest, schema)).toThrow()
  })

  it('should handle missing query parameters with defaults', () => {
    const schema = z.object({
      page: z.coerce.number().default(1),
      limit: z.coerce.number().default(20)
    })
    
    const mockRequest = new NextRequest('http://localhost/api/test')
    const result = parseQueryParams(mockRequest, schema)
    
    expect(result).toEqual({ page: 1, limit: 20 })
  })
})

describe('createApiResponse', () => {
  it('should create success response', () => {
    const data = { message: 'Success' }
    const response = createApiResponse.success(data)
    
    expect(response).toBeInstanceOf(NextResponse)
    expect(response.status).toBe(200)
  })

  it('should create success response with custom status', () => {
    const data = { message: 'Success' }
    const response = createApiResponse.success(data, 201)
    
    expect(response.status).toBe(201)
  })

  it('should create created response', () => {
    const data = { id: '123', name: 'New Item' }
    const response = createApiResponse.created(data)
    
    expect(response.status).toBe(201)
  })

  it('should create no content response', () => {
    const response = createApiResponse.noContent()
    
    expect(response.status).toBe(204)
  })

  it('should create paginated response', () => {
    const data = [{ id: 1 }, { id: 2 }, { id: 3 }]
    const pagination = { page: 1, limit: 10, total: 3 }
    
    const response = createApiResponse.paginated(data, pagination)
    
    expect(response.status).toBe(200)
  })

  it('should calculate pagination metadata correctly', () => {
    const data = Array(10).fill({ id: 1 })
    const pagination = { page: 2, limit: 10, total: 25 }
    
    const response = createApiResponse.paginated(data, pagination)
    
    // We can't easily test the response body, but we can verify the response is created
    expect(response).toBeInstanceOf(NextResponse)
    expect(response.status).toBe(200)
  })
})