// File: /services/tally/logger.ts
import winston from 'winston';
import { LogConfig } from './types';

export class Logger {
  private logger: winston.Logger;

  constructor(config: LogConfig) {
    this.logger = winston.createLogger({
      level: config.level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [${level.toUpperCase()}]: ${message}`;
        })
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'tally-crawler.log' }),
      ],
    });
  }

  info(message: string): void {
    this.logger.info(message);
  }

  error(message: string): void {
    this.logger.error(message);
  }
}
