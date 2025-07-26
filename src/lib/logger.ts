/**
 * Simple logging utility for production
 * In production, these logs can be sent to a service like Datadog, CloudWatch, etc.
 */

import { env } from './env'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  userId?: string
  requestId?: string
  action?: string
  metadata?: Record<string, any>
}

class Logger {
  private context: LogContext = {}

  private shouldLog(level: LogLevel): boolean {
    if (env.isProduction) {
      // In production, only log info and above
      return ['info', 'warn', 'error'].includes(level)
    }
    // In development, log everything
    return true
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const logContext = { ...this.context, ...context }
    
    if (env.isDevelopment) {
      // Pretty print for development
      return `[${timestamp}] ${level.toUpperCase()}: ${message}`
    }
    
    // JSON format for production (easier to parse)
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...logContext,
      environment: env.NODE_ENV,
    })
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    if (!this.shouldLog(level)) return

    const formattedMessage = this.formatMessage(level, message, context)

    switch (level) {
      case 'debug':
        console.debug(formattedMessage)
        break
      case 'info':
        console.info(formattedMessage)
        break
      case 'warn':
        console.warn(formattedMessage)
        break
      case 'error':
        console.error(formattedMessage)
        break
    }

    // In production, you would send to external service here
    if (env.isProduction && level === 'error') {
      // Example: Send to Sentry, Datadog, etc.
      // sendToErrorTracking(message, context)
    }
  }

  setContext(context: LogContext) {
    this.context = { ...this.context, ...context }
    return this
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context)
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context)
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context)
  }

  error(message: string, error?: Error | unknown, context?: LogContext) {
    const errorContext: LogContext = { ...context }
    
    if (error instanceof Error) {
      errorContext.metadata = {
        ...errorContext.metadata,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      }
    } else if (error) {
      errorContext.metadata = {
        ...errorContext.metadata,
        error: String(error)
      }
    }

    this.log('error', message, errorContext)
  }

  // Create a child logger with additional context
  child(context: LogContext): Logger {
    const childLogger = new Logger()
    childLogger.context = { ...this.context, ...context }
    return childLogger
  }
}

// Export singleton instance
export const logger = new Logger()

// Export factory for creating loggers with context
export function createLogger(context: LogContext): Logger {
  return new Logger().setContext(context)
}

// Middleware helper for API routes
export function withLogging(
  handler: (req: Request, context?: any) => Promise<Response>
) {
  return async (req: Request, context?: any) => {
    const requestId = crypto.randomUUID()
    const start = Date.now()
    const url = new URL(req.url)
    
    const requestLogger = createLogger({
      requestId,
      action: `${req.method} ${url.pathname}`,
    })

    requestLogger.info('Request started', {
      metadata: {
        method: req.method,
        path: url.pathname,
        query: Object.fromEntries(url.searchParams),
      }
    })

    try {
      const response = await handler(req, context)
      
      requestLogger.info('Request completed', {
        metadata: {
          duration: Date.now() - start,
          status: response.status,
        }
      })

      return response
    } catch (error) {
      requestLogger.error('Request failed', error, {
        metadata: {
          duration: Date.now() - start,
        }
      })
      throw error
    }
  }
}