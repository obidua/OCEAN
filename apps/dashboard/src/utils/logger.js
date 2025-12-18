/**
 * Production Logger Utility
 * Provides conditional logging based on environment
 */

const isProduction = import.meta.env.PROD || import.meta.env.MODE === 'production';
const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';

/**
 * Logger class for environment-aware logging
 */
class Logger {
  constructor(context = '') {
    this.context = context;
  }

  /**
   * Debug logs - only in development
   */
  debug(...args) {
    if (isDevelopment) {
      console.log(`[DEBUG]${this.context ? ` [${this.context}]` : ''}`, ...args);
    }
  }

  /**
   * Info logs - all environments
   */
  info(...args) {
    console.info(`[INFO]${this.context ? ` [${this.context}]` : ''}`, ...args);
  }

  /**
   * Warning logs - all environments
   */
  warn(...args) {
    console.warn(`[WARN]${this.context ? ` [${this.context}]` : ''}`, ...args);
  }

  /**
   * Error logs - all environments
   */
  error(...args) {
    console.error(`[ERROR]${this.context ? ` [${this.context}]` : ''}`, ...args);
    
    // TODO: Send to error tracking service (Sentry, etc.) in production
    if (isProduction) {
      // Example: Sentry.captureException(args[0]);
    }
  }

  /**
   * Table logs - only in development
   */
  table(data) {
    if (isDevelopment) {
      console.table(data);
    }
  }

  /**
   * Group logs - only in development
   */
  group(label) {
    if (isDevelopment) {
      console.group(label);
    }
  }

  groupEnd() {
    if (isDevelopment) {
      console.groupEnd();
    }
  }
}

// Create default logger
const logger = new Logger();

// Export factory for creating contextual loggers
export const createLogger = (context) => new Logger(context);

export default logger;

// Export environment checks
export { isProduction, isDevelopment };
