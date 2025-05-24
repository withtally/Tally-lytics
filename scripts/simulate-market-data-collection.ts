import { CoingeckoProService } from '../services/marketCapTracking/coingeckoProService';
import { Logger } from '../services/logging';
import { forumConfigs } from '../config/forumConfig';

const logger = new Logger({
  logFile: 'logs/market-data-simulation.log',
  level: 'info',
});

async function simulateMarketDataCollection(forumName: string) {
  // Find forum config
  const forumConfig = forumConfigs.find(config => config.name === forumName);

  if (!forumConfig) {
    logger.error(`Forum ${forumName} not found in config`);
    process.exit(1);
  }

  if (!forumConfig.tokenConfig?.coingeckoId) {
    logger.error(`Forum ${forumName} does not have required CoinGecko configuration`);
    process.exit(1);
  }

  const { coingeckoId } = forumConfig.tokenConfig;
  const service = new CoingeckoProService();

  try {
    logger.info(`Simulating market data collection for ${forumName}...`);
    logger.info(`Using CoinGecko ID: ${coingeckoId}`);

    // Get current price snapshot
    logger.info('Fetching current price...');
    const priceData = await service.getTokenPrice(coingeckoId);
    logger.info('Current price data:', priceData);

    // Get last 24 hours of data
    logger.info('Fetching last 24 hours of market data...');
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const marketData = await service.getMarketChartRange(coingeckoId, dayAgo, now);

    // Analyze the data
    const dataPoints = marketData.prices.length;
    const timeIntervals =
      dataPoints > 1
        ? (marketData.prices[dataPoints - 1][0] - marketData.prices[0][0]) /
          (dataPoints - 1) /
          1000 /
          60
        : 0;

    logger.info('Market data analysis:', {
      totalDataPoints: dataPoints,
      averageMinutesBetweenDataPoints: Math.round(timeIntervals),
      priceRange: {
        start: marketData.prices[0]?.[1],
        end: marketData.prices[dataPoints - 1]?.[1],
      },
      marketCapRange: {
        start: marketData.market_caps[0]?.[1],
        end: marketData.market_caps[dataPoints - 1]?.[1],
      },
      volumeRange: {
        start: marketData.total_volumes[0]?.[1],
        end: marketData.total_volumes[dataPoints - 1]?.[1],
      },
    });

    // Test rate limiting by making several quick requests
    logger.info('Testing rate limiting with multiple quick requests...');
    const promises = Array(5)
      .fill(null)
      .map(() => service.getTokenPrice(coingeckoId));

    await Promise.all(promises);
    logger.info('Rate limit test completed successfully');

    logger.info('Simulation completed successfully!');
  } catch (error) {
    logger.error('Error during simulation:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  // Default to UNISWAP if no forum specified
  const forumName = process.argv[2] || 'UNISWAP';

  simulateMarketDataCollection(forumName)
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}
