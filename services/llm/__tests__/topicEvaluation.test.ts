// services/llm/__tests__/topicEvaluation.test.ts

import { describe, it, expect } from '@jest/globals';

describe('topicEvaluation', () => {
  it('should export topic evaluation functions', () => {
    const topicEvalModule = require('../topicEvaluation');

    // Verify the module exports functions
    expect(topicEvalModule).toBeDefined();
    expect(typeof topicEvalModule.summarizeTopicContent).toBe('function');
    expect(typeof topicEvalModule.evaluateTopicContentQuality).toBe('function');
  });

  it('should have correct function signatures', () => {
    const { summarizeTopicContent, evaluateTopicContentQuality } = require('../topicEvaluation');

    // Test function accepts parameters
    expect(summarizeTopicContent.length).toBe(1);
    expect(evaluateTopicContentQuality.length).toBe(2);
  });
});
