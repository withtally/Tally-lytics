// services/crawling/crawlerManager.ts
// Updated to clear the heartbeat monitor after crawl completes or stops

import { Logger } from '../logging';
import { forumConfigs } from '../../config/forumConfig';
import { ForumCrawler } from './forumCrawler';
import { startSnapshotCrawl } from '../snapshotCrawler';
import { startTallyCrawl } from '../tallyCrawler';
import { evaluateTallyProposals } from '../llm/tallyProposalsService';
import { evaluateSnapshotProposals } from '../llm/snapshotProposalsService';
import { fetchAndSummarizeTopics, evaluateUnanalyzedTopics } from '../llm/topicsService';
import { evaluateUnanalyzedPostsInBatches } from '../llm/postService';
import { updateCrawlTime } from '../../utils/dbUtils';
import { evaluateUnevaluatedThreads } from '../llm/threadEvaluationService';

export type CrawlStatus = {
  forumName: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  lastError?: string;
  progress: {
    forum?: { total: number; processed: number };
    topics?: { total: number; processed: number };
    posts?: { total: number; processed: number };
    snapshot?: { total: number; processed: number };
    tally?: { total: number; processed: number };
    evaluations?: {
      topics: number;
      posts: number;
      threads: number;
    };
  };
};

// HeartbeatMonitor interface
interface HeartbeatMonitor {
  updateHeartbeat(forumName: string): void;
  isStalled(forumName: string): boolean;
  clear(forumName: string): void;
  getAllStalled(): string[];
}

export class CrawlerManager {
  private crawlStatuses: Map<string, CrawlStatus> = new Map();
  private activeCrawlers: Map<string, ForumCrawler> = new Map();
  private logger: Logger;
  private heartbeatMonitor: HeartbeatMonitor; // Added
  private progressIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(logger: Logger, heartbeatMonitor: HeartbeatMonitor) {
    this.logger = logger;
    this.heartbeatMonitor = heartbeatMonitor;
    this.initializeStatuses();
  }

  private initializeStatuses() {
    forumConfigs.forEach(config => {
      this.crawlStatuses.set(config.name, {
        forumName: config.name,
        status: 'idle',
        progress: {
          evaluations: {
            topics: 0,
            posts: 0,
            threads: 0,
          },
        },
      });
    });
  }

  public getAllStatuses(): CrawlStatus[] {
    return Array.from(this.crawlStatuses.values());
  }

  public getStatus(forumName: string): CrawlStatus | undefined {
    return this.crawlStatuses.get(forumName);
  }

  private updateStatus(forumName: string, updates: Partial<Omit<CrawlStatus, 'forumName'>>) {
    const currentStatus = this.crawlStatuses.get(forumName);
    if (currentStatus) {
      this.crawlStatuses.set(forumName, { ...currentStatus, ...updates });
      this.logger.info(`Crawler status updated for ${forumName}`, {
        status: this.crawlStatuses.get(forumName),
      });
    }
  }

  private async updateProgressCounts(forumName: string) {
    try {
      const db = require('../../db/db').default;

      // Get counts from database
      const [topicsCount, postsCount] = await Promise.all([
        db('topic_evaluations').where({ forum_name: forumName }).count('* as count').first(),
        db('post_evaluations').where({ forum_name: forumName }).count('* as count').first(),
      ]);

      // For now, threads count is 0 since we don't have thread evaluations
      const threadsCount = { count: 0 };

      this.updateStatus(forumName, {
        progress: {
          ...this.getStatus(forumName)?.progress,
          evaluations: {
            topics: topicsCount?.count || 0,
            posts: postsCount?.count || 0,
            threads: threadsCount?.count || 0,
          },
        },
      });
    } catch (error) {
      this.logger.debug(`Error updating progress counts for ${forumName}:`, error);
    }
  }

  private startProgressUpdates(forumName: string) {
    // Update progress every 10 seconds
    const interval = setInterval(() => {
      if (this.getStatus(forumName)?.status === 'running') {
        this.updateProgressCounts(forumName);
      } else {
        this.stopProgressUpdates(forumName);
      }
    }, 10000);

    this.progressIntervals.set(forumName, interval);
  }

  private stopProgressUpdates(forumName: string) {
    const interval = this.progressIntervals.get(forumName);
    if (interval) {
      clearInterval(interval);
      this.progressIntervals.delete(forumName);
    }
  }

  private async processContent(forumName: string): Promise<void> {
    try {
      this.logger.info(`Starting content processing for ${forumName}`);

      // Get counts before processing
      const db = require('../../db/db').default;

      // Summarize topics
      this.logger.info(`Starting topic summarization for ${forumName}`);
      await fetchAndSummarizeTopics(forumName);

      // Evaluate topics
      this.logger.info(`Starting topic evaluation for ${forumName}`);
      await evaluateUnanalyzedTopics(forumName);

      // Get actual count of evaluated topics
      const evaluatedTopicsCount = await db('topic_evaluations')
        .where({ forum_name: forumName })
        .count('* as count')
        .first();

      this.updateStatus(forumName, {
        progress: {
          ...this.getStatus(forumName)?.progress,
          evaluations: {
            topics: evaluatedTopicsCount?.count || 0,
            posts: this.getStatus(forumName)?.progress.evaluations?.posts || 0,
            threads: this.getStatus(forumName)?.progress.evaluations?.threads || 0,
          },
        },
      });

      // Evaluate posts
      this.logger.info(`Starting post evaluation for ${forumName}`);
      await evaluateUnanalyzedPostsInBatches(forumName);

      // Get actual count of evaluated posts
      const evaluatedPostsCount = await db('post_evaluations')
        .where({ forum_name: forumName })
        .count('* as count')
        .first();

      this.updateStatus(forumName, {
        progress: {
          ...this.getStatus(forumName)?.progress,
          evaluations: {
            topics: this.getStatus(forumName)?.progress.evaluations?.topics || 0,
            posts: evaluatedPostsCount?.count || 0,
            threads: this.getStatus(forumName)?.progress.evaluations?.threads || 0,
          },
        },
      });

      this.logger.info(`Content processing completed for ${forumName}`);
    } catch (error: any) {
      this.logger.error(`Error during content processing for ${forumName}:`, error);
      throw error;
    }
  }

  public async startCrawl(forumName: string): Promise<void> {
    const config = forumConfigs.find(c => c.name === forumName);
    if (!config) {
      throw new Error(`Forum configuration not found for ${forumName}`);
    }

    if (this.activeCrawlers.has(forumName)) {
      throw new Error(`Crawl already in progress for ${forumName}`);
    }

    this.updateStatus(forumName, {
      status: 'running',
      startTime: new Date(),
      lastError: undefined,
    });

    // Start periodic progress updates
    this.startProgressUpdates(forumName);

    try {
      // Start forum crawler
      const forumCrawler = new ForumCrawler(config);
      this.activeCrawlers.set(forumName, forumCrawler);

      await forumCrawler.start();
      await updateCrawlTime(forumName);

      // Update progress after forum crawl
      await this.updateProgressCounts(forumName);

      // Start token market data crawling if token config exists
      if (config.tokenConfig?.coingeckoId) {
        this.logger.info(`Starting token market data crawl for ${forumName}`);
        try {
          const { crawlTokenMarketDataForForum } = await import(
            '../marketCapTracking/tokenMarketDataCrawler'
          );
          await crawlTokenMarketDataForForum(forumName);
          this.logger.info(`Completed token market data crawl for ${forumName}`);
          // Update progress after market data crawl
          await this.updateProgressCounts(forumName);
        } catch (error: any) {
          this.logger.error(`Error during token market data crawl for ${forumName}:`, error);
          // Continue with other tasks even if token crawl fails
        }
      }

      // Start news/media mentions crawl
      this.logger.info(`Starting news/media mentions crawl for ${forumName}`);
      try {
        const { crawlNewsForForum } = await import('../newsAPICrawler/newsCrawler');
        const { crawlNewsArticleEvaluationsForForum } = await import(
          '../newsAPICrawler/newsArticleEvaluationCrawler'
        );

        await crawlNewsForForum(forumName);
        await crawlNewsArticleEvaluationsForForum(forumName);
        this.logger.info(`Completed news/media mentions crawl for ${forumName}`);
        // Update progress after news crawl
        await this.updateProgressCounts(forumName);
      } catch (error: any) {
        this.logger.error(`Error during news crawl for ${forumName}:`, error);
        // Continue with other tasks even if news crawl fails
      }

      // Process and evaluate forum content
      await this.processContent(forumName);

      // Evaluate entire threads
      this.logger.info(`Starting thread evaluation for ${forumName}`);
      await evaluateUnevaluatedThreads(forumName);

      // For now, we don't have thread_quality column, so threads count remains 0
      const evaluatedThreadsCount = { count: 0 };

      // Snapshot proposals (if configured)
      if (config.snapshotSpaceId) {
        this.logger.info(`Starting Snapshot crawl for ${forumName}`);
        await startSnapshotCrawl(config.snapshotSpaceId, forumName);
        this.logger.info(`Starting Snapshot Evaluation for ${forumName}`);
        await evaluateSnapshotProposals(forumName);
      }

      // Tally proposals (if configured)
      if (config.tallyConfig) {
        this.logger.info(`Starting Tally crawl for ${forumName}`);
        await startTallyCrawl(
          config.tallyConfig.apiKey,
          config.tallyConfig.organizationId,
          forumName
        );
        await evaluateTallyProposals(forumName);
      }

      // Update evaluations progress with actual counts
      this.updateStatus(forumName, {
        progress: {
          ...this.getStatus(forumName)?.progress,
          evaluations: {
            topics: this.getStatus(forumName)?.progress.evaluations?.topics || 0,
            posts: this.getStatus(forumName)?.progress.evaluations?.posts || 0,
            threads: evaluatedThreadsCount?.count || 0,
          },
        },
      });

      // On successful completion, clear the stall detector
      this.heartbeatMonitor.clear(forumName);

      this.updateStatus(forumName, {
        status: 'completed',
        endTime: new Date(),
      });
      this.logger.info(`Crawl completed successfully for ${forumName}`);
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Crawl failed for ${forumName}`, { error: errorMessage });
      this.updateStatus(forumName, {
        status: 'failed',
        endTime: new Date(),
        lastError: errorMessage,
      });
      throw error;
    } finally {
      // Stop progress updates
      this.stopProgressUpdates(forumName);

      const crawler = this.activeCrawlers.get(forumName);
      if (crawler) {
        await crawler.stop();
        this.activeCrawlers.delete(forumName);
      }
    }
  }

  public async stopCrawl(forumName: string): Promise<void> {
    const crawler = this.activeCrawlers.get(forumName);
    if (!crawler) {
      throw new Error(`No active crawl found for ${forumName}`);
    }

    await crawler.stop();
    this.activeCrawlers.delete(forumName);

    // Clear the stall detector on manual stop
    this.heartbeatMonitor.clear(forumName);

    this.updateStatus(forumName, {
      status: 'idle',
      endTime: new Date(),
      lastError: 'Crawl stopped by user',
    });

    this.logger.info(`Crawl stopped for ${forumName}`);
  }
}
