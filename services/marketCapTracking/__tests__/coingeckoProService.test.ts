import { CoingeckoProService } from '../coingeckoProService';

describe('CoingeckoProService', () => {
  let service: CoingeckoProService;
  const apiKey = process.env.COINGECKO_PRO_API_KEY || '';

  beforeAll(() => {
    if (!apiKey) {
      console.warn('No CoinGecko PRO API key found in environment variables');
    }
    service = new CoingeckoProService(apiKey);
  });

  it('should fetch market chart data', async () => {
    if (!apiKey) {
      console.warn('Skipping test: No CoinGecko PRO API key available');
      return;
    }

    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;

    const data = await service.getMarketChartRange('bitcoin', dayAgo, now);

    expect(data).toBeDefined();
    expect(Array.isArray(data.prices)).toBe(true);
    expect(Array.isArray(data.market_caps)).toBe(true);
    expect(Array.isArray(data.total_volumes)).toBe(true);
  });

  it('should handle rate limits appropriately', async () => {
    if (!apiKey) {
      console.warn('Skipping test: No CoinGecko PRO API key available');
      return;
    }

    // Make multiple rapid requests to test rate limiting
    const promises = Array(5)
      .fill(null)
      .map(() => service.getTokenPrice('bitcoin'));

    const results = await Promise.all(promises);

    // All requests should complete successfully
    results.forEach(result => {
      expect(result).toBeDefined();
      expect(result.bitcoin).toBeDefined();
      expect(result.bitcoin.usd).toBeDefined();
    });
  });

  it('should handle authentication errors', async () => {
    const invalidService = new CoingeckoProService('invalid-key');

    await expect(invalidService.getTokenPrice('bitcoin')).rejects.toThrow(/401/);
  });
});
