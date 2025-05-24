/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Test file locations
  roots: ['<rootDir>/services', '<rootDir>/db', '<rootDir>/utils', '<rootDir>/__tests__'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  
  // Setup files
  // setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'], // Temporarily disabled due to logger issues
  
  // Module resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@services/(.*)$': '<rootDir>/services/$1',
    '^@db/(.*)$': '<rootDir>/db/$1',
    '^@config/(.*)$': '<rootDir>/config/$1',
    '^@utils/(.*)$': '<rootDir>/utils/$1',
  },
  
  // TypeScript handling
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  
  // File extensions to consider
  moduleFileExtensions: ['ts', 'js', 'json'],
  
  // Coverage settings
  collectCoverageFrom: [
    'services/**/*.ts',
    'db/**/*.ts',
    'utils/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/__tests__/**',
    '!**/__mocks__/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  
  // Test timeout
  testTimeout: 10000,
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  
  // Verbose output for debugging
  verbose: false,
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/.next/',
    '/frontend/',
  ],
  
  // Environment variables for tests
  setupFiles: ['<rootDir>/jest.env.cjs'],
};