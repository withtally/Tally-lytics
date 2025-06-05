// services/cron/tasks/CrawlAllForumsTask.ts
import { BaseCronTask } from '../CronTask';
import { CrawlerManager } from '../../crawling/crawlerManager';
import { forumConfigs } from '../../../config/forumConfig';
import { Logger } from '../../logging';

/**
 * Task that crawls all configured forums
 */
export class CrawlAllForumsTask extends BaseCronTask {
  name = 'crawl_all_forums';
  description = 'Crawls all configured forums for new data';
  defaultSchedule = '0 */2 * * *'; // Every 2 hours

  constructor(
    private readonly crawlerManager: CrawlerManager,
    logger: Logger
  ) {
    super(logger);
  }

  async canRun(): Promise<boolean> {
    // Check if any crawls are already running
    const runningForums = this.crawlerManager
      .getAllStatuses()
      .filter(status => status.status === 'running');

    if (runningForums.length > 0) {
      this.logInfo('Skipping crawl - already in progress', {
        runningForums: runningForums.map(f => f.forumName),
      });
      return false;
    }

    return true;
  }

  async getStatus(): Promise<Record<string, any>> {
    const statuses = this.crawlerManager.getAllStatuses();
    return {
      forums: statuses.map(status => ({
        name: status.forumName,
        status: status.status,
        lastRun: status.endTime,
        progress: status.progress,
      })),
    };
  }

  async execute(): Promise<void> {
    this.logInfo('Starting crawl for all forums');

    const results: Record<string, string> = {};

    for (const config of forumConfigs) {
      try {
        this.logInfo(`Starting crawl for ${config.name}`);
        await this.crawlerManager.startCrawl(config.name);
        results[config.name] = 'success';
        this.logInfo(`Completed crawl for ${config.name}`);
      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results[config.name] = `error: ${errorMessage}`;
        this.logError(`Failed crawl for ${config.name}`, error);
        // Continue with other forums even if one fails
      }
    }

    this.logInfo('Completed crawl for all forums', { results });
  }
}
