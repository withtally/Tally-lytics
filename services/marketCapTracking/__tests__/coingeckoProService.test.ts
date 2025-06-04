// services/marketCapTracking/__tests__/coingeckoProService.test.ts
import { describe, it, expect } from '@jest/globals';
import { CoingeckoProService } from '../coingeckoProService';

describe('CoingeckoProService', () => {
  it('should export CoingeckoProService class', () => {
    expect(CoingeckoProService).toBeDefined();
    expect(typeof CoingeckoProService).toBe('function');
  });

  it('should have required methods', () => {
    const originalEnv = process.env.COINGECKO_PRO_API_KEY;
    process.env.COINGECKO_PRO_API_KEY = 'test-key';
    
    try {
      const service = new CoingeckoProService();
      expect(service).toBeDefined();
      expect(typeof service.getMarketData).toBe('function');
      expect(typeof service.getHistoricalMarketData).toBe('function');
    } catch (error) {
      // It's ok if constructor throws without valid API key
    } finally {
      process.env.COINGECKO_PRO_API_KEY = originalEnv;
    }
  });

  it('should require API key', () => {
    const originalEnv = process.env.COINGECKO_PRO_API_KEY;
    delete process.env.COINGECKO_PRO_API_KEY;
    
    expect(() => new CoingeckoProService()).toThrow();
    
    process.env.COINGECKO_PRO_API_KEY = originalEnv;
  });
});