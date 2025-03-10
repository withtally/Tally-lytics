// server.ts
// Revised to handle clearing of stall detectors (heartbeat monitor) after crawl completes

import dotenv from 'dotenv';
import { Logger } from './services/logging';
import { CrawlerManager } from './services/crawling/crawlerManager';
import { VectorSearchService } from './services/search/vectorSearchService';
import { pgVectorClient } from './db/pgvectorClient';
import { configureMiddleware } from './services/server/config';
import { healthRoutes } from './services/server/health';
import { crawlRoutes } from './services/server/crawl';
import { searchRoutes } from './services/server/search';
import { cronRoutes } from './services/server/cron';
import { CronManager } from './services/cron/cronManager';
import crypto from 'crypto';
import { handleGlobalError } from './services/errorHandling/globalErrorHandler';
import { marketCapRoutes } from './services/server/marketcap';
import { newsRoutes } from './services/server/news';
import { handleRSSFeed } from './services/rss/rssFeed';
import { commonTopicsRoutes } from './services/server/commonTopicsRoutes';
import { CommonTopicsCron } from './services/cron/commonTopicsCron';
import { chatRoutes } from './services/server/chatRoutes';
import { llmRateLimiter } from './services/middleware/rateLimiter';
import { llmRoutes } from './services/server/llmRoutes';
import { cronStatusRoutes } from './services/server/cronStatusRoutes';

// HeartbeatMonitor class definition
class HeartbeatMonitor {
  private lastHeartbeat: Map<string, Date> = new Map();
  private timeoutMs: number;

  constructor(timeoutMs: number = 15 * 60 * 1000) {
    // Default 15 minutes
    this.timeoutMs = timeoutMs;
  }

  updateHeartbeat(forumName: string) {
    this.lastHeartbeat.set(forumName, new Date());
  }

  isStalled(forumName: string): boolean {
    const lastBeat = this.lastHeartbeat.get(forumName);
    return lastBeat ? Date.now() - lastBeat.getTime() > this.timeoutMs : false;
  }

  clear(forumName: string) {
    this.lastHeartbeat.delete(forumName);
  }

  getAllStalled(): string[] {
    return Array.from(this.lastHeartbeat.entries())
      .filter(([_, lastBeat]) => Date.now() - lastBeat.getTime() > this.timeoutMs)
      .map(([forumName]) => forumName);
  }
}

// Server state interface
interface ServerState {
  isShuttingDown: boolean;
  activeConnections: Set<any>;
  heartbeatMonitor: HeartbeatMonitor;
  isHealthy: boolean;
}

// Initialize server state
const state: ServerState = {
  isShuttingDown: false,
  activeConnections: new Set(),
  heartbeatMonitor: new HeartbeatMonitor(),
  isHealthy: true,
};

dotenv.config();

const logger = new Logger({
  logFile: 'logs/server.log',
  level: 'info',
});

export const crawlerManager = new CrawlerManager(logger, state.heartbeatMonitor);
const searchService = new VectorSearchService();
const cronManager = new CronManager(crawlerManager, logger);

import { Hono } from 'hono';
const app = new Hono();

// Configure middleware
configureMiddleware(app);

// Configure routes
healthRoutes(app, crawlerManager);
crawlRoutes(app, crawlerManager, logger);
searchRoutes(app, searchService, logger);
cronRoutes(app, cronManager, logger);
marketCapRoutes(app, logger);
newsRoutes(app, logger);
app.get('/rss', async c => {
  const response = await handleRSSFeed(c.req.raw);
  return response;
});

// Add common topics routes
app.route('', commonTopicsRoutes);

// Add chat routes
app.route('', chatRoutes);

// Add cron status routes
app.route('', cronStatusRoutes);

// Add LLM routes with rate limiting
app.use('/api/generateSimile', llmRateLimiter);
app.use('/api/generateFollowUp', llmRateLimiter);
app.route('', llmRoutes);

// Initialize cron job for common topics - DISABLED for Railway deployment
// We now use Railway's native cron service instead
// const commonTopicsCron = new CommonTopicsCron();
// commonTopicsCron.start();

// Add search logging middleware to search routes
// app.post('/api/search', searchLogger, searchHandler);
// app.post('/api/search/:type', searchLogger, searchByTypeHandler);

// Error handling
app.onError((err, c) => {
  const errorId = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const errorMessage = err instanceof Error ? err.message : 'Unknown error';

  handleGlobalError(err, `Global Error Handler - Path: ${c.req.path}`);

  // Rate limiting errors
  if (err instanceof Error && err.message.includes('Rate limit exceeded')) {
    return c.json(
      {
        errorId,
        error: 'Too many requests',
        retryAfter: 60,
        timestamp,
      },
      429
    );
  }

  // Database errors
  if (err instanceof Error && err.message.includes('connection')) {
    return c.json(
      {
        errorId,
        error: 'Service temporarily unavailable',
        timestamp,
      },
      503
    );
  }

  return c.json(
    {
      errorId,
      error: 'Internal server error',
      message:
        process.env.NODE_ENV === 'development' ? errorMessage : 'An unexpected error occurred',
      timestamp,
    },
    500
  );
});

// Periodic connection and stall checks
const checkConnections = async () => {
  try {
    await pgVectorClient.query('SELECT 1');
    state.isHealthy = true;

    // Check for stalled crawls
    const stalledForums = state.heartbeatMonitor.getAllStalled();
    for (const forum of stalledForums) {
      logger.warn(`Detected stalled crawl for ${forum}`);
      try {
        await crawlerManager.stopCrawl(forum);
      } catch (error: any) {
        logger.error(`Error stopping stalled crawl for ${forum}:`, error);
      }
    }
  } catch (error: any) {
    state.isHealthy = false;
    logger.error('Database connection error:', error);
  }
};

setInterval(checkConnections, 30000);

// Add to the graceful shutdown function:
const gracefulShutdown = async (server: any, signal: string) => {
  if (state.isShuttingDown) return;
  state.isShuttingDown = true;

  logger.info(`${signal} received. Starting graceful shutdown...`);

  try {
    await Promise.race([
      (async () => {
        // Stop accepting new connections
        server.stop();

        // Stop all cron jobs
        // marketCapCronJob.stop();
        // newsCronJob.stop();

        // Stop all active crawlers and clear their heartbeats
        const activeStatuses = crawlerManager
          .getAllStatuses()
          .filter(status => status.status === 'running')
          .map(status => status.forumName);

        for (const forum of activeStatuses) {
          state.heartbeatMonitor.clear(forum);
          await crawlerManager.stopCrawl(forum);
        }

        // Stop cron jobs
        cronManager.stopScheduledCrawls();

        // Close database connections
        await pgVectorClient.end();

        logger.info('Graceful shutdown completed');
      })(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Shutdown timeout')), 30000)),
    ]);

    process.exit(0);
  } catch (error: any) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

// Port utility
const isPortInUse = async (port: number): Promise<boolean> => {
  try {
    const server = Bun.serve({
      port,
      fetch: () => new Response('test'),
    });
    server.stop();
    // Add a short delay to ensure the port is fully released
    await new Promise(resolve => setTimeout(resolve, 50));
    return false;
  } catch {
    return true;
  }
};

const findAvailablePort = async (startPort: number): Promise<number> => {
  let port = startPort;
  while (await isPortInUse(port)) {
    port++;
  }
  return port;
};

// Start server
const startServer = async () => {
  try {
    console.log(`Selected environment: ${process.env.NODE_ENV}`);

    // Initialize database connection
    await pgVectorClient.connect();
    logger.info('pgVectorClient connected successfully');

    const preferredPort = process.env.PORT ? parseInt(process.env.PORT) : 3000;
    const port = await findAvailablePort(preferredPort);

    const server = Bun.serve({
      port,
      fetch: app.fetch,
      development: process.env.NODE_ENV === 'development',
    });

    logger.info(`Server listening on http://localhost:${port}`);

    const shutdownHandler = (signal: string) => gracefulShutdown(server, signal);
    process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
    process.on('SIGINT', () => shutdownHandler('SIGINT'));

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', {
        reason,
        promise,
        timestamp: new Date().toISOString(),
      });
    });

    // Apply rate limiting to LLM endpoints
    app.use('/api/chat*', llmRateLimiter);
    app.use('/api/common-topics/*/chat', llmRateLimiter);

    return server;
  } catch (error: any) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

if (import.meta.main) {
  startServer().catch(error => {
    logger.error('Startup error:', error);
    process.exit(1);
  });
}
export { startServer, app };
