/**
 * Standardized error response utilities
 */

export interface StandardError {
  error: string;
  code?: string;
  details?: string;
  timestamp: string;
  errorId: string;
}

export interface StandardSuccessResponse<T = any> {
  data?: T;
  message?: string;
  timestamp: string;
}

/**
 * Creates a standardized error response
 */
export const createErrorResponse = (
  message: string,
  code?: string,
  details?: string
): StandardError => ({
  error: message,
  code,
  details,
  timestamp: new Date().toISOString(),
  errorId: crypto.randomUUID(),
});

/**
 * Creates a standardized success response
 */
export const createSuccessResponse = <T>(
  data?: T,
  message?: string
): StandardSuccessResponse<T> => ({
  data,
  message,
  timestamp: new Date().toISOString(),
});

/**
 * Common error codes and messages
 */
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
} as const;

/**
 * Helper to handle validation errors
 */
export const handleValidationError = (error: any): StandardError => {
  if (error && error.code) {
    return createErrorResponse(error.message, error.code);
  }
  return createErrorResponse(
    'Invalid request parameters',
    ErrorCodes.VALIDATION_ERROR,
    error && error.message ? error.message : error
  );
};
