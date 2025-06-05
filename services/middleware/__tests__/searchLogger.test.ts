// services/middleware/__tests__/searchLogger.test.ts

import { describe, it, expect } from '@jest/globals';
import { searchLogger } from '../searchLogger';

describe('searchLogger middleware', () => {
  it('should export searchLogger as a function', () => {
    expect(searchLogger).toBeDefined();
    expect(typeof searchLogger).toBe('function');
  });

  it('should be an async function that accepts context and next', () => {
    expect(searchLogger.length).toBe(2);
  });

  it('should return a promise when called', () => {
    const mockContext = {
      res: { status: 200 },
      req: {
        query: () => ({}),
        param: () => null,
        raw: { method: 'GET', url: 'test' },
      },
    };
    const mockNext = async () => {};

    const result = searchLogger(mockContext as any, mockNext);
    expect(result).toBeInstanceOf(Promise);
  });
});
