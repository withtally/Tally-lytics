// File: /services/logging/types.ts

import * as winston from 'winston';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LoggingConfig {
  level: LogLevel;
  logFile: string;
  additionalTransports?: winston.transport[];
}

export interface LogMessage {
  level: LogLevel;
  message: string;
  meta: object;
}
