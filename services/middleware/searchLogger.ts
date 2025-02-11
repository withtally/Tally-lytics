import { Context, Next } from 'hono';
import db from '../../db/db';
import { Logger } from '../logging';

const logger = new Logger({ logFile: 'logs/search-logger.log' });

export async function searchLogger(c: Context, next: Next) {
  await next();

  try {
    // Only log successful searches
    if (c.res.status === 200) {
      const body = await c.req.json();
      const { query, forum } = body;

      if (query && forum) {
        await db('search_log').insert({
          query,
          forum_name: forum,
        });

        logger.info(`Logged search query: ${query} for forum: ${forum}`);
      }
    }
  } catch (error) {
    logger.error('Error logging search:', error);
    // Don't throw error - logging shouldn't affect the response
  }
}
