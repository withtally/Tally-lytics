// services/errorHandling/globalErrorHandler.ts
// A centralized error handling utility to standardize error logs and responses.

import { Logger } from '../logging';

const logger = new Logger({
  level: 'info',
  logFile: 'logs/global-error-handler.log',
});

/**
 * Handle errors gracefully.
 * @param error - the thrown error
 * @param context - optional context (e.g., 'Crawling forumName', 'fetching proposals')
 */
export function handleGlobalError(error: any, context: string = 'Unknown context'): void {
  const message = error instanceof Error ? error.message : 'Unknown error';
  logger.error(`Error in ${context}: ${message}`, {
    stack: error instanceof Error ? error.stack : undefined,
  });
}
