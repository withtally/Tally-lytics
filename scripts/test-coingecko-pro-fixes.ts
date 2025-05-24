import { CoingeckoProService } from '../services/marketCapTracking/coingeckoProService';
import { Logger } from '../services/logging';

const logger = new Logger({
  logFile: 'logs/coingecko-pro-test-fixes.log',
  level: 'info',
});

async function testRateLimitHandling() {
  console.log('\n1. Testing rate limit handling...');
  const service = new CoingeckoProService();

  // Make multiple rapid requests to test rate limiting
  const requests = Array(10).fill(null);
  console.log('Making 10 rapid requests to test rate limiting...');

  const results = await Promise.allSettled(requests.map(() => service.getTokenPrice('bitcoin')));

  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  console.log('Rate limit test results:', {
    totalRequests: requests.length,
    successful,
    failed,
    failureRate: `${((failed / requests.length) * 100).toFixed(1)}%`,
  });

  // Log any failure reasons
  results
    .filter(r => r.status === 'rejected')
    .forEach((r, i) => {
      if (r.status === 'rejected') {
        console.log(`Failed request ${i + 1} reason:`, r.reason);
      }
    });
}

async function testErrorHandling() {
  console.log('\n2. Testing error handling...');
  const service = new CoingeckoProService();

  // Test invalid coin ID
  try {
    console.log('Testing invalid coin ID...');
    await service.getCoinData('non-existent-coin-id');
    console.log('❌ Error: Should have thrown an error for invalid coin ID');
  } catch (error: any) {
    console.log('✅ Successfully caught error for invalid coin ID:', {
      message: error.message,
      includes404: error.message.includes('404'),
    });
  }

  // Test malformed date parameters
  try {
    console.log('\nTesting invalid date parameters...');
    await service.getMarketChartRange('bitcoin', -1, -1);
    console.log('❌ Error: Should have thrown an error for invalid dates');
  } catch (error: any) {
    console.log('✅ Successfully caught error for invalid dates:', {
      message: error.message,
    });
  }
}

async function testDataConsistency() {
  console.log('\n3. Testing data consistency...');
  const service = new CoingeckoProService();

  // Get data for a known time range
  const endTime = Date.now();
  const startTime = endTime - 24 * 60 * 60 * 1000; // 24 hours ago

  console.log('Fetching 24 hours of Bitcoin data...');
  const data = await service.getMarketChartRange('bitcoin', startTime, endTime);

  // Verify data structure and consistency
  const hasAllDataPoints =
    data.prices.length > 0 && data.market_caps.length > 0 && data.total_volumes.length > 0;

  const allTimestampsValid = data.prices.every(
    ([timestamp]) => timestamp >= startTime && timestamp <= endTime
  );

  console.log('Data consistency check results:', {
    timeRange: {
      start: new Date(startTime).toISOString(),
      end: new Date(endTime).toISOString(),
    },
    dataPoints: {
      prices: data.prices.length,
      marketCaps: data.market_caps.length,
      volumes: data.total_volumes.length,
    },
    hasAllDataPoints,
    allTimestampsValid,
  });

  if (!hasAllDataPoints) {
    console.log('❌ Error: Missing some data points');
  } else if (!allTimestampsValid) {
    console.log('❌ Error: Some timestamps are outside the expected range');
  } else {
    console.log('✅ All data consistency checks passed');
  }
}

async function runAllTests() {
  try {
    console.log('Starting CoinGecko Pro API fixes verification...');

    // Test 1: Rate Limit Handling
    await testRateLimitHandling();

    // Test 2: Error Handling
    await testErrorHandling();

    // Test 3: Data Consistency
    await testDataConsistency();

    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  runAllTests()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}
