// db/repositories/__tests__/TopicRepository.test.ts

import { describe, it, expect } from '@jest/globals';

describe('TopicRepository', () => {
  it('should export TopicRepository class', () => {
    const { TopicRepository } = require('../TopicRepository');
    
    expect(TopicRepository).toBeDefined();
    expect(typeof TopicRepository).toBe('function');
  });

  it('should implement ITopicRepository interface methods', () => {
    const { TopicRepository } = require('../TopicRepository');
    
    // Verify repository methods exist
    const methods = [
      'find',
      'findById',
      'findWithPosts',
      'findNeedingSummary',
      'create',
      'update',
      'updateSummary',
      'delete',
      'getCountByForum',
      'getRecent'
    ];
    
    methods.forEach(method => {
      expect(typeof TopicRepository.prototype[method]).toBe('function');
    });
  });
});