// File: /services/logging/types.ts

import { TransportStream } from 'winston';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LoggingConfig {
  level: LogLevel;
  logFile: string;
  additionalTransports?: TransportStream[];
}

export interface LogMessage {
  level: LogLevel;
  message: string;
  meta: object;
}
