/**
 * Input validation utility for API parameters
 */

export interface ValidationError extends Error {
  code: string;
}

const createValidationError = (message: string, code: string): ValidationError => {
  const error = new Error(message) as ValidationError;
  error.code = code;
  return error;
};

/**
 * Validates and sanitizes API parameters
 */
export const validateParam = (
  param: string | undefined,
  type: 'string' | 'number' | 'forum'
): string | number => {
  if (!param || typeof param !== 'string') {
    throw createValidationError('Parameter is required', 'MISSING_PARAMETER');
  }

  // Basic length check to prevent DoS
  if (param.length > 100) {
    throw createValidationError('Parameter too long', 'PARAMETER_TOO_LONG');
  }

  const trimmed = param.trim();

  if (type === 'number') {
    const num = parseInt(trimmed, 10);
    if (isNaN(num) || num < 0) {
      throw createValidationError('Invalid numeric parameter', 'INVALID_NUMBER');
    }
    return num;
  }

  if (type === 'forum') {
    // Allow alphanumeric, hyphens, and underscores only
    if (!/^[a-zA-Z0-9\-_]+$/.test(trimmed)) {
      throw createValidationError('Invalid forum name format', 'INVALID_FORUM_NAME');
    }
  }

  // General string validation - no control characters
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f]/.test(trimmed)) {
    throw createValidationError('Invalid characters in parameter', 'INVALID_CHARACTERS');
  }

  return trimmed;
};

/**
 * Validates query parameters that can be comma-separated lists
 */
export const validateQueryArray = (
  param: string | undefined,
  maxItems = 10
): string[] | undefined => {
  if (!param) {
    return undefined;
  }

  const items = param
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

  if (items.length > maxItems) {
    throw createValidationError(`Too many items in list (max: ${maxItems})`, 'TOO_MANY_ITEMS');
  }

  // Validate each item
  items.forEach(item => validateParam(item, 'forum'));

  return items;
};
