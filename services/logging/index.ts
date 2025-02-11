// File: /services/logging/index.ts

export { default as Logger } from './logger';
export * from './types';
export * from './notifiers';

// Usage example:
// import { Logger, consoleNotifier, smsNotifier } from './services/logging';

// const logger = new Logger({
//   level: 'info',
//   logFile: 'application.log',
// });

// logger.addNotifier(consoleNotifier);
// logger.addNotifier(smsNotifier('+1234567890'));

// logger.info('Application started', { version: '1.0.0' });
