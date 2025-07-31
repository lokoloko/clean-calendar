import { NextResponse } from 'next/server'
import { logger } from './logger'

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const ErrorCodes = {
  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_FIELD: 'MISSING_FIELD',
  
  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',
  
  // Database errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  QUERY_FAILED: 'QUERY_FAILED',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  
  // External service errors
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  SYNC_FAILED: 'SYNC_FAILED',
  SMS_FAILED: 'SMS_FAILED',
  
  // Generic errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  RATE_LIMITED: 'RATE_LIMITED',
} as const

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes]

interface ErrorResponse {
  error: {
    message: string
    code: string
    details?: any
    timestamp: string
    requestId?: string
  }
}

export function handleApiError(error: unknown, context?: { route?: string; method?: string }): NextResponse<ErrorResponse> {
  // Generate request ID for tracking
  const requestId = crypto.randomUUID()
  
  // Log the error with context
  logger.error('API Error', error as Error, {
    ...context,
    requestId,
  })
  
  // Handle known ApiError instances
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: {
          message: error.message,
          code: error.code || ErrorCodes.INTERNAL_ERROR,
          details: error.details,
          timestamp: new Date().toISOString(),
          requestId,
        }
      },
      { status: error.statusCode }
    )
  }
  
  // Handle standard errors
  if (error instanceof Error) {
    // Check for specific error patterns
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json(
        {
          error: {
            message: 'Authentication required',
            code: ErrorCodes.UNAUTHORIZED,
            timestamp: new Date().toISOString(),
            requestId,
          }
        },
        { status: 401 }
      )
    }
    
    if (error.message.includes('duplicate key')) {
      return NextResponse.json(
        {
          error: {
            message: 'Resource already exists',
            code: ErrorCodes.ALREADY_EXISTS,
            timestamp: new Date().toISOString(),
            requestId,
          }
        },
        { status: 409 }
      )
    }
    
    // Default error response
    return NextResponse.json(
      {
        error: {
          message: process.env.NODE_ENV === 'production' 
            ? 'An error occurred processing your request' 
            : error.message,
          code: ErrorCodes.INTERNAL_ERROR,
          timestamp: new Date().toISOString(),
          requestId,
        }
      },
      { status: 500 }
    )
  }
  
  // Handle unknown errors
  return NextResponse.json(
    {
      error: {
        message: 'An unexpected error occurred',
        code: ErrorCodes.INTERNAL_ERROR,
        timestamp: new Date().toISOString(),
        requestId,
      }
    },
    { status: 500 }
  )
}

// Helper function for common error responses
export const ApiResponses = {
  unauthorized: (message = 'Authentication required') => 
    new ApiError(401, message, ErrorCodes.UNAUTHORIZED),
    
  forbidden: (message = 'Access denied') => 
    new ApiError(403, message, ErrorCodes.FORBIDDEN),
    
  notFound: (resource: string) => 
    new ApiError(404, `${resource} not found`, ErrorCodes.NOT_FOUND),
    
  validationError: (message: string, details?: any) => 
    new ApiError(400, message, ErrorCodes.VALIDATION_ERROR, details),
    
  conflict: (message: string) => 
    new ApiError(409, message, ErrorCodes.CONFLICT),
    
  internalError: (message = 'Internal server error') => 
    new ApiError(500, message, ErrorCodes.INTERNAL_ERROR),
    
  databaseError: (message = 'Database operation failed') => 
    new ApiError(500, message, ErrorCodes.DATABASE_ERROR),
}