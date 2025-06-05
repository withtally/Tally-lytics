// services/server/cron.ts
import type { Context, Hono } from 'hono';
import { CronManager } from '../cron/cronManager';
import { Logger } from '../logging';
import { CronValidator } from '../validation/cronValidator';

export const cronRoutes = (app: Hono, cronManager: CronManager, logger: Logger) => {
  // Get cron job status
  app.get('/api/cron/status', (c: Context) => {
    try {
      return c.json({
        ...cronManager.getStatus(),
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get cron status', { error: errorMessage });
      return c.json(
        {
          error: 'Failed to get cron status',
          details: errorMessage,
          timestamp: new Date().toISOString(),
        },
        500
      );
    }
  });

  // Start cron job with optional schedule
  app.post('/api/cron/start', async (c: Context) => {
    try {
      let schedule: string | undefined;

      // Only try to parse body if content-type is application/json
      const contentType = c.req.header('content-type');
      if (contentType?.includes('application/json')) {
        const body = await c.req.json();
        schedule = body.schedule;
        
        // Validate the schedule if provided
        if (schedule) {
          const validation = CronValidator.validate(schedule);
          if (!validation.isValid) {
            return c.json(
              {
                error: 'Invalid cron schedule',
                details: validation.error,
                timestamp: new Date().toISOString(),
              },
              400
            );
          }
        }
      }

      cronManager.startScheduledCrawls(schedule);

      return c.json({
        message: 'Cron job started successfully',
        status: cronManager.getStatus(),
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      logger.error('Failed to start cron job', {
        error: errorMessage,
        stack: errorStack,
      });

      return c.json(
        {
          error: 'Failed to start cron job',
          details: errorMessage,
          stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
          timestamp: new Date().toISOString(),
        },
        500
      );
    }
  });

  // Stop cron job
  app.post('/api/cron/stop', (c: Context) => {
    try {
      cronManager.stopScheduledCrawls();
      return c.json({
        message: 'Cron job stopped successfully',
        status: cronManager.getStatus(),
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to stop cron job', { error: errorMessage });
      return c.json(
        {
          error: 'Failed to stop cron job',
          details: errorMessage,
          timestamp: new Date().toISOString(),
        },
        500
      );
    }
  });
};
