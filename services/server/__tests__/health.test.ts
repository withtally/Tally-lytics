// services/server/__tests__/health.test.ts
import { describe, it, expect } from '@jest/globals';
import { healthRoutes } from '../health';

describe('Health Routes', () => {
  it('should export healthRoutes function', () => {
    expect(healthRoutes).toBeDefined();
    expect(typeof healthRoutes).toBe('function');
  });

  it('should accept app and crawler manager parameters', () => {
    // Function signature check
    expect(healthRoutes.length).toBeGreaterThanOrEqual(2);
  });

  it('should be a route configuration function', () => {
    // Mock objects to test the function can be called
    const mockApp = {
      get: () => {},
      post: () => {},
      use: () => {},
    };
    const mockCrawlerManager = {
      getAllStatuses: () => [],
    };

    // Should not throw when called with mocks
    expect(() => healthRoutes(mockApp as any, mockCrawlerManager as any)).not.toThrow();
  });
});
