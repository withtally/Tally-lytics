// __tests__/setup/testUtils.ts - Utility functions for testing

import { faker } from '@faker-js/faker';

/**
 * Wait for a specified amount of time
 */
export const wait = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Generate a random forum name for testing
 */
export const randomForumName = (): string => {
  const forums = ['ARBITRUM', 'COMPOUND', 'UNISWAP', 'GITCOIN', 'ZKSYNC'];
  return faker.helpers.arrayElement(forums);
};

/**
 * Generate a random test UUID
 */
export const randomUUID = (): string => {
  return faker.string.uuid();
};

/**
 * Generate a random timestamp within the last year
 */
export const randomRecentDate = (): Date => {
  return faker.date.recent({ days: 365 });
};

/**
 * Generate random text content for testing
 */
export const randomContent = (length: 'short' | 'medium' | 'long' = 'medium'): string => {
  switch (length) {
    case 'short':
      return faker.lorem.sentence();
    case 'long':
      return faker.lorem.paragraphs(5);
    default:
      return faker.lorem.paragraphs(2);
  }
};

/**
 * Generate a random evaluation score between 0 and 1
 */
export const randomScore = (): number => {
  return Math.round((Math.random() * 100)) / 100;
};

/**
 * Generate random tags for testing
 */
export const randomTags = (count: number = 3): string[] => {
  const availableTags = [
    'governance', 'proposal', 'discussion', 'technical', 'community',
    'treasury', 'development', 'partnerships', 'marketing', 'security'
  ];
  
  return faker.helpers.arrayElements(availableTags, { min: 1, max: count });
};

/**
 * Generate a mock embedding vector
 */
export const mockEmbedding = (dimensions: number = 1536): number[] => {
  return Array.from({ length: dimensions }, () => Math.random() * 2 - 1);
};

/**
 * Clean up test data by removing special characters
 */
export const sanitizeTestString = (str: string): string => {
  return str.replace(/['"\\]/g, '');
};

/**
 * Create a mock error for testing error scenarios
 */
export const createMockError = (message: string, status?: number): Error => {
  const error = new Error(message);
  if (status) {
    (error as any).status = status;
    (error as any).statusCode = status;
  }
  return error;
};

/**
 * Mock environment variable for a test
 */
export const mockEnvVar = (key: string, value: string): void => {
  const originalValue = process.env[key];
  process.env[key] = value;
  
  // Cleanup function
  afterEach(() => {
    if (originalValue !== undefined) {
      process.env[key] = originalValue;
    } else {
      delete process.env[key];
    }
  });
};

/**
 * Suppress console output during test execution
 */
export const suppressConsole = (): void => {
  const originalConsole = global.console;
  
  beforeEach(() => {
    global.console = {
      ...originalConsole,
      log: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
  });
  
  afterEach(() => {
    global.console = originalConsole;
  });
};

/**
 * Create a test timeout that fails if not called within time limit
 */
export const createTestTimeout = (timeoutMs: number = 5000) => {
  let timeoutId: NodeJS.Timeout;
  
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Test timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  
  const clearTestTimeout = () => {
    clearTimeout(timeoutId);
  };
  
  return { timeoutPromise, clearTestTimeout };
};

/**
 * Assert that a function throws an error with specific message
 */
export const expectToThrow = async (
  fn: () => Promise<any> | any, 
  expectedMessage?: string
): Promise<Error> => {
  try {
    await fn();
    throw new Error('Expected function to throw an error, but it did not');
  } catch (error) {
    if (expectedMessage && !error.message.includes(expectedMessage)) {
      throw new Error(`Expected error message to contain "${expectedMessage}", but got: ${error.message}`);
    }
    return error as Error;
  }
};

/**
 * Deep clone an object for test mutations
 */
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Generate test data with partial overrides
 */
export const generateTestData = <T>(defaults: T, overrides: Partial<T> = {}): T => {
  return { ...defaults, ...overrides };
};