// services/utils/__tests__/errorResponse.test.ts

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  createErrorResponse,
  createSuccessResponse,
  handleValidationError,
  ErrorCodes,
  StandardError,
  StandardSuccessResponse,
} from '../errorResponse';

// Mock crypto.randomUUID for consistent testing
const mockUUID = 'test-uuid-123';
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => mockUUID),
  },
  writable: true,
});

// Mock Date for consistent timestamps
const mockDate = '2023-12-01T10:00:00.000Z';

describe('errorResponse utilities', () => {
  let dateSpy: any;

  beforeEach(() => {
    // Reset the Date mock for each test
    dateSpy = jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate);
  });

  afterEach(() => {
    dateSpy?.mockRestore();
  });

  describe('createErrorResponse', () => {
    test('should create basic error response with required fields', () => {
      const result = createErrorResponse('Bad Request');

      expect(result).toEqual({
        error: 'Bad Request',
        code: undefined,
        details: undefined,
        timestamp: mockDate,
        errorId: mockUUID,
      });
    });

    test('should include code when provided', () => {
      const result = createErrorResponse('Validation failed', 'VALIDATION_ERROR');

      expect(result.code).toBe('VALIDATION_ERROR');
      expect(result.error).toBe('Validation failed');
    });

    test('should include details when provided', () => {
      const details = 'Email field is required';
      const result = createErrorResponse('Validation failed', 'VALIDATION_ERROR', details);

      expect(result.details).toBe(details);
    });

    test('should handle all parameters', () => {
      const result = createErrorResponse(
        'Server error',
        'INTERNAL_ERROR',
        'Database connection failed'
      );

      expect(result).toEqual({
        error: 'Server error',
        code: 'INTERNAL_ERROR',
        details: 'Database connection failed',
        timestamp: mockDate,
        errorId: mockUUID,
      });
    });

    test('should handle undefined code and details', () => {
      const result = createErrorResponse('Simple error');

      expect(result.code).toBeUndefined();
      expect(result.details).toBeUndefined();
      expect(result.error).toBe('Simple error');
    });
  });

  describe('createSuccessResponse', () => {
    test('should create basic success response', () => {
      const data = { id: 1, name: 'Test' };
      const result = createSuccessResponse(data);

      expect(result).toEqual({
        data: { id: 1, name: 'Test' },
        message: undefined,
        timestamp: mockDate,
      });
    });

    test('should include message when provided', () => {
      const data = { id: 1, name: 'Test' };
      const result = createSuccessResponse(data, 'Operation successful');

      expect(result.message).toBe('Operation successful');
      expect(result.data).toEqual(data);
    });

    test('should handle null data', () => {
      const result = createSuccessResponse(null);

      expect(result.data).toBeNull();
      expect(result.timestamp).toBe(mockDate);
    });

    test('should handle undefined data', () => {
      const result = createSuccessResponse(undefined);

      expect(result.data).toBeUndefined();
      expect(result.timestamp).toBe(mockDate);
    });

    test('should handle no parameters', () => {
      const result = createSuccessResponse();

      expect(result.data).toBeUndefined();
      expect(result.message).toBeUndefined();
      expect(result.timestamp).toBe(mockDate);
    });
  });

  describe('handleValidationError', () => {
    test('should handle error with code property', () => {
      const error = { code: 'CUSTOM_CODE', message: 'Custom error message' };
      const result = handleValidationError(error);

      expect(result.error).toBe('Custom error message');
      expect(result.code).toBe('CUSTOM_CODE');
    });

    test('should handle error without code property', () => {
      const error = { message: 'Validation failed' };
      const result = handleValidationError(error);

      expect(result.error).toBe('Invalid request parameters');
      expect(result.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(result.details).toBe('Validation failed');
    });

    test('should handle string error', () => {
      const error = 'Simple error string';
      const result = handleValidationError(error);

      expect(result.error).toBe('Invalid request parameters');
      expect(result.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(result.details).toBe('Simple error string');
    });

    test('should handle null error', () => {
      const result = handleValidationError(null);

      expect(result.error).toBe('Invalid request parameters');
      expect(result.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(result.details).toBeNull();
    });

    test('should handle undefined error', () => {
      const result = handleValidationError(undefined);

      expect(result.error).toBe('Invalid request parameters');
      expect(result.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(result.details).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    test('should handle empty string message', () => {
      const result = createErrorResponse('');

      expect(result.error).toBe('');
      expect(result.timestamp).toBe(mockDate);
      expect(result.errorId).toBe(mockUUID);
    });

    test('should handle very long error messages', () => {
      const longMessage = 'A'.repeat(1000);
      const result = createErrorResponse(longMessage);

      expect(result.error).toBe(longMessage);
    });

    test('should handle special characters in messages', () => {
      const specialMessage = 'Error with émojis 🚀 and symbols @#$%^&*()';
      const result = createErrorResponse(specialMessage);

      expect(result.error).toBe(specialMessage);
    });

    test('should handle complex object data in success response', () => {
      const complexData = {
        level1: {
          level2: {
            level3: ['value1', 'value2'],
            number: 42,
            boolean: true,
          },
        },
        array: [{ key: 'value' }, { key: 'value2' }],
      };

      const result = createSuccessResponse(complexData);

      expect(result.data).toEqual(complexData);
    });
  });

  describe('response consistency', () => {
    test('should always include required fields in error responses', () => {
      const result = createErrorResponse("I'm a teapot");

      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('errorId');
    });

    test('should always include required fields in success responses', () => {
      const result = createSuccessResponse({ test: true });

      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('data');
    });

    test('should use consistent timestamp format', () => {
      const errorResult = createErrorResponse('Error');
      const successResult = createSuccessResponse({ test: true });

      expect(errorResult.timestamp).toBe(mockDate);
      expect(successResult.timestamp).toBe(mockDate);
    });

    test('should use consistent errorId format', () => {
      const errorResult = createErrorResponse('Error');

      expect(errorResult.errorId).toBe(mockUUID);
    });
  });
});
