import { NextRequest, NextResponse } from 'next/server'
import { handleApiError, ApiResponses } from './api-errors'
import { logger } from './logger-edge'
import { z } from 'zod'

type ApiHandler = (
  req: NextRequest,
  context?: any
) => Promise<NextResponse> | NextResponse

interface WrapperOptions {
  requireAuth?: boolean
  logRequests?: boolean
}

/**
 * Wraps API route handlers with error handling, logging, and optional authentication
 */
export function withApiHandler(
  handler: ApiHandler,
  options: WrapperOptions = {}
) {
  const { logRequests = true } = options

  return async (req: NextRequest, context?: any) => {
    const startTime = Date.now()
    const route = req.nextUrl.pathname
    const method = req.method

    try {
      // Log incoming request
      if (logRequests) {
        logger.api(method, route, {
          headers: Object.fromEntries(req.headers.entries()),
          query: Object.fromEntries(req.nextUrl.searchParams.entries()),
        })
      }

      // Execute the handler
      const response = await handler(req, context)

      // Log successful response
      if (logRequests) {
        const duration = Date.now() - startTime
        logger.api(`${method} ${route} - ${response.status}`, route, {
          duration,
          status: response.status,
        })
      }

      return response
    } catch (error) {
      // Log error
      const duration = Date.now() - startTime
      logger.error(`API Error: ${method} ${route}`, error as Error, {
        duration,
        route,
        method,
      })

      // Return standardized error response
      return handleApiError(error, { route, method })
    }
  }
}

/**
 * Extract and validate request body with Zod schema
 */
export async function parseRequestBody<T>(
  req: NextRequest,
  schema?: z.ZodSchema<T>
): Promise<T> {
  try {
    const body = await req.json()
    
    if (schema) {
      const result = schema.safeParse(body)
      if (!result.success) {
        const issues = result.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
        throw ApiResponses.validationError('Invalid request data', issues)
      }
      return result.data
    }
    
    return body as T
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw ApiResponses.validationError('Invalid JSON in request body')
    }
    throw error
  }
}

/**
 * Validate query parameters with Zod schema
 */
export function parseQueryParams<T>(
  req: NextRequest,
  schema: z.ZodSchema<T>
): T {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries())
  
  const result = schema.safeParse(params)
  if (!result.success) {
    const issues = result.error.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message
    }))
    throw ApiResponses.validationError('Invalid query parameters', issues)
  }
  
  return result.data
}

/**
 * Helper to create consistent API responses
 */
export const createApiResponse = {
  success: <T>(data: T, status = 200) => 
    NextResponse.json({ success: true, data }, { status }),
    
  created: <T>(data: T) => 
    NextResponse.json({ success: true, data }, { status: 201 }),
    
  noContent: () => 
    new NextResponse(null, { status: 204 }),
    
  paginated: <T>(
    data: T[], 
    pagination: { page: number; limit: number; total: number }
  ) => {
    const totalPages = Math.ceil(pagination.total / pagination.limit)
    return NextResponse.json({
      success: true,
      data,
      pagination: {
        ...pagination,
        totalPages,
        hasMore: pagination.page < totalPages,
      }
    })
  }
}