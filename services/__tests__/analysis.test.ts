// services/__tests__/analysis.test.ts

import { describe, it, expect } from '@jest/globals';

describe('analysis service', () => {
  it('should export analysis functions', () => {
    // Import the service to verify it exports the expected functions
    const analysisModule = require('../analysis');

    // Verify the module exports the expected functions
    expect(typeof analysisModule.topicNeedsReanalysis).toBe('function');
  });

  it('should handle topic analysis parameters', () => {
    const { topicNeedsReanalysis } = require('../analysis');

    // Test that the function accepts the expected parameters
    expect(topicNeedsReanalysis.length).toBe(2); // topicId and forumName
  });
});
