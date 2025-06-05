import { CronJob } from 'cron';
import { Logger } from '../logging';
import { commonTopicsService } from '../topics/commonTopicsService';
import db from '../../db/db';
import { LoggingConfig } from '../logging/types';
import { forumConfigs } from '../../config/forumConfig';

const logger = new Logger({
  logFile: 'logs/common-topics-cron.log',
  level: 'info',
} as LoggingConfig);

export class CommonTopicsCron {
  private job: CronJob;
  private timeframe: string;

  /**
   * @param {string} schedule - Cron schedule expression (default: '0 0 * * *' - daily at midnight)
   * @param {string} timeframe - Time range in PostgreSQL interval format (e.g., '7d', '2 weeks', '1 month')
   */
  constructor(schedule = '0 0 * * *', timeframe = '14d') {
    // Default: Run daily at midnight
    this.timeframe = timeframe;

    try {
      this.job = new CronJob(
        schedule,
        async () => {
          try {
            await this.execute();
          } catch (error) {
            logger.error('Uncaught error in common topics cron job execution:', error as Error);
            // Continue running - don't let one failure stop future executions
          }
        },
        null,
        true,
        'UTC'
      );
      logger.info(`Common topics cron job initialized with schedule: ${schedule}`);
    } catch (error) {
      logger.error('Failed to initialize common topics cron job:', error as Error);
      throw new Error(
        `Failed to initialize cron job: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async checkTablesExist(): Promise<boolean> {
    try {
      const tables = ['posts', 'common_topics', 'search_log'];
      for (const table of tables) {
        const exists = await db.schema.hasTable(table);
        if (!exists) {
          logger.warn(`Required table ${table} does not exist yet`);
          return false;
        }
      }
      return true;
    } catch (error) {
      logger.error('Error checking tables:', error as Error);
      return false;
    }
  }

  private async execute() {
    logger.info('Starting common topics generation');
    try {
      const tablesExist = await this.checkTablesExist();
      if (!tablesExist) {
        logger.info('Skipping common topics generation - required tables do not exist yet');
        return;
      }

      // Process search logs first
      logger.info('Generating topics from search logs');
      await commonTopicsService.generateCommonTopicsFromSearchLogs(this.timeframe);

      // Process each configured forum
      const forums = Object.keys(forumConfigs);
      logger.info(`Generating topics for ${forums.length} forums`);

      for (const forum of forums) {
        try {
          logger.info(`Generating topics for forum: ${forum}`);
          await commonTopicsService.generateCommonTopics(forum, this.timeframe);
          logger.info(`Completed topic generation for forum: ${forum}`);
        } catch (error) {
          logger.error(`Error generating topics for forum ${forum}:`, error as Error);
          // Continue with next forum even if one fails
          continue;
        }
      }

      logger.info('Completed common topics generation for all forums');
    } catch (error) {
      logger.error('Error in common topics cron job:', error as Error);
    }
  }

  start() {
    if (!this.job.running) {
      this.job.start();
      logger.info('Common topics cron job started');
    }
  }

  stop() {
    if (this.job.running) {
      this.job.stop();
      logger.info('Common topics cron job stopped');
    }
  }
}
