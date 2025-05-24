// jest.setup.ts - Global test setup
import { pgVectorClient } from './db/pgvectorClient';

// Global test timeout
jest.setTimeout(30000);

// Mock timers for date-sensitive tests
const mockDate = new Date('2024-01-01T00:00:00.000Z');

// Setup before all tests
beforeAll(async () => {
  // Note: Database setup will be handled per test file
  // to avoid conflicts between parallel tests
  
  // Global mocks that should apply to all tests
  jest.useFakeTimers({ now: mockDate });
});

// Cleanup after all tests
afterAll(async () => {
  // Cleanup database connections
  try {
    await pgVectorClient.end();
  } catch (error) {
    console.warn('Error closing database connection:', error);
  }
  
  // Restore real timers
  jest.useRealTimers();
});

// Setup before each test
beforeEach(() => {
  // Clear all mocks between tests
  jest.clearAllMocks();
});

// Cleanup after each test
afterEach(() => {
  // Restore mocks
  jest.restoreAllMocks();
});

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidDate(): R;
      toBeValidUUID(): R;
    }
  }
}

// Custom Jest matchers
expect.extend({
  toBeValidDate(received: any) {
    const pass = received instanceof Date && !isNaN(received.getTime());
    return {
      message: () => `expected ${received} to be a valid Date`,
      pass,
    };
  },
  
  toBeValidUUID(received: any) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const pass = typeof received === 'string' && uuidRegex.test(received);
    return {
      message: () => `expected ${received} to be a valid UUID`,
      pass,
    };
  },
});

// Suppress console outputs during tests unless explicitly needed
const originalConsole = console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: originalConsole.error, // Keep errors visible
};