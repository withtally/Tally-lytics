// db/repositories/__tests__/PostRepository.test.ts

import { describe, it, expect } from '@jest/globals';

describe('PostRepository', () => {
  it('should export PostRepository class', () => {
    const { PostRepository } = require('../PostRepository');

    expect(PostRepository).toBeDefined();
    expect(typeof PostRepository).toBe('function');
  });

  it('should implement IPostRepository interface methods', () => {
    const { PostRepository } = require('../PostRepository');

    // Verify repository methods exist
    const methods = [
      'find',
      'findById',
      'findUnevaluated',
      'findWithEvaluations',
      'create',
      'update',
      'delete',
      'markAsEvaluated',
      'getCountByForum',
      'getRecent',
    ];

    methods.forEach(method => {
      expect(typeof PostRepository.prototype[method]).toBe('function');
    });
  });
});
