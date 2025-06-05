// services/server/unifiedCronRoutes.ts
import type { Context, Hono } from 'hono';
import { CronScheduler } from '../cron/CronScheduler';
import { Logger } from '../logging';
import { CronValidator } from '../validation/cronValidator';

export const unifiedCronRoutes = (app: Hono, cronScheduler: CronScheduler, logger: Logger) => {
  // Get overall cron status
  app.get('/api/cron/status', async (c: Context) => {
    try {
      const status = await cronScheduler.getStatus();
      return c.json({
        ...status,
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

  // Start all cron tasks
  app.post('/api/cron/start/all', async (c: Context) => {
    try {
      cronScheduler.startAll();
      const status = await cronScheduler.getStatus();

      return c.json({
        message: 'All cron tasks started successfully',
        status,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to start all cron tasks', { error: errorMessage });

      return c.json(
        {
          error: 'Failed to start all cron tasks',
          details: errorMessage,
          timestamp: new Date().toISOString(),
        },
        500
      );
    }
  });

  // Stop all cron tasks
  app.post('/api/cron/stop/all', async (c: Context) => {
    try {
      cronScheduler.stopAll();
      const status = await cronScheduler.getStatus();

      return c.json({
        message: 'All cron tasks stopped successfully',
        status,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to stop all cron tasks', { error: errorMessage });

      return c.json(
        {
          error: 'Failed to stop all cron tasks',
          details: errorMessage,
          timestamp: new Date().toISOString(),
        },
        500
      );
    }
  });

  // Start specific task
  app.post('/api/cron/start/:taskName', async (c: Context) => {
    try {
      const taskName = c.req.param('taskName');
      let schedule: string | undefined;

      // Check for JSON body with custom schedule
      const contentType = c.req.header('content-type');
      if (contentType?.includes('application/json')) {
        try {
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
        } catch (jsonError) {
          // Ignore JSON parsing errors - continue without custom schedule
        }
      }

      cronScheduler.startTask(taskName, schedule);
      const status = await cronScheduler.getStatus();

      return c.json({
        message: `Task ${taskName} started successfully`,
        taskStatus: status.tasks[taskName],
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to start task ${c.req.param('taskName')}`, { error: errorMessage });

      return c.json(
        {
          error: `Failed to start task`,
          details: errorMessage,
          timestamp: new Date().toISOString(),
        },
        500
      );
    }
  });

  // Stop specific task
  app.post('/api/cron/stop/:taskName', async (c: Context) => {
    try {
      const taskName = c.req.param('taskName');
      cronScheduler.stopTask(taskName);
      const status = await cronScheduler.getStatus();

      return c.json({
        message: `Task ${taskName} stopped successfully`,
        taskStatus: status.tasks[taskName],
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to stop task ${c.req.param('taskName')}`, { error: errorMessage });

      return c.json(
        {
          error: `Failed to stop task`,
          details: errorMessage,
          timestamp: new Date().toISOString(),
        },
        500
      );
    }
  });

  // Execute task immediately
  app.post('/api/cron/execute/:taskName', async (c: Context) => {
    try {
      const taskName = c.req.param('taskName');

      // Optional API key check
      if (process.env.CRON_API_KEY) {
        const apiKey = c.req.header('X-API-Key');
        if (apiKey !== process.env.CRON_API_KEY) {
          logger.warn(`Unauthorized attempt to execute task ${taskName} - invalid API key`);
          return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);
        }
      }

      await cronScheduler.executeTaskNow(taskName);
      const status = await cronScheduler.getStatus();

      return c.json({
        message: `Task ${taskName} executed successfully`,
        taskStatus: status.tasks[taskName],
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to execute task ${c.req.param('taskName')}`, { error: errorMessage });

      return c.json(
        {
          error: `Failed to execute task`,
          details: errorMessage,
          timestamp: new Date().toISOString(),
        },
        500
      );
    }
  });

  // Get list of available tasks
  app.get('/api/cron/tasks', async (c: Context) => {
    try {
      const taskNames = cronScheduler.getRegisteredTasks();
      const status = await cronScheduler.getStatus();

      return c.json({
        tasks: taskNames.map(name => status.tasks[name]),
        totalTasks: taskNames.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get task list', { error: errorMessage });

      return c.json(
        {
          error: 'Failed to get task list',
          details: errorMessage,
          timestamp: new Date().toISOString(),
        },
        500
      );
    }
  });

  // Legacy routes for backward compatibility

  // Legacy: start crawl (maps to crawl_all_forums task)
  app.post('/api/cron/start', async (c: Context) => {
    try {
      let schedule: string | undefined;

      const contentType = c.req.header('content-type');
      if (contentType?.includes('application/json')) {
        try {
          const body = await c.req.json();
          schedule = body.schedule;

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
        } catch (jsonError) {
          // Ignore JSON parsing errors
        }
      }

      cronScheduler.startTask('crawl_all_forums', schedule);
      const status = await cronScheduler.getStatus();

      return c.json({
        message: 'Cron job started successfully',
        status: status.tasks['crawl_all_forums'],
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to start legacy cron job', { error: errorMessage });

      return c.json(
        {
          error: 'Failed to start cron job',
          details: errorMessage,
          timestamp: new Date().toISOString(),
        },
        500
      );
    }
  });

  // Legacy: stop crawl (maps to crawl_all_forums task)
  app.post('/api/cron/stop', async (c: Context) => {
    try {
      cronScheduler.stopTask('crawl_all_forums');
      const status = await cronScheduler.getStatus();

      return c.json({
        message: 'Cron job stopped successfully',
        status: status.tasks['crawl_all_forums'],
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to stop legacy cron job', { error: errorMessage });

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
