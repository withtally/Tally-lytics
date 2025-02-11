// modules/search.ts
import type { Context, Hono } from 'hono';
import { VectorSearchService } from '../search/vectorSearchService';
import { Logger } from '../logging';
import { searchLogger } from '../middleware/searchLogger';

export const searchRoutes = (app: Hono, searchService: VectorSearchService, logger: Logger) => {
  app.use('/api/search*', searchLogger);

  app.post('/api/searchByType', async (c: Context) => {
    try {
      const body = await c.req.json();
      const searchResult = await searchService.search(body);
      return c.json({
        results: searchResult,
        metadata: {
          query: body.query,
          type: body.type,
          forum: body.forum,
          total: searchResult.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Search error:', { error: errorMessage });
      return c.json(
        {
          error: 'Search failed',
          details: errorMessage,
          timestamp: new Date().toISOString(),
        },
        500
      );
    }
  });

  app.post('/api/searchAll', async (c: Context) => {
    try {
      const body = await c.req.json();
      const { query, forum, limit = 10, threshold = 0.7 } = body;

      if (!query || !forum) {
        return c.json(
          {
            error: 'Query and forum are required',
            timestamp: new Date().toISOString(),
          },
          400
        );
      }

      const [topics, posts, snapshot, tally] = await Promise.all([
        searchService.search({ query, type: 'topic', forum, limit, threshold }),
        searchService.search({ query, type: 'post', forum, limit, threshold }),
        searchService.search({ query, type: 'snapshot', forum, limit, threshold }),
        searchService.search({ query, type: 'tally', forum, limit, threshold }),
      ]);

      return c.json({
        topics,
        posts,
        snapshot,
        tally,
        metadata: {
          query,
          forum,
          threshold,
          timestamp: new Date().toISOString(),
          counts: {
            topics: topics.length,
            posts: posts.length,
            snapshot: snapshot.length,
            tally: tally.length,
          },
        },
      });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Search all error:', { error: errorMessage });
      return c.json(
        {
          error: 'Search failed',
          details: errorMessage,
          timestamp: new Date().toISOString(),
        },
        500
      );
    }
  });
};
