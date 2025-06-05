// services/cron/tasks/GenerateTopicsTask.ts
import { BaseCronTask } from '../CronTask';
import { commonTopicsService } from '../../topics/commonTopicsService';
import { forumConfigs } from '../../../config/forumConfig';
import { Logger } from '../../logging';
import { jobTrackingService } from '../jobTrackingService';
import db from '../../../db/db';

/**
 * Task that generates common topics from forum data and search logs
 */
export class GenerateTopicsTask extends BaseCronTask {
  name = 'generate_topics';
  description = 'Generates common topics from forum data and search logs';
  defaultSchedule = '0 0 * * *'; // Daily at midnight

  constructor(
    logger: Logger,
    private readonly timeframe: string = '14d'
  ) {
    super(logger);
  }

  async canRun(): Promise<boolean> {
    try {
      // Check if required tables exist
      const tables = ['posts', 'common_topics', 'search_log'];
      for (const table of tables) {
        const exists = await db.schema.hasTable(table);
        if (!exists) {
          this.logWarn(`Required table ${table} does not exist yet`);
          return false;
        }
      }
      return true;
    } catch (error) {
      this.logError('Error checking database tables', error);
      return false;
    }
  }

  async getStatus(): Promise<Record<string, any>> {
    try {
      // Get last successful run from job tracking
      const { jobs } = await jobTrackingService.getJobHistory({
        jobName: this.name,
        status: 'success',
        limit: 1,
        offset: 0,
      });

      const lastRun = jobs.length > 0 ? jobs[0] : null;

      return {
        lastSuccessfulRun: lastRun
          ? {
              completedAt: lastRun.completed_at,
              duration: lastRun.duration_ms,
            }
          : null,
        timeframe: this.timeframe,
        configuredForums: Object.keys(forumConfigs).length,
      };
    } catch (error) {
      this.logError('Error getting status', error);
      return { error: 'Failed to get status' };
    }
  }

  async execute(): Promise<void> {
    this.logInfo('Starting topic generation');

    // Track the overall job
    const masterJobId = await jobTrackingService.recordJobStart(this.name);

    if (masterJobId === -1) {
      this.logError('Failed to start job tracking. Continuing without tracking.');
    }

    try {
      // Process search logs first
      this.logInfo('Generating topics from search logs');
      const searchLogsJobId = await jobTrackingService.recordJobStart(`${this.name}_search_logs`);

      if (searchLogsJobId === -1) {
        this.logError('Failed to start job tracking for search logs. Continuing without tracking.');
      }

      try {
        await commonTopicsService.generateCommonTopicsFromSearchLogs(this.timeframe);
        if (searchLogsJobId !== -1) {
          await jobTrackingService.recordJobCompletion(searchLogsJobId, 'success');
        }
        this.logInfo('Completed topic generation from search logs');
      } catch (error) {
        if (searchLogsJobId !== -1) {
          await jobTrackingService.recordJobCompletion(
            searchLogsJobId,
            'failed',
            error instanceof Error ? error.message : 'Unknown error'
          );
        }
        this.logError('Error generating topics from search logs', error);
        // Continue with forums even if search logs fail
      }

      // Process each forum
      const forums = Object.keys(forumConfigs);
      this.logInfo(`Generating topics for ${forums.length} forums`);

      const results: Record<string, string> = {};

      for (const forum of forums) {
        const forumJobId = await jobTrackingService.recordJobStart(`${this.name}_${forum}`);

        if (forumJobId === -1) {
          this.logError(
            `Failed to start job tracking for forum ${forum}. Continuing without tracking.`
          );
        }

        try {
          this.logInfo(`Generating topics for forum: ${forum}`);
          await commonTopicsService.generateCommonTopics(forum, this.timeframe);

          if (forumJobId !== -1) {
            await jobTrackingService.recordJobCompletion(forumJobId, 'success');
          }

          results[forum] = 'success';
          this.logInfo(`Completed topic generation for forum: ${forum}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';

          if (forumJobId !== -1) {
            await jobTrackingService.recordJobCompletion(forumJobId, 'failed', errorMessage);
          }

          this.logError(`Error generating topics for forum ${forum}`, error);
          results[forum] = `error: ${errorMessage}`;
          // Continue with next forum
        }
      }

      // Record overall job completion
      if (masterJobId !== -1) {
        await jobTrackingService.recordJobCompletion(masterJobId, 'success');
      }

      this.logInfo('Completed topic generation for all forums', { results });
    } catch (error) {
      // Record overall job failure
      if (masterJobId !== -1) {
        await jobTrackingService.recordJobCompletion(
          masterJobId,
          'failed',
          error instanceof Error ? error.message : 'Unknown error'
        );
      }

      throw error;
    }
  }
}
