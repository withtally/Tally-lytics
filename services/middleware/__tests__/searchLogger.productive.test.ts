// Productive test for searchLogger middleware - Core Functionality
import { describe, it, expect } from '@jest/globals';
import { searchLogger } from '../searchLogger';

describe('searchLogger Middleware (Productive)', () => {
  it('should be a middleware function with correct signature', () => {
    expect(typeof searchLogger).toBe('function');
    expect(searchLogger.length).toBe(2); // Should accept (context, next)
  });

  it('should handle middleware execution', async () => {
    // Create minimal mock context and next
    const mockContext = {
      req: {
        json: async () => ({ query: 'test', forum: 'arbitrum' }),
      },
      res: { status: 200 },
    } as any;

    let nextCalled = false;
    const mockNext = async () => {
      nextCalled = true;
    };

    // Test that middleware executes
    await searchLogger(mockContext, mockNext);

    // Verify next was called
    expect(nextCalled).toBe(true);
  });

  it('should handle malformed request data gracefully', async () => {
    const mockContext = {
      req: {
        json: async () => {
          throw new Error('Invalid JSON');
        },
      },
      res: { status: 200 },
    } as any;

    let nextCalled = false;
    const mockNext = async () => {
      nextCalled = true;
    };

    // Should handle errors gracefully
    await searchLogger(mockContext, mockNext);

    // Next should still be called even if logging fails
    expect(nextCalled).toBe(true);
  });
});
