// Productive test for searchLogger middleware - Core Functionality
import { describe, it, expect, jest } from '@jest/globals';

// Mock database to prevent import issues
jest.mock('../../../db/db', () => ({
  db: jest.fn(() => ({
    insert: jest.fn(() => ({
      into: jest.fn(() => ({
        values: jest.fn(() => Promise.resolve())
      }))
    }))
  }))
}));

import { searchLogger } from '../searchLogger';

describe('searchLogger Middleware (Productive)', () => {
  it('should be a middleware function with correct signature', () => {
    expect(typeof searchLogger).toBe('function');
    expect(searchLogger.length).toBe(2); // Should accept (context, next)
  });

  it('should handle middleware execution without crashing', async () => {
    // Create minimal mock context and next
    const mockContext = {
      req: {
        json: jest.fn(() => Promise.resolve({ query: 'test', forum: 'arbitrum' }))
      },
      res: { status: 200 }
    } as any;
    
    const mockNext = jest.fn(() => Promise.resolve());

    // Test that middleware executes without throwing
    await expect(searchLogger(mockContext, mockNext)).resolves.not.toThrow();
    
    // Verify next was called (core middleware behavior)
    expect(mockNext).toHaveBeenCalled();
  });

  it('should handle malformed request data gracefully', async () => {
    const mockContext = {
      req: {
        json: jest.fn(() => Promise.reject(new Error('Invalid JSON')))
      },
      res: { status: 200 }
    } as any;
    
    const mockNext = jest.fn(() => Promise.resolve());

    // Should handle errors gracefully, not crash the application
    await expect(searchLogger(mockContext, mockNext)).resolves.not.toThrow();
    
    // Next should still be called even if logging fails
    expect(mockNext).toHaveBeenCalled();
  });
});