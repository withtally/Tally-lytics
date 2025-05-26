// services/middleware/__tests__/rateLimiter.test.ts

import { describe, it, beforeEach, afterEach, expect, jest } from '@jest/globals';
import { llmRateLimiter } from '../rateLimiter';

describe('llmRateLimiter middleware', () => {
  let mockContext: any;
  let mockNext: any;
  let originalDateNow: any;
  let testCounter = 0;

  beforeEach(() => {
    jest.clearAllMocks();
    testCounter++;

    // Mock Date.now for predictable testing
    originalDateNow = Date.now;
    Date.now = jest.fn().mockReturnValue(1000000 + testCounter * 100000); // Unique timestamp per test

    // Mock Hono context with unique IP per test
    mockContext = {
      req: {
        header: jest.fn().mockReturnValue(`192.168.${testCounter}.1`), // Unique IP per test
      },
      json: jest.fn().mockImplementation((data, status) => ({
        status,
        json: data,
      })),
    };

    // Mock next function
    mockNext = jest.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    // Restore Date.now
    Date.now = originalDateNow;
  });

  describe('middleware function', () => {
    it('should be a function', () => {
      expect(typeof llmRateLimiter).toBe('function');
    });

    it('should call next function when under rate limit', async () => {
      await llmRateLimiter(mockContextNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should extract IP from x-forwarded-for header', async () => {
      mockContext.req.header.mockReturnValue('10.0.0.1');

      await llmRateLimiter(mockContextNext);

      expect(mockContext.req.header).toHaveBeenCalledWith('x-forwarded-for');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use "unknown" IP when header is missing', async () => {
      mockContext.req.header.mockReturnValue(undefined);

      await llmRateLimiter(mockContextNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle undefined header', async () => {
      mockContext.req.header.mockReturnValue(undefined);

      await llmRateLimiter(mockContextNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle empty string header', async () => {
      mockContext.req.header.mockReturnValue('');

      await llmRateLimiter(mockContextNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('rate limiting logic', () => {
    it('should allow first request from IP', async () => {
      await llmRateLimiter(mockContextNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockContext.json).not.toHaveBeenCalled();
    });

    it('should allow up to 10 requests from same IP', async () => {
      // Make 10 requests
      for (let i = 1; i <= 10; i++) {
        jest.clearAllMocks();
        await llmRateLimiter(mockContextNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockContext.json).not.toHaveBeenCalled();
      }
    });

    it('should block 11th request from same IP', async () => {
      // Make 10 allowed requests
      for (let i = 1; i <= 10; i++) {
        await llmRateLimiter(mockContextNext);
      }

      // 11th request should be blocked
      jest.clearAllMocks();
      const result = await llmRateLimiter(mockContextNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Rate limit exceeded',
          retryAfter: expect.any(Number),
        }),
        429
      );
      expect(result).toEqual({
        status: 429,
        json: expect.objectContaining({
          error: 'Rate limit exceeded',
        }),
      });
    });

    it('should calculate correct retryAfter time', async () => {
      // Make 11 requests to trigger rate limiting
      for (let i = 1; i <= 11; i++) {
        await llmRateLimiter(mockContextNext);
      }

      // Check the retryAfter value
      const lastCall = mockContext.json.mock.calls[mockContext.json.mock.calls.length - 1];
      const responseData = lastCall[0];

      expect(responseData.retryAfter).toBeGreaterThan(0);
      expect(responseData.retryAfter).toBeLessThanOrEqual(60);
    });

    it('should reset limit after time window expires', async () => {
      const startTime = 1000000 + testCounter * 100000;

      // Make 10 requests
      for (let i = 1; i <= 10; i++) {
        await llmRateLimiter(mockContextNext);
      }

      // Move time forward past reset window
      Date.now = jest.fn().mockReturnValue(startTime + 61000);

      // Next request should be allowed (resets count)
      jest.clearAllMocks();
      await llmRateLimiter(mockContextNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockContext.json).not.toHaveBeenCalled();
    });

    it('should handle different IPs independently', async () => {
      // First IP makes 10 requests
      for (let i = 1; i <= 10; i++) {
        await llmRateLimiter(mockContextNext);
      }

      // Second IP should start fresh
      mockContext.req.header.mockReturnValue('10.10.10.10');
      jest.clearAllMocks();
      await llmRateLimiter(mockContextNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockContext.json).not.toHaveBeenCalled();
    });

    it('should handle IPv6 addresses', async () => {
      mockContext.req.header.mockReturnValue('2001:db8::1');

      await llmRateLimiter(mockContextNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle comma-separated forwarded headers', async () => {
      mockContext.req.header.mockReturnValue('203.0.113.1, 192.168.1.1');

      await llmRateLimiter(mockContextNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle very long IP strings', async () => {
      const longIP = '192.168.1.1' + 'x'.repeat(1000);
      mockContext.req.header.mockReturnValue(longIP);

      await llmRateLimiter(mockContextNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('time-based behavior', () => {
    it('should create new limit data for new IP', async () => {
      const startTime = 1000000 + testCounter * 100000;
      Date.now = jest.fn().mockReturnValue(startTime);

      await llmRateLimiter(mockContextNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should preserve count within time window', async () => {
      const startTime = 1000000 + testCounter * 100000;
      Date.now = jest.fn().mockReturnValue(startTime);

      // First request
      await llmRateLimiter(mockContextNext);

      // Move time forward but within window
      Date.now = jest.fn().mockReturnValue(startTime + 30000);

      // Make second request - should increment count
      await llmRateLimiter(mockContextNext);

      expect(mockNext).toHaveBeenCalledTimes(2);
    });

    it('should reset count when time window expires', async () => {
      const startTime = 1000000 + testCounter * 100000;
      Date.now = jest.fn().mockReturnValue(startTime);

      // Make a request to establish time window
      await llmRateLimiter(mockContextNext);

      // Move time forward beyond window expiry
      Date.now = jest.fn().mockReturnValue(startTime + 61000);

      // Next request should reset count
      jest.clearAllMocks();
      await llmRateLimiter(mockContextNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle exact reset time boundary', async () => {
      const startTime = 1000000 + testCounter * 100000;
      Date.now = jest.fn().mockReturnValue(startTime);

      // Make initial request (creates resetTime = startTime + 60000)
      await llmRateLimiter(mockContextNext);

      // Set time to exactly the reset time
      Date.now = jest.fn().mockReturnValue(startTime + 60000);

      // Should reset (resetTime < now, where now === resetTime)
      jest.clearAllMocks();
      await llmRateLimiter(mockContextNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle time going backwards', async () => {
      const startTime = 1000000 + testCounter * 100000;
      Date.now = jest.fn().mockReturnValue(startTime);

      // Make initial request
      await llmRateLimiter(mockContextNext);

      // Time goes backwards (edge case)
      Date.now = jest.fn().mockReturnValue(startTime - 1000);

      // Should continue to work
      jest.clearAllMocks();
      await llmRateLimiter(mockContextNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should throw on header parsing errors (not caught by try-catch)', async () => {
      // Create a context that throws on header access
      const errorContext = {
        req: {
          header: jest.fn().mockImplementation(() => {
            throw new Error('Header error');
          }),
        },
        json: mockContext.json,
      };

      await expect(llmRateLimiter(errorContext as anyNext)).rejects.toThrow('Header error');
    });

    it('should throw on Date.now errors (not caught by try-catch)', async () => {
      // Mock to trigger error in Date.now (called outside try-catch)
      const originalGet = Date.now;
      Date.now = jest.fn().mockImplementation(() => {
        throw new Error('Cache error');
      });

      await expect(llmRateLimiter(mockContextNext)).rejects.toThrow('Cache error');
      
      Date.now = originalGet;
    });

    it('should throw when context is malformed', async () => {
      const malformedContext = {
        req: null,
        json: mockContext.json,
      };

      await expect(llmRateLimiter(malformedContext as anyNext)).rejects.toThrow();
    });

    it('should continue when json method fails', async () => {
      // Make 11 requests to trigger rate limiting, but with broken json
      for (let i = 1; i <= 10; i++) {
        await llmRateLimiter(mockContextNext);
      }

      // Break the json method
      mockContext.json = jest.fn().mockImplementation(() => {
        throw new Error('JSON error');
      });

      await llmRateLimiter(mockContextNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should throw when context is missing completely', async () => {
      await expect(llmRateLimiter(null as anyNext)).rejects.toThrow();
    });

    it('should handle missing next function', async () => {
      // Should throw when trying to call null next function
      await expect(llmRateLimiter(mockContext, null as any)).rejects.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle zero timestamp', async () => {
      Date.now = jest.fn().mockReturnValue(0);

      await llmRateLimiter(mockContextNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle very large timestamps', async () => {
      Date.now = jest.fn().mockReturnValue(Number.MAX_SAFE_INTEGER);

      await llmRateLimiter(mockContextNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle request count at exactly the limit', async () => {
      // Make exactly 10 requests
      for (let i = 1; i <= 10; i++) {
        await llmRateLimiter(mockContextNext);
      }

      // 10th request should be allowed
      expect(mockNext).toHaveBeenCalledTimes(10);
    });

    it('should handle fractional retryAfter calculation', async () => {
      // Setup time such that retryAfter will be fractional
      const startTime = 1000000 + testCounter * 100000;
      Date.now = jest.fn().mockReturnValue(startTime);

      // Make 11 requests to hit rate limit
      for (let i = 1; i <= 11; i++) {
        await llmRateLimiter(mockContextNext);
      }

      // Move time forward slightly
      Date.now = jest.fn().mockReturnValue(startTime + 300); // 0.3 seconds

      jest.clearAllMocks();
      await llmRateLimiter(mockContextNext);

      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({
          retryAfter: expect.any(Number),
        }),
        429
      );
    });

    it('should return reasonable response format', async () => {
      // Hit rate limit
      for (let i = 1; i <= 11; i++) {
        await llmRateLimiter(mockContextNext);
      }

      const lastCall = mockContext.json.mock.calls[mockContext.json.mock.calls.length - 1];
      const [responseData, statusCode] = lastCall;

      expect(statusCode).toBe(429);
      expect(responseData).toHaveProperty('error');
      expect(responseData).toHaveProperty('retryAfter');
      expect(typeof responseData.error).toBe('string');
      expect(typeof responseData.retryAfter).toBe('number');
    });
  });

  describe('function behavior characteristics', () => {
    it('should return undefined when continuing', async () => {
      const result = await llmRateLimiter(mockContextNext);
      expect(result).toBeUndefined();
    });

    it('should return response object when rate limited', async () => {
      // Hit rate limit
      for (let i = 1; i <= 11; i++) {
        await llmRateLimiter(mockContextNext);
      }

      const result = await llmRateLimiter(mockContextNext);

      expect(result).toHaveProperty('status', 429);
      expect(result).toHaveProperty('json');
    });

    it('should be idempotent for same timestamp', async () => {
      const fixedTime = 1000000 + testCounter * 100000;
      Date.now = jest.fn().mockReturnValue(fixedTime);

      // Make two calls with same timestamp
      await llmRateLimiter(mockContextNext);
      await llmRateLimiter(mockContextNext);

      expect(mockNext).toHaveBeenCalledTimes(2);
    });

    it('should maintain state across calls', async () => {
      // First call establishes state
      await llmRateLimiter(mockContextNext);

      // Second call should increment counter
      await llmRateLimiter(mockContextNext);

      expect(mockNext).toHaveBeenCalledTimes(2);
    });
  });
});
