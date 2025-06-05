// services/server/__tests__/commonTopics.test.ts
import { describe, it, expect } from '@jest/globals';
import { commonTopicsRoutes } from '../commonTopicsRoutes';

describe('Common Topics Routes', () => {
  it('should export commonTopicsRoutes', () => {
    expect(commonTopicsRoutes).toBeDefined();
    expect(commonTopicsRoutes).toBeTruthy();
  });

  it('should be a Hono instance with routes', () => {
    // Check that it has router properties
    expect(commonTopicsRoutes).toHaveProperty('router');
    expect(commonTopicsRoutes).toHaveProperty('routes');
  });

  it('should have common HTTP methods', () => {
    // Verify it has typical Hono router methods
    expect(typeof commonTopicsRoutes.get).toBe('function');
    expect(typeof commonTopicsRoutes.post).toBe('function');
    expect(typeof commonTopicsRoutes.use).toBe('function');
  });
});
