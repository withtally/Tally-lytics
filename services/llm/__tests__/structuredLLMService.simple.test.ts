// Simple test for structuredLLMService without complex mocking
import { describe, test, expect } from '@jest/globals';

// Mock logging to prevent file creation issues
jest.mock('../../logging', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    warn: jest.fn(), 
    error: jest.fn(),
  })),
}));

// Mock LLM error handling
jest.mock('../../errorHandling/llmErrors', () => ({
  withLLMErrorHandling: jest.fn(async (operation: any) => await operation()),
}));

import { generateStructuredResponse } from '../structuredLLMService';

describe('structuredLLMService (Simple)', () => {
  describe('generateStructuredResponse', () => {
    test('should be a function', () => {
      expect(typeof generateStructuredResponse).toBe('function');
    });

    test('should return a string (basic signature test)', async () => {
      // This test uses real API to validate the basic service works
      const prompt = 'Return a simple JSON object with a "test" field set to true';
      
      const result = await generateStructuredResponse(prompt);
      
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});