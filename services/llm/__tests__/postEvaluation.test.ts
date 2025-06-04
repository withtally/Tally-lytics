// services/llm/__tests__/postEvaluation.test.ts

import { describe, it, expect } from '@jest/globals';

describe('postEvaluation', () => {
  it('should export post evaluation functions', () => {
    const postEvalModule = require('../postEvaluation');
    
    // Verify the module exports functions
    expect(postEvalModule).toBeDefined();
    expect(typeof postEvalModule.evaluatePost).toBe('function');
    expect(typeof postEvalModule.evaluatePostsBatch).toBe('function');
  });

  it('should have correct function signatures', () => {
    const { evaluatePost, evaluatePostsBatch } = require('../postEvaluation');
    
    // Test function accepts parameters
    expect(evaluatePost.length).toBe(1);
    expect(evaluatePostsBatch.length).toBe(4);
  });
});