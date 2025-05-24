import { Hono } from 'hono';
import { Logger } from '../logging';
import { jobTrackingService } from '../cron/jobTrackingService';

const logger = new Logger({ logFile: 'logs/cron-status-routes.log', level: 'info' });

export const cronStatusRoutes = new Hono();

/**
 * Get job execution history
 * @route GET /api/cron/job-history
 * @query {string} [job_name] - Filter by job name
 * @query {string} [status] - Filter by status (running, success, failed)
 * @query {number} [limit=10] - Number of records to return
 * @query {number} [offset=0] - Number of records to skip
 * @returns {object} Job history records with pagination info
 */
cronStatusRoutes.get('/api/cron/job-history', async c => {
  try {
    const jobName = c.req.query('job_name');
    const status = c.req.query('status') as 'running' | 'success' | 'failed' | undefined;
    const limit = parseInt(c.req.query('limit') || '10');
    const offset = parseInt(c.req.query('offset') || '0');

    const { jobs, total } = await jobTrackingService.getJobHistory({
      jobName,
      status,
      limit,
      offset,
    });

    return c.json({
      jobs,
      pagination: {
        total,
        limit,
        offset,
        has_more: offset + jobs.length < total,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching job history:', error);
    return c.json(
      {
        error: 'Failed to fetch job history',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

/**
 * Get health status of topic generation jobs
 * @route GET /api/health/topics-generation
 * @returns {object} Health status information
 */
cronStatusRoutes.get('/api/health/topics-generation', async c => {
  try {
    // Check last successful run of any topic generation job
    const lastSuccess = await jobTrackingService.getLastSuccessfulJob('generate_all_topics');

    // If no generate_all_topics job found, check for individual forum jobs
    let lastRunTime = lastSuccess?.completed_at;
    let jobName = lastSuccess?.job_name;

    if (!lastRunTime) {
      // Look for any forum-specific job
      const forumJob = await jobTrackingService.getLastSuccessfulJob('generate_topics_%');
      if (forumJob) {
        lastRunTime = forumJob.completed_at;
        jobName = forumJob.job_name;
      }
    }

    // Calculate time since last run
    const now = new Date();
    const hoursSinceLastRun = lastRunTime
      ? Math.round((now.getTime() - new Date(lastRunTime).getTime()) / (60 * 60 * 1000))
      : null;

    // Check status based on expected daily run
    const status = !lastRunTime
      ? 'never_run'
      : hoursSinceLastRun > 36
        ? 'critical'
        : hoursSinceLastRun > 25
          ? 'warning'
          : 'healthy';

    return c.json({
      service: 'topic-generation',
      status,
      last_success: lastRunTime
        ? {
            job: jobName,
            time: lastRunTime,
            hours_ago: hoursSinceLastRun,
          }
        : null,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    logger.error('Error checking topic generation health:', error);
    return c.json(
      {
        service: 'topic-generation',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

/**
 * Manually trigger topic generation for all forums
 * @route POST /api/cron/run-topic-generation
 * @body {string} [timeframe='14d'] - Time range for topic generation
 * @returns {object} Status message
 */
cronStatusRoutes.post('/api/cron/run-topic-generation', async c => {
  try {
    // Check for API key if configured
    if (process.env.CRON_API_KEY) {
      const apiKey = c.req.header('X-API-Key');
      if (apiKey !== process.env.CRON_API_KEY) {
        logger.warn('Unauthorized attempt to run topic generation - invalid API key');
        return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);
      }
    }

    // Forward the request to the generate-all endpoint
    const response = await fetch(
      `${c.req.url.split('/api/cron')[0]}/api/common-topics/generate-all`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.CRON_API_KEY || '',
        },
        body: c.req.raw.body,
      }
    );

    const result = await response.json();
    return c.json(result, response.status);
  } catch (error) {
    logger.error('Error triggering topic generation:', error);
    return c.json(
      {
        error: 'Failed to trigger topic generation',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});
