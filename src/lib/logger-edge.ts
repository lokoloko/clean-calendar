/**
 * Edge-compatible logger
 * Uses only console methods that work in both Node.js and Edge runtime
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

class EdgeLogger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  
  private log(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    
    if (this.isDevelopment) {
      // In development, use colored console output
      const logFn = level === 'error' ? console.error : 
                    level === 'warn' ? console.warn : 
                    console.log;
      
      logFn(`[${timestamp}] [${level.toUpperCase()}] ${message}`, context || '');
    } else {
      // In production, output structured JSON
      console.log(JSON.stringify({
        timestamp,
        level,
        message,
        ...context
      }));
    }
  }

  debug(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      this.log('debug', message, context);
    }
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error | unknown, context?: LogContext) {
    const errorContext: LogContext = { ...context };
    
    if (error instanceof Error) {
      errorContext.error = {
        name: error.name,
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined
      };
    } else if (error) {
      errorContext.error = String(error);
    }
    
    this.log('error', message, errorContext);
  }

  // Helper for API route logging
  api(method: string, path: string, context?: LogContext) {
    this.info(`API ${method} ${path}`, context);
  }

  // Helper for database query logging
  db(operation: string, table: string, context?: LogContext) {
    this.debug(`DB ${operation} ${table}`, context);
  }

  // Create a child logger (for compatibility, just returns self)
  child(context: LogContext): EdgeLogger {
    // In a more complex implementation, this would create a new logger
    // with merged context. For now, we just return the same instance.
    return this;
  }
}

// Export singleton instance
export const logger = new EdgeLogger();