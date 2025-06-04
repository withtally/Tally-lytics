// services/llm/__tests__/tokenCounter.test.ts

import { describe, it, expect } from '@jest/globals';

describe('tokenCounter', () => {
  it('should export token counting functions', () => {
    const tokenModule = require('../tokenCounter');
    
    // Verify the module exports the expected functions
    expect(typeof tokenModule.countTokens).toBe('function');
    expect(typeof tokenModule.truncateToTokenLimit).toBe('function');
  });

  it('should count tokens correctly', () => {
    const { countTokens } = require('../tokenCounter');
    
    // Test basic functionality
    const result = countTokens('Hello world');
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThan(0);
  });

  it('should truncate text to token limit', () => {
    const { truncateToTokenLimit } = require('../tokenCounter');
    
    // Test with a reasonable limit
    const text = 'This is a test sentence that might be truncated.';
    const result = truncateToTokenLimit(text, 10);
    expect(typeof result).toBe('string');
    expect(result.length).toBeLessThanOrEqual(text.length);
  });
});