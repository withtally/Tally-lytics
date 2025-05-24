import { Context, Next } from 'hono';
import { LRUCache } from 'lru-cache';
import { Logger } from '../logging';

const logger = new Logger({ logFile: 'logs/rate-limiter.log' });

// LRU cache for rate limiting with automatic cleanup
const rateLimit = new LRUCache<string, { count: number; resetTime: number }>({
  max: 10000, // Maximum entries
  ttl: 60000, // 1 minute TTL
});

export async function llmRateLimiter(c: Context, next: Next) {
  const ip = c.req.header('x-forwarded-for') || 'unknown';
  const key = `rate_limit:llm:${ip}`;
  const now = Date.now();

  try {
    // Get or create rate limit data (LRU cache handles cleanup automatically)
    let limitData = rateLimit.get(key);
    if (!limitData || limitData.resetTime < now) {
      limitData = {
        count: 0,
        resetTime: now + 60000, // 1 minute from now
      };
    }

    // Increment count
    limitData.count++;
    rateLimit.set(key, limitData);

    // Check limit
    if (limitData.count > 10) {
      // 10 requests per minute
      return c.json(
        {
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((limitData.resetTime - now) / 1000),
        },
        429
      );
    }

    await next();
  } catch (error) {
    logger.error('Rate limiter error:', error);
    await next(); // Continue on error
  }
}
