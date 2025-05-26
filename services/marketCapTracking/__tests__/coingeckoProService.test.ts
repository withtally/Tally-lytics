// services/marketCapTracking/__tests__/coingeckoProService.test.ts
import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';

// Mock dependencies
const mockLogger = {
  debug: mock(),
  info: mock(),
  warn: mock(),
  error: mock(),
};

mock.module('node-fetch', () => ({
  default: mock(),
}));

const MockLogger = mock(() => mockLogger);
mock.module('../../logging', () => ({
  default: MockLogger,
  Logger: MockLogger,
}));

mock.module('../../../config/apiConfig', () => ({
  apiConfig: {},
}));

import { CoingeckoProService } from '../coingeckoProService';
import fetch from 'node-fetch';

// Get the mocked fetch for use in tests
const mockedFetch = fetch as any;

describe.skip('CoingeckoProService', () => {
  let service: CoingeckoProService;
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
    process.env.COINGECKO_PRO_API_KEY = 'test-api-key';
    
    // Reset all mocks
    mockLogger.debug.mockClear();
    mockLogger.info.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.error.mockClear();
    mockedFetch.mockClear();
    
    service = new CoingeckoProService();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe.skip('constructor', () => {
    test('should initialize with API key from environment', () => {
      expect(service).toBeDefined();
    });

    test('should throw error if API key is missing', () => {
      delete process.env.COINGECKO_PRO_API_KEY;
      expect(() => new CoingeckoProService()).toThrow();
    });
  });

  describe.skip('getMarketData', () => {
    test('should fetch market data successfully', async () => {
      const mockResponse = {
        ok: true,
        json: mock(() => Promise.resolve({
          'ethereum': {
            usd: 2000,
            usd_market_cap: 240000000000,
            usd_24h_vol: 15000000000,
            usd_24h_change: 2.5
          }
        }))
      };
      
      mockedFetch.mockResolvedValue(mockResponse);

      const result = await service.getMarketData(['ethereum']);
      
      expect(result).toEqual({
        'ethereum': {
          usd: 2000,
          usd_market_cap: 240000000000,
          usd_24h_vol: 15000000000,
          usd_24h_change: 2.5
        }
      });
      
      expect(mockedFetch).toHaveBeenCalledWith(
        expect.stringContaining('api.coingecko.com'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-cg-pro-api-key': 'test-api-key'
          })
        })
      );
    });

    test('should handle API errors gracefully', async () => {
      mockedFetch.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests'
      });

      await expect(service.getMarketData(['ethereum'])).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    test('should handle network errors', async () => {
      mockedFetch.mockRejectedValue(new Error('Network error'));

      await expect(service.getMarketData(['ethereum'])).rejects.toThrow('Network error');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    test('should handle empty token list', async () => {
      const result = await service.getMarketData([]);
      expect(result).toEqual({});
      expect(mockedFetch).not.toHaveBeenCalled();
    });

    test('should batch large token lists', async () => {
      const tokens = Array.from({ length: 150 }, (_, i) => `token-${i}`);
      
      const mockResponse = {
        ok: true,
        json: mock(() => Promise.resolve({}))
      };
      
      mockedFetch.mockResolvedValue(mockResponse);

      await service.getMarketData(tokens);
      
      // Should make multiple API calls for large lists
      expect(mockedFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe.skip('rate limiting', () => {
    test('should respect rate limits', async () => {
      const mockResponse = {
        ok: true,
        json: mock(() => Promise.resolve({}))
      };
      
      mockedFetch.mockResolvedValue(mockResponse);

      // Make multiple rapid requests
      const promises = Array.from({ length: 5 }, () => 
        service.getMarketData(['ethereum'])
      );
      
      await Promise.all(promises);
      
      // Should have been called for each request
      expect(mockedFetch).toHaveBeenCalledTimes(5);
    });
  });

  describe.skip('data validation', () => {
    test('should validate response data structure', async () => {
      const invalidResponse = {
        ok: true,
        json: mock(() => Promise.resolve('invalid data'))
      };
      
      mockedFetch.mockResolvedValue(invalidResponse);

      await expect(service.getMarketData(['ethereum'])).rejects.toThrow();
    });

    test('should handle missing price data', async () => {
      const partialResponse = {
        ok: true,
        json: mock(() => Promise.resolve({
          'ethereum': {
            usd_market_cap: 240000000000
            // Missing price data
          }
        }))
      };
      
      mockedFetch.mockResolvedValue(partialResponse);

      const result = await service.getMarketData(['ethereum']);
      expect(result['ethereum']).toBeDefined();
      expect(result['ethereum'].usd_market_cap).toBe(240000000000);
    });
  });

  describe.skip('error recovery', () => {
    test('should retry on temporary failures', async () => {
      mockedFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable'
        })
        .mockResolvedValueOnce({
          ok: true,
          json: mock(() => Promise.resolve({ 'ethereum': { usd: 2000 } }))
        });

      const result = await service.getMarketData(['ethereum']);
      expect(result).toEqual({ 'ethereum': { usd: 2000 } });
      expect(mockedFetch).toHaveBeenCalledTimes(2);
    });

    test('should fail after max retries', async () => {
      mockedFetch.mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      });

      await expect(service.getMarketData(['ethereum'])).rejects.toThrow();
      // Should have retried multiple times
      expect(mockedFetch).toHaveBeenCalledTimes(3);
    });
  });
});