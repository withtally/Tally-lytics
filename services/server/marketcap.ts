// First, create new route handlers in services/server/marketcap.ts
import type { Context, Hono } from 'hono';
import { crawlTokenMarketData } from '../marketCapTracking/tokenMarketDataCrawler';
import { Logger } from '../logging';
import db from '../../db/db';

export const marketCapRoutes = (app: Hono, logger: Logger) => {
  // Get market cap data
  app.get('/api/marketcap/:forumName', async (c: Context) => {
    try {
      const forumName = c.req.param('forumName');
      const data = await db('token_market_data')
        .where('forum_name', forumName)
        .orderBy('timestamp', 'desc')
        .limit(100);

      return c.json({
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Failed to fetch market cap data:', error);
      return c.json({ error: 'Failed to fetch market cap data' }, 500);
    }
  });

  // Trigger market cap crawl
  app.post('/api/marketcap/crawl', async (c: Context) => {
    try {
      // Start crawl in the background with proper error handling
      const backgroundMarketCapCrawl = async () => {
        try {
          logger.info('Starting background market cap crawl');
          await crawlTokenMarketData();
          logger.info('Market cap crawl completed successfully');
        } catch (error: any) {
          logger.error('Error in background market cap crawl:', error);
          // Optionally notify monitoring system
        }
      };

      backgroundMarketCapCrawl();

      return c.json({
        message: 'Market cap crawl initiated',
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Failed to start market cap crawl:', error);
      return c.json({ error: 'Failed to start market cap crawl' }, 500);
    }
  });
};
