// services/topics/__tests__/commonTopicsService.test.ts

import { describe, it, expect } from '@jest/globals';

describe('CommonTopicsService', () => {
  it('should export CommonTopicsService class', () => {
    const { CommonTopicsService } = require('../commonTopicsService');

    expect(CommonTopicsService).toBeDefined();
    expect(typeof CommonTopicsService).toBe('function');
  });

  it('should have required methods', () => {
    const { CommonTopicsService } = require('../commonTopicsService');

    // Test method names exist on prototype
    expect(typeof CommonTopicsService.prototype.getCommonTopics).toBe('function');
    expect(typeof CommonTopicsService.prototype.refreshCommonTopics).toBe('function');
  });
});
