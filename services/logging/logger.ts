import winston from 'winston';
// Import chalk with fallback for testing environments
let chalk: any;

// Check if we're in a test environment
const isTestEnv =
  process.env.NODE_ENV === 'test' || typeof jest !== 'undefined' || typeof Bun !== 'undefined';

if (isTestEnv) {
  // Use fallback in test environments
  chalk = {
    gray: (str: string) => str,
    red: { bold: (str: string) => str },
    yellow: { bold: (str: string) => str },
    blue: { bold: (str: string) => str },
    green: { bold: (str: string) => str },
  };
} else {
  try {
    chalk = require('chalk');
  } catch {
    // Fallback if chalk import fails
    chalk = {
      gray: (str: string) => str,
      red: { bold: (str: string) => str },
      yellow: { bold: (str: string) => str },
      blue: { bold: (str: string) => str },
      green: { bold: (str: string) => str },
    };
  }
}
import { LoggingConfig, LogLevel, LogMessage } from './types';

class Logger {
  private logger: winston.Logger;
  private notifiers: ((message: LogMessage) => void)[] = [];

  constructor(config: LoggingConfig) {
    const consoleFormat = winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const coloredLevel = this.getColoredLevel(level);
      const coloredTimestamp = chalk.gray(timestamp);
      return `${coloredTimestamp} ${coloredLevel}: ${message} ${
        Object.keys(meta).length ? chalk.gray(JSON.stringify(meta)) : ''
      }`;
    });

    const fileFormat = winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message} ${
        Object.keys(meta).length ? JSON.stringify(meta) : ''
      }`;
    });

    this.logger = winston.createLogger({
      level: config.level,
      format: winston.format.timestamp(),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(winston.format.timestamp(), consoleFormat),
        }),
        new winston.transports.File({
          filename: config.logFile,
          format: winston.format.combine(winston.format.timestamp(), fileFormat),
        }),
      ],
    });

    if (config.additionalTransports) {
      config.additionalTransports.forEach((transport: any) => {
        this.logger.add(transport);
      });
    }
  }

  private getColoredLevel(level: string): string {
    switch (level.toLowerCase()) {
      case 'error':
        return chalk.red.bold(`[${level.toUpperCase()}]`);
      case 'warn':
        return chalk.yellow.bold(`[${level.toUpperCase()}]`);
      case 'info':
        return chalk.blue.bold(`[${level.toUpperCase()}]`);
      case 'debug':
        return chalk.green.bold(`[${level.toUpperCase()}]`);
      default:
        return chalk.white.bold(`[${level.toUpperCase()}]`);
    }
  }

  log(level: LogLevel, message: string, meta: object = {}): void {
    const logMessage: LogMessage = { level, message, meta };
    this.logger.log(level, message, meta);
    this.notifiers.forEach(notifier => notifier(logMessage));
  }

  info(message: string, meta: object = {}): void {
    this.log('info', message, meta);
  }

  warn(message: string, meta: object = {}): void {
    this.log('warn', message, meta);
  }

  error(message: string, meta: object = {}): void {
    this.log('error', message, meta);
  }

  debug(message: string, meta: object = {}): void {
    this.log('debug', message, meta);
  }

  addNotifier(notifier: (message: LogMessage) => void): void {
    this.notifiers.push(notifier);
  }
}

export default Logger;
