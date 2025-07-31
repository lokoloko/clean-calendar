/**
 * Simple structured logging wrapper
 * In production, this could be replaced with Winston, Pino, or other logging libraries
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private baseContext: LogContext = {};
  
  constructor(baseContext?: LogContext) {
    if (baseContext) {
      this.baseContext = baseContext;
    }
  }
  
  private log(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...this.baseContext,
      ...context
    };

    if (this.isDevelopment) {
      // In development, use console with colors
      const color = {
        debug: '\x1b[36m', // cyan
        info: '\x1b[32m',  // green
        warn: '\x1b[33m',  // yellow
        error: '\x1b[31m'  // red
      }[level];
      const reset = '\x1b[0m';
      
      console.log(`${color}[${level.toUpperCase()}]${reset} ${message}`, context || '');
    } else {
      // In production, output structured JSON
      console.log(JSON.stringify(logEntry));
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
        stack: error.stack
      };
    } else if (error) {
      errorContext.error = error;
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

  // Create a child logger with additional context
  child(context: LogContext): Logger {
    return new Logger({ ...this.baseContext, ...context });
  }
}

// Export singleton instance
export const logger = new Logger();