// services/server/__tests__/search.test.ts
import { describe, it, expect } from '@jest/globals';
import { searchRoutes } from '../search';

describe('Search Routes', () => {
  it('should export searchRoutes function', () => {
    expect(searchRoutes).toBeDefined();
    expect(typeof searchRoutes).toBe('function');
  });

  it('should accept app and search service parameters', () => {
    // Function signature check
    expect(searchRoutes.length).toBeGreaterThanOrEqual(2);
  });

  it('should be a route configuration function', () => {
    // Mock objects to test the function can be called
    const mockApp = {
      get: () => {},
      post: () => {},
      use: () => {}
    };
    const mockSearchService = {
      search: async () => []
    };
    
    // Should not throw when called with mocks
    expect(() => searchRoutes(mockApp as any, mockSearchService as any)).not.toThrow();
  });
});