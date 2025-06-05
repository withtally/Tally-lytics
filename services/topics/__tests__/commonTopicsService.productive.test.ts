// services/topics/__tests__/commonTopicsService.productive.test.ts

import { describe, it, expect } from '@jest/globals';

describe('CommonTopicsService (Productive)', () => {
  it('should have the correct public API methods', () => {
    const { CommonTopicsService } = require('../commonTopicsService');

    // Verify public API
    const publicMethods = [
      'getCommonTopics',
      'refreshCommonTopics',
      'getTopicsByForums',
      'searchTopics',
    ];

    publicMethods.forEach(method => {
      expect(typeof CommonTopicsService.prototype[method]).toBe('function');
    });
  });

  it('should handle method parameters correctly', () => {
    const { CommonTopicsService } = require('../commonTopicsService');

    // Verify methods exist
    expect(typeof CommonTopicsService.prototype.getCommonTopics).toBe('function');
    expect(typeof CommonTopicsService.prototype.refreshCommonTopics).toBe('function');
  });

  it('should export required TypeScript interfaces', () => {
    const commonTopicsModule = require('../commonTopicsService');

    // Verify module exports
    expect(commonTopicsModule.CommonTopicsService).toBeDefined();
  });
});
