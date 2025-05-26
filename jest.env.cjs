// jest.env.js - Environment setup for tests
// This runs before jest.setup.ts

// Set test environment variables
process.env.NODE_ENV = 'test';

// Mock required environment variables
process.env.OPENAI_API_KEY =
  'test-key-sk-1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
process.env.OPENAI_ORG_ID = 'test-org-1234567890abcdef';

// Test database configuration
process.env.POSTGRES_HOST = 'localhost';
process.env.POSTGRES_PORT = '5432';
process.env.POSTGRES_DB = 'dao_helper_test';
process.env.POSTGRES_USER = 'test_user';
process.env.POSTGRES_PASSWORD = 'test_password';

// Optional API keys for testing
process.env.COINGECKO_PRO_API_KEY = 'test-coingecko-key';
process.env.TALLY_API = 'test-tally-key';
process.env.NEWS_API_KEY = 'test-news-key';
process.env.CRON_API_KEY = 'test-cron-key';

// Test-specific configurations
process.env.LLM_MODEL = 'gpt-3.5-turbo';
process.env.LLM_MINI_MODEL = 'gpt-3.5-turbo';
process.env.PORT = '3999';

// Disable external logging in tests
process.env.LOG_LEVEL = 'error';
