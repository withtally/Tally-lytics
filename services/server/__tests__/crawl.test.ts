// services/server/__tests__/crawl.test.ts
import { describe, it, expect } from '@jest/globals';
import { crawlRoutes } from '../crawl';

describe('Crawl Routes', () => {
  it('should export crawlRoutes function', () => {
    expect(crawlRoutes).toBeDefined();
    expect(typeof crawlRoutes).toBe('function');
  });

  it('should accept Hono app and crawler manager parameters', () => {
    // Function signature check
    expect(crawlRoutes.length).toBeGreaterThanOrEqual(2);
  });

  it('should be a route configuration function', () => {
    // Mock objects to test the function can be called
    const mockApp = {
      get: () => {},
      post: () => {},
      use: () => {}
    };
    const mockCrawlerManager = {};
    
    // Should not throw when called with mocks
    expect(() => crawlRoutes(mockApp as any, mockCrawlerManager as any)).not.toThrow();
  });
});