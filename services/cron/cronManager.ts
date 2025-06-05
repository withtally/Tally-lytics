// services/cron/cronManager.ts
import { CronJob } from 'cron';
import { Logger } from '../logging';
import { CrawlerManager } from '../crawling/crawlerManager';
import { forumConfigs } from '../../config/forumConfig';

export class CronManager {
  private crawlJob: CronJob | null = null;
  private isEnabled: boolean = false;
  private schedule: string = '0 */2 * * *'; // Every 2 hours
  private lastRunTime: Date | null = null;
  private executionTimeout: ReturnType<typeof setTimeout> | null = null;
  private retryCount: number = 0;
  private readonly MAX_RETRIES = 3;
  private readonly EXECUTION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private readonly RETRY_DELAY = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly crawlerManager: CrawlerManager,
    private readonly logger: Logger
  ) {}

  startScheduledCrawls(cronSchedule?: string) {
    if (this.crawlJob) {
      this.logger.info('Stopping existing cron job before starting new one');
      this.stopScheduledCrawls();
    }

    if (cronSchedule) {
      try {
        new CronJob(cronSchedule, () => {}); // Validate schedule
        this.schedule = cronSchedule;
      } catch (error: any) {
        this.logger.error('Invalid cron schedule:', error);
        throw new Error('Invalid cron schedule provided');
      }
    }

    this.isEnabled = true;
    this.retryCount = 0;

    this.crawlJob = new CronJob(
      this.schedule,
      async () => {
        this.lastRunTime = new Date();
        await this.executeCrawlWithTimeout();
      },
      null,
      true,
      'UTC',
      null,
      true
    );

    this.logger.info(`Scheduled crawls enabled with schedule: ${this.schedule}`);
  }

  private executeCrawlWithTimeout(): Promise<void> {
    if (this.executionTimeout) {
      clearTimeout(this.executionTimeout);
    }

    return new Promise<void>((resolve, reject) => {
      this.executionTimeout = setTimeout(() => {
        this.logger.error('Crawl execution timeout reached');
        this.handleExecutionFailure('Crawl execution timeout');
        reject(new Error('Crawl execution timeout'));
      }, this.EXECUTION_TIMEOUT);

      const executeTask = async () => {
        try {
          const runningForums = this.crawlerManager
            .getAllStatuses()
            .filter(status => status.status === 'running');

          if (runningForums.length > 0) {
            this.logger.info('Skipping scheduled crawl - crawl already in progress', {
              runningForums: runningForums.map(f => f.forumName),
            });
            resolve();
            return;
          }

          for (const config of forumConfigs) {
            try {
              await this.crawlerManager.startCrawl(config.name);
              this.logger.info(`Completed crawl for ${config.name}`);
            } catch (error: any) {
              this.logger.error(`Failed indexing for ${config.name}:`, error);
              // Continue with other forums even if one fails
            }
          }

          this.retryCount = 0; // Reset retry count on successful execution
          resolve();
        } catch (error: any) {
          this.logger.error('Error during scheduled crawl:', error);
          this.handleExecutionFailure(error instanceof Error ? error.message : 'Unknown error');
          reject(error);
        } finally {
          if (this.executionTimeout) {
            clearTimeout(this.executionTimeout);
            this.executionTimeout = null;
          }
        }
      };

      executeTask();
    });
  }

  private handleExecutionFailure(errorMessage: string) {
    this.retryCount++;
    if (this.retryCount >= this.MAX_RETRIES) {
      this.logger.error(
        `Max retries (${this.MAX_RETRIES}) reached. Disabling scheduled crawls. Error: ${errorMessage}`
      );
      this.stopScheduledCrawls();
    } else {
      this.logger.warn(
        `Scheduling retry ${this.retryCount} of ${this.MAX_RETRIES} in ${this.RETRY_DELAY / 1000} seconds`
      );
      setTimeout(() => this.executeCrawlWithTimeout(), this.RETRY_DELAY);
    }
  }

  stopScheduledCrawls() {
    if (this.crawlJob) {
      this.crawlJob.stop();
      this.crawlJob = null;
    }

    if (this.executionTimeout) {
      clearTimeout(this.executionTimeout);
      this.executionTimeout = null;
    }

    this.isEnabled = false;
    this.retryCount = 0;
    this.logger.info('Scheduled crawls disabled');
  }

  /**
   * Get next run date as string from cron job
   */
  private getNextRunDateString(job: CronJob): string | null {
    try {
      // The cron library's nextDates() method returns an array of Luxon DateTime objects
      const nextDates = job.nextDates(1);
      if (nextDates && nextDates.length > 0) {
        const nextDate = nextDates[0];
        // Convert Luxon DateTime to JS Date and then to string
        return nextDate.toJSDate().toString();
      }
    } catch (error) {
      this.logger.error(`Error getting next run date: ${error}`);
    }
    return null;
  }

  getStatus() {
    return {
      enabled: this.isEnabled,
      schedule: this.schedule,
      nextRun: this.crawlJob ? this.getNextRunDateString(this.crawlJob) : null,
      lastRun: this.lastRunTime?.toISOString() || null,
      isExecuting: this.executionTimeout !== null,
      retryCount: this.retryCount,
      maxRetries: this.MAX_RETRIES,
    };
  }
}
