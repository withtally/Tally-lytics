// services/interfaces/ILogger.ts - Interface for logging

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: any;
}

/**
 * Interface for logging operations
 * This abstraction allows for easy mocking and testing
 */
export interface ILogger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

/**
 * Configuration interface for logger
 */
export interface LoggerConfig {
  level?: LogLevel;
  logFile?: string;
  enableConsole?: boolean;
  enableFile?: boolean;
  format?: 'json' | 'text';
}

/**
 * Factory function type for creating loggers
 */
export type LoggerFactory = (config: LoggerConfig) => ILogger;