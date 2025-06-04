// services/llm/__tests__/llmService.test.ts

import { describe, it, expect } from '@jest/globals';

describe('llmService', () => {
  it('should export LLM service functions', () => {
    const llmModule = require('../llmService');
    
    // Verify the module exports the expected functions
    expect(typeof llmModule.generateQuerySimile).toBe('function');
    expect(typeof llmModule.generateLLMChatResponse).toBe('function');
    expect(typeof llmModule.generateFollowUpQuestions).toBe('function');
    expect(typeof llmModule.generateCommonTopics).toBe('function');
  });

  it('should have correct function signatures', () => {
    const { generateQuerySimile, generateLLMChatResponse } = require('../llmService');
    
    // Test function parameter counts
    expect(generateQuerySimile.length).toBe(2);
    expect(generateLLMChatResponse.length).toBe(1);
  });
});