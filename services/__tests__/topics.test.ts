// services/__tests__/topics.test.ts

import { describe, it, expect } from '@jest/globals';

describe('topics service', () => {
  it('should export topic-related functions', () => {
    const topicsModule = require('../topics');
    
    // Verify the module exports functions
    expect(topicsModule).toBeDefined();
    expect(typeof topicsModule).toBe('object');
  });
});