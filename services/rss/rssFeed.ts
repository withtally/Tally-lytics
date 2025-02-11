import { Feed } from 'feed';
import db from '../../db/db';
import { RateLimiter } from 'limiter';
import { Logger } from '../logging';
import { loggerConfig } from '../../config/loggerConfig';
import { Metrics } from './metrics';

// Add Bun-specific type definitions
type BunRequest = Request;
type BunResponse = Response;
// Add missing interfaces
interface FeedConfig {
  title: string;
  description: string;
  id: string;
  link: string;
  language: string;
  copyright: string;
}

interface CacheEntry {
  content: string;
  timestamp: number;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  size: number;
}

class FeedCache {
  private cache: Map<string, CacheEntry>;
  private ttl: number;
  private metrics: CacheMetrics = { hits: 0, misses: 0, size: 0 };
  private logger: Logger;

  constructor(ttlMinutes: number = 5) {
    this.cache = new Map();
    this.ttl = ttlMinutes * 60 * 1000;
    this.logger = new Logger({
      ...loggerConfig,
      logFile: 'logs/rss-cache.log',
    });
  }

  set(key: string, content: string): void {
    try {
      this.cache.set(key, {
        content,
        timestamp: Date.now(),
      });
      this.metrics.size = this.cache.size;
      this.logger.debug(`Cache set: ${key}`, { cacheSize: this.metrics.size });
    } catch (error: any) {
      this.logger.error(`Error setting cache for key ${key}:`, { error });
    }
  }

  get(key: string): string | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.metrics.misses++;
      this.logger.debug(`Cache miss: ${key}`, { misses: this.metrics.misses });
      return null;
    }

    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      this.metrics.misses++;
      this.metrics.size = this.cache.size;
      this.logger.debug(`Cache expired: ${key}`, { misses: this.metrics.misses });
      return null;
    }

    this.metrics.hits++;
    this.logger.debug(`Cache hit: ${key}`, { hits: this.metrics.hits });
    return entry.content;
  }

  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  clear(): void {
    this.cache.clear();
    this.metrics.size = 0;
    this.logger.info('Cache cleared', { cacheSize: this.metrics.size });
  }
}

// Add missing interfaces for database types
interface Topic {
  id: number;
  forum_name: string;
  title: string;
  created_at: string;
  ai_summary: string | null;
}

interface Post {
  id: number;
  forum_name: string;
  title: string;
  content: string;
  created_at: string;
}

interface TallyProposal {
  id: number;
  forum_name: string;
  title: string;
  description: string;
  created_at: string;
}

interface SnapshotProposal {
  id: number;
  forum_name: string;
  title: string;
  description: string;
  created_at: string;
}

class ForumFeedService {
  private baseConfig: FeedConfig;
  private cache: FeedCache;
  private rateLimiter: RateLimiter;
  private logger: Logger;
  private metrics: Metrics;

  constructor(forumName: string) {
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    this.baseConfig = {
      title: `${forumName} Forum Feed`,
      description: `Latest content from ${forumName} forum`,
      id: `${baseUrl}/forum/${forumName}`,
      link: `${baseUrl}/forum/${forumName}`,
      language: 'en',
      copyright: `All rights reserved ${new Date().getFullYear()}`,
    };

    this.cache = new FeedCache(5);
    this.rateLimiter = new RateLimiter({
      tokensPerInterval: 30,
      interval: 'minute',
    });

    this.logger = new Logger({
      ...loggerConfig,
      logFile: `logs/${forumName}-rss-feed.log`,
    });

    this.metrics = new Metrics('rss_feed_service');
  }

  // Add this public method to handle rate limiting
  public async tryRemoveTokens(count: number): Promise<boolean> {
    return this.rateLimiter.tryRemoveTokens(count);
  }

  async getTopicsFeed(forumName: string): Promise<Feed> {
    const startTime = Date.now();
    const feed = new Feed(this.baseConfig);

    try {
      const topics = await db<Topic>('topics')
        .where({ forum_name: forumName })
        .orderBy('created_at', 'desc')
        .limit(50)
        .select('*');

      this.logger.info(`Retrieved ${topics.length} topics for ${forumName}`);
      this.metrics.gauge('topics_retrieved', topics.length);

      for (const topic of topics) {
        feed.addItem({
          title: topic.title,
          id: topic.id.toString(),
          link: `${this.baseConfig.link}/topic/${topic.id}`,
          description: topic.ai_summary || 'No summary available',
          date: new Date(topic.created_at),
        });
      }

      const duration = Date.now() - startTime;
      this.metrics.timing('topics_feed_generation', duration);
      return feed;
    } catch (error: any) {
      this.logger.error(`Error generating topics feed for ${forumName}:`, { error });
      throw error;
    }
  }

  // Add missing methods with proper types
  async getPostsFeed(forumName: string): Promise<Feed> {
    const feed = new Feed(this.baseConfig);
    const posts = await db<Post>('posts')
      .where({ forum_name: forumName })
      .orderBy('created_at', 'desc')
      .limit(50)
      .select('*');

    for (const post of posts) {
      feed.addItem({
        title: post.title,
        id: post.id.toString(),
        link: `${this.baseConfig.link}/post/${post.id}`,
        description: post.content,
        date: new Date(post.created_at),
      });
    }

    return feed;
  }

  async getTallyProposalsFeed(forumName: string): Promise<Feed> {
    const feed = new Feed(this.baseConfig);
    const proposals = await db<TallyProposal>('tally_proposals')
      .where({ forum_name: forumName })
      .orderBy('created_at', 'desc')
      .limit(50)
      .select('*');

    for (const proposal of proposals) {
      feed.addItem({
        title: proposal.title,
        id: proposal.id.toString(),
        link: `${this.baseConfig.link}/proposal/${proposal.id}`,
        description: proposal.description,
        date: new Date(proposal.created_at),
      });
    }

    return feed;
  }

  async getSnapshotProposalsFeed(forumName: string): Promise<Feed> {
    const feed = new Feed(this.baseConfig);
    const proposals = await db<SnapshotProposal>('snapshot_proposals')
      .where({ forum_name: forumName })
      .orderBy('created_at', 'desc')
      .limit(50)
      .select('*');

    for (const proposal of proposals) {
      feed.addItem({
        title: proposal.title,
        id: proposal.id.toString(),
        link: `${this.baseConfig.link}/proposal/${proposal.id}`,
        description: proposal.description,
        date: new Date(proposal.created_at),
      });
    }

    return feed;
  }

  async generateFeed(forumName: string, feedType: string): Promise<string> {
    const startTime = Date.now();
    const cacheKey = `${forumName}:${feedType}`;

    try {
      // Check cache first
      const cachedContent = this.cache.get(cacheKey);
      if (cachedContent) {
        this.metrics.increment('cache_hits');
        return cachedContent;
      }

      this.metrics.increment('cache_misses');
      this.logger.info(`Generating fresh feed for ${forumName}:${feedType}`);

      let feed: Feed;
      switch (feedType) {
        case 'topics':
          feed = await this.getTopicsFeed(forumName);
          break;
        case 'posts':
          feed = await this.getPostsFeed(forumName);
          break;
        case 'tally':
          feed = await this.getTallyProposalsFeed(forumName);
          break;
        case 'snapshot':
          feed = await this.getSnapshotProposalsFeed(forumName);
          break;
        case 'all':
          feed = await this.getAllContentFeed(forumName);
          break;
        default:
          throw new Error(`Invalid feed type: ${feedType}`);
      }

      const content = feed.rss2();
      this.cache.set(cacheKey, content);

      const duration = Date.now() - startTime;
      this.metrics.timing('feed_generation', duration);

      return content;
    } catch (error: any) {
      this.logger.error(`Error generating feed for ${forumName}:${feedType}:`, { error });
      this.metrics.increment('feed_generation_errors');
      throw error;
    }
  }

  async getAllContentFeed(forumName: string): Promise<Feed> {
    const startTime = Date.now();
    try {
      const feed = new Feed({
        ...this.baseConfig,
        title: `${forumName} All Content Feed`,
      });

      const [topics, posts, tally, snapshot] = await Promise.all([
        this.getTopicsFeed(forumName),
        this.getPostsFeed(forumName),
        this.getTallyProposalsFeed(forumName),
        this.getSnapshotProposalsFeed(forumName),
      ]);

      const allItems = [...topics.items, ...posts.items, ...tally.items, ...snapshot.items]
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 50);

      allItems.forEach(item => feed.addItem(item));

      const duration = Date.now() - startTime;
      this.metrics.timing('all_content_feed_generation', duration);

      return feed;
    } catch (error: any) {
      this.logger.error(`Error generating all content feed for ${forumName}:`, { error });
      this.metrics.increment('all_content_feed_errors');
      throw error;
    }
  }

  getMetrics() {
    return {
      cache: this.cache.getMetrics(),
      rateLimit: {
        remaining: this.rateLimiter.getTokensRemaining(),
      },
      ...this.metrics.getMetrics(),
    };
  }
}

export async function handleRSSFeed(req: BunRequest): Promise<BunResponse> {
  const startTime = Date.now();
  const url = new URL(req.url);
  const forumName = url.searchParams.get('forum');
  const feedType = url.searchParams.get('type') || 'all';
  const clientIp = req.headers.get('x-forwarded-for') || 'unknown';

  const logger = new Logger({
    ...loggerConfig,
    logFile: 'logs/rss-handler.log',
  });

  logger.info(`RSS feed request`, {
    forumName,
    feedType,
    clientIp,
  });

  if (!forumName) {
    logger.warn('Missing forum name in request', { clientIp });
    return new Response('Forum name is required', { status: 400 });
  }

  const feedService = new ForumFeedService(forumName);

  try {
    const hasTokens = await feedService.tryRemoveTokens(1);
    if (!hasTokens) {
      logger.warn('Rate limit exceeded', { clientIp, forumName });
      return new Response('Too many requests', {
        status: 429,
        headers: {
          'Retry-After': '60',
          'Content-Type': 'text/plain',
        },
      });
    }

    const feedContent = await feedService.generateFeed(forumName, feedType);
    const duration = Date.now() - startTime;

    const metrics = feedService.getMetrics();
    logger.info('Feed generated successfully', {
      duration,
      metrics,
      forumName,
      feedType,
    });

    return new Response(feedContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/rss+xml',
        'Cache-Control': 'public, max-age=300',
        'Last-Modified': new Date().toUTCString(),
        ETag: `"${Buffer.from(feedContent).toString('base64').substring(0, 27)}"`,
        'X-RateLimit-Remaining': metrics.rateLimit.remaining.toString(),
        'X-Response-Time': `${duration}ms`,
        'X-Cache-Status': metrics.cache.hits > 0 ? 'HIT' : 'MISS',
      },
    });
  } catch (error: any) {
    logger.error('Error handling RSS feed request:', {
      error,
      forumName,
      feedType,
      clientIp,
    });

    return new Response('Error generating feed', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

export { ForumFeedService };
