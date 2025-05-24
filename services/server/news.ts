// Create new route handlers in services/server/news.ts
import type { Context, Hono } from 'hono';
import { crawlNews } from '../newsAPICrawler/newsCrawler';
import { crawlNewsArticleEvaluations } from '../newsAPICrawler/newsArticleEvaluationCrawler';
import { Logger } from '../logging';

export const newsRoutes = (app: Hono, logger: Logger) => {
  // Get news articles
  app.get('/api/news/:forumName', async (c: Context) => {
    try {
      const forumName = c.req.param('forumName');
      const data = await db('news_articles')
        .where('forum_name', forumName)
        .orderBy('published_at', 'desc')
        .limit(100);

      return c.json({
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Failed to fetch news articles:', error);
      return c.json({ error: 'Failed to fetch news articles' }, 500);
    }
  });

  // Trigger news crawl
  app.post('/api/news/crawl', async (c: Context) => {
    try {
      // Start crawl in the background with proper error handling
      const backgroundNewsCrawl = async () => {
        try {
          logger.info('Starting background news crawl');
          await crawlNews();
          await crawlNewsArticleEvaluations();
          logger.info('News crawl and evaluation completed successfully');
        } catch (error: any) {
          logger.error('Error in background news crawl:', error);
          // Optionally notify monitoring system
        }
      };

      backgroundNewsCrawl();

      return c.json({
        message: 'News crawl initiated',
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Failed to start news crawl:', error);
      return c.json({ error: 'Failed to start news crawl' }, 500);
    }
  });
};
