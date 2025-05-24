import { forumConfigs } from '../../config/forumConfig';
import { apiConfig } from '../../config/apiConfig';
import db from '../../db/db';
import { Logger } from '../logging';
import { loggerConfig } from '../../config/loggerConfig';
import { CoingeckoProService } from './coingeckoProService';

const logger = new Logger({
  ...loggerConfig,
  logFile: 'logs/token-market-data-crawler.log',
});

// Convert UNIX ms to YYYY-MM-DD string
function timestampToDateString(timestampMs: number): string {
  const date = new Date(timestampMs);
  return date.toISOString().split('T')[0];
}

// Insert data for a single day
async function insertDayData(
  forumName: string,
  coingeckoId: string,
  data: {
    prices?: [number, number][];
    market_caps?: [number, number][];
    total_volumes?: [number, number][];
  },
  day: Date
) {
  if (
    !data ||
    !Array.isArray(data.prices) ||
    !Array.isArray(data.market_caps) ||
    !Array.isArray(data.total_volumes)
  ) {
    logger.warn(
      `No valid data returned for ${forumName}/${coingeckoId} on ${day.toISOString().split('T')[0]}.`
    );
    return;
  }

  const priceArr = data.prices || [];
  const marketCapArr = data.market_caps || [];
  const volumeArr = data.total_volumes || [];

  const priceMap: Record<number, number> = {};
  priceArr.forEach(([ts, price]) => {
    priceMap[ts] = price;
  });

  const marketCapMap: Record<number, number> = {};
  marketCapArr.forEach(([ts, mc]) => {
    marketCapMap[ts] = mc;
  });

  const volumeMap: Record<number, number> = {};
  volumeArr.forEach(([ts, vol]) => {
    volumeMap[ts] = vol;
  });

  const allTimestamps = new Set([
    ...priceArr.map(p => p[0]),
    ...marketCapArr.map(m => m[0]),
    ...volumeArr.map(v => v[0]),
  ]);

  if (allTimestamps.size === 0) {
    logger.info(
      `No data points to insert for ${forumName}/${coingeckoId} on ${day.toISOString().split('T')[0]}.`
    );
    return;
  }

  const records = Array.from(allTimestamps).map(ts => ({
    forum_name: forumName,
    coingecko_id: coingeckoId,
    timestamp: ts,
    date: timestampToDateString(ts),
    price: priceMap[ts] !== undefined ? priceMap[ts] : null,
    market_cap: marketCapMap[ts] !== undefined ? marketCapMap[ts] : null,
    volume: volumeMap[ts] !== undefined ? volumeMap[ts] : null,
  }));

  await db.transaction(async trx => {
    for (const record of records) {
      await trx('token_market_data')
        .insert(record)
        .onConflict(['forum_name', 'coingecko_id', 'timestamp'])
        .merge();
    }
  });

  logger.info(
    `Inserted/updated ${records.length} records of market data for ${forumName} (${coingeckoId}) on ${day.toISOString().split('T')[0]}.`
  );
}

// Get the last processed date for a given forum and coingecko_id
async function getLastProcessedDate(forumName: string, coingeckoId: string): Promise<Date | null> {
  const state = await db('token_market_data_state')
    .where({ forum_name: forumName, coingecko_id: coingeckoId })
    .first();

  if (!state || !state.last_processed_date) return null;
  return new Date(state.last_processed_date);
}

// Update the last processed date
async function updateLastProcessedDate(
  forumName: string,
  coingeckoId: string,
  date: Date
): Promise<void> {
  await db('token_market_data_state')
    .insert({
      forum_name: forumName,
      coingecko_id: coingeckoId,
      last_processed_date: date.toISOString().split('T')[0],
    })
    .onConflict(['forum_name', 'coingecko_id'])
    .merge();
}

// Helper to fetch data day-by-day without gaps
async function fetchAndInsertAllDays(
  forumName: string,
  coingeckoId: string,
  apiKey: string,
  forceRefresh = false
): Promise<void> {
  const coingeckoService = new CoingeckoProService();

  // We choose a start range, for example 30 days ago from now
  const now = new Date();
  // Truncate now to midnight UTC
  const nowMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(nowMidnight.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

  // Check if we have a last processed date
  const lastProcessed = forceRefresh ? null : await getLastProcessedDate(forumName, coingeckoId);
  let current = lastProcessed ? new Date(lastProcessed.getTime() + 24 * 60 * 60 * 1000) : start;

  logger.info('Processing date range', {
    forumName,
    coingeckoId,
    lastProcessed: lastProcessed?.toISOString(),
    start: start.toISOString(),
    current: current.toISOString(),
    nowMidnight: nowMidnight.toISOString(),
    forceRefresh,
  });

  while (current <= nowMidnight) {
    // Fetch data for `current` day from 00:00 to next day 00:00
    const dayStart = new Date(
      Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate(), 0, 0, 0)
    );
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1); // end of that day

    logger.info('Fetching data for day', {
      forumName,
      coingeckoId,
      dayStart: dayStart.toISOString(),
      dayEnd: dayEnd.toISOString(),
    });

    try {
      const data = await coingeckoService.getMarketChartRange(
        coingeckoId,
        dayStart.getTime(),
        dayEnd.getTime()
      );

      // Insert data for this day
      await insertDayData(forumName, coingeckoId, data, current);
      // Update last processed date after successfully inserting the day
      await updateLastProcessedDate(forumName, coingeckoId, current);
    } catch (error: any) {
      logger.error(
        `Error processing ${forumName}/${coingeckoId} on ${current.toISOString().split('T')[0]}: ${error.message}`
      );

      if (error.message.includes('401')) {
        logger.error(`Authentication failure for ${forumName}. Check API Key.`);
        return;
      }

      // Stop on error to avoid gaps. Next run will continue from last processed date.
      return;
    }

    current = new Date(current.getTime() + 24 * 60 * 60 * 1000); // next day
  }

  logger.info(`All available days processed for ${forumName}/${coingeckoId}.`);
}

// Public crawl function
export async function crawlTokenMarketData(forceRefresh = false): Promise<void> {
  logger.info('Starting incremental token market data crawl...', { forceRefresh });
  let processedCount = 0;
  let skippedCount = 0;

  // Check if we have a global CoinGecko PRO API key
  if (!apiConfig.coingecko.proApiKey) {
    logger.error('No CoinGecko PRO API key found in global configuration');
    return;
  }

  for (const config of forumConfigs) {
    if (!config.tokenConfig?.coingeckoId) {
      logger.info(`Skipping ${config.name} as no coingeckoId found.`);
      skippedCount++;
      continue;
    }

    const forumName = config.name;
    const coingeckoId = config.tokenConfig.coingeckoId;
    const apiKey = apiConfig.coingecko.proApiKey;

    logger.info(`Processing market data for ${forumName}/${coingeckoId} day-by-day...`);
    await fetchAndInsertAllDays(forumName, coingeckoId, apiKey, forceRefresh);
    processedCount++;
  }

  logger.info(
    `Token market data crawl completed. Processed: ${processedCount}, Skipped: ${skippedCount}.`
  );
}

/**
 * Optional function to start from scratch:
 * This will truncate token_market_data and token_market_data_state tables,
 * allowing a fresh indexing from scratch.
 */
export async function truncateMarketDataTables(): Promise<void> {
  // Note: This will remove ALL market data and state.
  // Only call if you want a full reset.
  await db.transaction(async trx => {
    await trx.raw('TRUNCATE TABLE token_market_data RESTART IDENTITY CASCADE;');
    await trx('token_market_data_state').truncate();
  });
  logger.info(
    'token_market_data and token_market_data_state tables truncated. Ready for a fresh start.'
  );
}

if (import.meta.main) {
  // Check for --force flag
  const forceRefresh = process.argv.includes('--force');

  crawlTokenMarketData(forceRefresh)
    .then(() => {
      console.log('Market data crawl finished successfully.');
      process.exit(0);
    })
    .catch(error => {
      console.error('Error in market data crawl:', error);
      process.exit(1);
    });
}
