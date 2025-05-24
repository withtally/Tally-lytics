// modules/health.ts
import type { Context, Hono } from 'hono';
import { CrawlerManager } from '../crawling/crawlerManager';
import { readFile } from 'fs/promises';
import { join } from 'path';

export const healthRoutes = (app: Hono, crawlerManager: CrawlerManager) => {
  app.get('/api/health', (c: Context) => {
    return c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        crawler: {
          status: 'running',
          activeJobs: crawlerManager.getAllStatuses(),
        },
        search: 'running',
      },
    });
  });

  app.get('/api/logs/:forum', async (c: Context) => {
    try {
      const forum = c.req.param('forum');
      const logPath = join(process.cwd(), 'logs', `${forum}-crawler.log`);

      try {
        const logContent = await readFile(logPath, 'utf-8');
        return new Response(logContent, {
          headers: {
            'Content-Type': 'text/plain',
          },
        });
      } catch (error) {
        // Check if it's a file not found error
        if (error instanceof Error && error.message.includes('ENOENT')) {
          return c.json(
            {
              error: 'Log file not found',
              details: `No logs available for ${forum}`,
            },
            404
          );
        }
        
        // Re-throw other errors to be caught by outer catch
        throw error;
      }
    } catch (error) {
      return c.json(
        {
          error: 'Failed to read logs',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      );
    }
  });
};
