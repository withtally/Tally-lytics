import { CoingeckoProService } from '../services/marketCapTracking/coingeckoProService';
import { Logger } from '../services/logging';
import { apiConfig } from '../config/apiConfig';

const logger = new Logger({
  logFile: 'logs/coingecko-pro-test.log',
  level: 'info',
});

async function testCoingeckoProAPI() {
  if (!apiConfig.coingecko.proApiKey) {
    logger.error('No CoinGecko PRO API key found in configuration');
    process.exit(1);
  }

  const service = new CoingeckoProService();

  try {
    logger.info('Testing CoinGecko PRO API...');

    // Test 1: Get current price
    logger.info('Test 1: Fetching current price for Bitcoin...');
    const priceData = await service.getTokenPrice('bitcoin');
    logger.info('Price data:', priceData);

    // Test 2: Get market chart data for last 24 hours
    logger.info('Test 2: Fetching 24h market chart for Bitcoin...');
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const chartData = await service.getMarketChartRange('bitcoin', dayAgo, now);
    logger.info('Market chart data points:', {
      prices: chartData.prices.length,
      market_caps: chartData.market_caps.length,
      total_volumes: chartData.total_volumes.length,
    });

    // Test 3: Get detailed coin data
    logger.info('Test 3: Fetching detailed coin data for Bitcoin...');
    const coinData = await service.getCoinData('bitcoin');
    logger.info('Coin data received:', {
      name: coinData.name,
      symbol: coinData.symbol,
      market_cap_rank: coinData.market_cap_rank,
    });

    logger.info('All tests completed successfully!');
  } catch (error) {
    logger.error('Error during testing:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  testCoingeckoProAPI()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}
