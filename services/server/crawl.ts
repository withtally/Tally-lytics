// modules/crawl.ts
import type { Context, Hono } from 'hono';
import { CrawlerManager } from '../crawling/crawlerManager';
import { _ForumConfig, forumConfigs } from '../../config/forumConfig';
import { Logger } from '../logging';

export const crawlRoutes = (app: Hono, crawlerManager: CrawlerManager, logger: Logger) => {
  // Get all crawler statuses
  app.get('/api/crawl/status', (c: Context) => {
    try {
      return c.json({
        statuses: crawlerManager.getAllStatuses(),
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Failed to get crawler statuses', { error });
      return c.json({ error: 'Failed to get crawler statuses' }, 500);
    }
  });

  // Get status for specific forum
  app.get('/api/crawl/status/:forumName', (c: Context) => {
    const forumName = c.req.param('forumName');
    try {
      const status = crawlerManager.getStatus(forumName);
      if (!status) {
        return c.json({ error: `Forum ${forumName} not found` }, 404);
      }
      return c.json({
        status,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error(`Failed to get status for ${forumName}`, { error });
      return c.json({ error: `Failed to get status for ${forumName}` }, 500);
    }
  });

  // Start crawl for all forums
  app.post('/api/crawl/start/all', async (c: Context) => {
    try {
      // Check if any crawls are already running
      const runningForums = crawlerManager
        .getAllStatuses()
        .filter(status => status.status === 'running');

      if (runningForums.length > 0) {
        return c.json(
          {
            success: false,
            error: 'Indexing already in progress',
            runningForums: runningForums.map(f => f.forumName),
            timestamp: new Date().toISOString(),
          },
          409
        );
      }

      // Start crawls for all forums in the background
      Promise.resolve().then(async () => {
        try {
          for (const config of forumConfigs) {
            try {
              await crawlerManager.startCrawl(config.name);
              logger.info(`Completed crawl for ${config.name}`);
            } catch (error: any) {
              logger.error(`Failed indexing for ${config.name}:`, error);
              // Continue with other forums even if one fails
            }
          }
          logger.info('All forum crawls completed');
        } catch (error: any) {
          logger.error('Error in background crawl process:', error);
        }
      });

      // Immediately respond that crawls have been initiated
      return c.json({
        success: true,
        message: 'Crawls initiated for all forums',
        forums: forumConfigs.map(config => config.name),
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to start indexing:', { error: errorMessage });
      return c.json(
        {
          success: false,
          error: 'Failed to start indexing',
          details: errorMessage,
          timestamp: new Date().toISOString(),
        },
        500
      );
    }
  });

  // Start crawl for specific forum
  app.post('/api/crawl/start/:forumName', async (c: Context) => {
    const forumName = c.req.param('forumName');

    try {
      logger.info(`Starting crawl request received for ${forumName}`);

      const config = forumConfigs.find(c => c.name.toLowerCase() === forumName.toLowerCase());
      if (!config) {
        return c.json(
          {
            error: 'Invalid forum name',
            validForums: forumConfigs.map(c => c.name),
            timestamp: new Date().toISOString(),
          },
          400
        );
      }

      // Use the correct case from the config
      const canonicalForumName = config.name;

      // Start the crawl in the background
      Promise.resolve().then(async () => {
        try {
          await crawlerManager.startCrawl(canonicalForumName);
          logger.info(`Crawl completed for ${canonicalForumName}`);
        } catch (error: any) {
          logger.error(`Background crawl error for ${canonicalForumName}:`, error);
        }
      });

      // Immediately respond that the crawl has started
      return c.json({
        message: 'Crawl started successfully',
        status: crawlerManager.getStatus(canonicalForumName),
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error initiating crawl for ${forumName}:`, {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });

      return c.json(
        {
          error: 'Failed to start crawl',
          details: errorMessage,
          timestamp: new Date().toISOString(),
        },
        500
      );
    }
  });

  // Stop crawl for specific forum
  app.post('/api/crawl/stop/:forumName', async (c: Context) => {
    const forumName = c.req.param('forumName');
    try {
      logger.info(`Stopping crawl for ${forumName}`);
      await crawlerManager.stopCrawl(forumName);
      return c.json({
        message: 'Crawl stopped successfully',
        status: crawlerManager.getStatus(forumName),
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to stop crawl for ${forumName}`, { error: errorMessage });
      return c.json(
        {
          error: 'Failed to stop crawl',
          details: errorMessage,
          timestamp: new Date().toISOString(),
        },
        500
      );
    }
  });
};
