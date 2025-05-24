// modules/crawl.ts
import type { Context, Hono } from 'hono';
import { CrawlerManager } from '../crawling/crawlerManager';
import { forumConfigs } from '../../config/forumConfig';
import { Logger } from '../logging';
import { validateParam } from '../validation/paramValidator';
import {
  createErrorResponse,
  createSuccessResponse,
  handleValidationError,
} from '../utils/errorResponse';

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
      return c.json(createErrorResponse('Failed to get crawler statuses', 'INTERNAL_ERROR'), 500);
    }
  });

  // Get status for specific forum
  app.get('/api/crawl/status/:forumName', (c: Context) => {
    try {
      const forumName = validateParam(c.req.param('forumName'), 'forum') as string;
      const status = crawlerManager.getStatus(forumName);
      if (!status) {
        return c.json(createErrorResponse(`Forum ${forumName} not found`, 'NOT_FOUND'), 404);
      }
      return c.json(createSuccessResponse({ status }));
    } catch (error: any) {
      if (error.code) {
        return c.json(handleValidationError(error), 400);
      }
      logger.error(`Failed to get status for forum`, { error });
      return c.json(createErrorResponse('Failed to get crawler status', 'INTERNAL_ERROR'), 500);
    }
  });

  // Start crawl for all forums
  app.post('/api/crawl/start/all', async (c: Context) => {
    try {
      const requestSource = c.req.header('user-agent') || 'Unknown source';
      const requestIP =
        c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'Unknown IP';

      logger.info(`[CRON SERVICE] Received request to start all crawls`, {
        source: requestSource,
        ip: requestIP,
        timestamp: new Date().toISOString(),
      });

      // Check if any crawls are already running
      const runningForums = crawlerManager
        .getAllStatuses()
        .filter(status => status.status === 'running');

      if (runningForums.length > 0) {
        logger.warn(
          `[CRON SERVICE] Indexing already in progress for forums: ${runningForums.map(f => f.forumName).join(', ')}`
        );
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

      // Start crawls for all forums in the background with proper error handling
      const backgroundCrawl = async () => {
        try {
          logger.info(
            `[CRON SERVICE] Starting crawls for all forums: ${forumConfigs.map(c => c.name).join(', ')}`
          );
          
          const crawlResults = [];
          for (const config of forumConfigs) {
            try {
              logger.info(`[CRON SERVICE] Beginning crawl for ${config.name}`);
              await crawlerManager.startCrawl(config.name);
              logger.info(`[CRON SERVICE] Completed crawl for ${config.name}`);
              crawlResults.push({ forum: config.name, status: 'success' });
            } catch (error: any) {
              logger.error(`[CRON SERVICE] Failed indexing for ${config.name}:`, error);
              crawlResults.push({ forum: config.name, status: 'failed', error: error.message });
              // Continue with other forums even if one fails
            }
          }
          
          logger.info('[CRON SERVICE] All forum crawls completed', { results: crawlResults });
        } catch (error: any) {
          logger.error('[CRON SERVICE] Critical error in background crawl process:', error);
          // Optionally notify external monitoring system here
        }
      };
      
      // Execute background task without awaiting (fire-and-forget with logging)
      backgroundCrawl();

      // Immediately respond that crawls have been initiated
      logger.info(`[CRON SERVICE] Responding with success for crawl initiation`);
      return c.json({
        success: true,
        message: 'Crawls initiated for all forums',
        forums: forumConfigs.map(config => config.name),
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[CRON SERVICE] Failed to start indexing:', { error: errorMessage });
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

      // Start the crawl in the background with proper error handling
      const backgroundSingleCrawl = async () => {
        try {
          logger.info(`Starting background crawl for ${canonicalForumName}`);
          await crawlerManager.startCrawl(canonicalForumName);
          logger.info(`Crawl completed successfully for ${canonicalForumName}`);
        } catch (error: any) {
          logger.error(`Background crawl error for ${canonicalForumName}:`, error);
          // Optionally notify monitoring system
        }
      };
      
      backgroundSingleCrawl();

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
