// services/snapshot/index.ts
import { EventEmitter } from 'events';
import { GraphQLClient } from 'graphql-request';
import { RateLimiter } from 'limiter';
import { Logger } from '../logging';
import { loggerConfig } from '../../config/loggerConfig';
import db from '../../db/db';
import { handleGlobalError } from '../errorHandling/globalErrorHandler';
import {
  SnapshotProposal,
  CrawlInfo,
  filterNewProposals,
  getNewestTimestamp,
  transformProposalsBatch,
  createBatches,
  shouldContinuePagination,
  validateAndFilterProposals,
  createGraphQLVariables,
  calculateRetryDelay,
  createDefaultCrawlInfo,
  formatProposalForLog,
  calculateCrawlingStats,
  sanitizeProposal,
} from './snapshotUtils';

// Re-export for backward compatibility
export { SnapshotProposal } from './snapshotUtils';

export class SnapshotCrawler extends EventEmitter {
  private client: GraphQLClient;
  private batchSize: number = 1000;
  private rateLimiter: RateLimiter;
  private logger: Logger;
  private readonly PROCESSING_TIMEOUT = 10 * 60 * 1000; // 10 min
  private processingTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private spaceId: string,
    private forumName: string
  ) {
    super();
    this.client = new GraphQLClient('https://hub.snapshot.org/graphql');
    this.rateLimiter = new RateLimiter({ tokensPerInterval: 5, interval: 'second' });
    this.logger = new Logger({
      ...loggerConfig,
      logFile: 'logs/snapshot-crawler.log',
    });
  }

  private resetProcessingTimeout() {
    if (this.processingTimeout) {
      clearTimeout(this.processingTimeout);
    }
    this.processingTimeout = setTimeout(() => {
      this.logger.error('Processing timeout reached - possible stall in snapshot crawling');
      this.emit('error', 'Processing timeout reached');
    }, this.PROCESSING_TIMEOUT);
  }

  async crawlSnapshotSpace(): Promise<void> {
    const startTime = new Date();
    let totalFetched = 0;
    let totalNewProposals = 0;

    try {
      this.logger.info(`Starting to crawl Snapshot space: ${this.spaceId}`);
      this.emit('start', `Starting to crawl Snapshot space: ${this.spaceId}`);

      const { lastTimestamp } = await this.getLastCrawlInfo(this.spaceId);

      let skip = 0;
      let hasMore = true;
      let newestTimestamp = lastTimestamp.getTime();

      while (hasMore) {
        this.resetProcessingTimeout();
        const rawBatch = await this.fetchProposals(skip);

        if (rawBatch.length === 0) {
          this.logger.info('No more proposals found');
          break;
        }

        // Validate and sanitize the batch
        const batch = validateAndFilterProposals(rawBatch).map(sanitizeProposal);
        totalFetched += batch.length;

        // Update newest timestamp using utility function
        newestTimestamp = getNewestTimestamp(batch, newestTimestamp);

        // Filter new proposals using utility function
        const newProposals = filterNewProposals(batch, lastTimestamp);

        if (newProposals.length === 0) {
          this.logger.info('No new proposals in this batch');
          break;
        }

        totalNewProposals += newProposals.length;
        this.logger.info(`Processing ${newProposals.length} new proposals`);

        await this.processProposalsBatch(newProposals);

        // Determine if we should continue using utility function
        hasMore = shouldContinuePagination(batch.length, this.batchSize, newProposals.length > 0);

        if (hasMore) {
          skip += this.batchSize;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (newestTimestamp > lastTimestamp.getTime()) {
        await this.updateLastCrawlInfo(this.spaceId);
      }

      // Log crawling statistics
      const stats = calculateCrawlingStats(totalFetched, totalNewProposals, startTime);
      this.logger.info(
        `Finished crawling Snapshot space: ${this.spaceId}. ` +
          `Fetched: ${stats.totalFetched}, New: ${stats.newProposals}, ` +
          `Duration: ${(stats.duration / 1000).toFixed(1)}s, ` +
          `Rate: ${stats.rate.toFixed(1)} items/s`
      );

      this.emit('done', `Finished crawling Snapshot space: ${this.spaceId}`);
    } catch (error: any) {
      handleGlobalError(error, 'crawlSnapshotSpace');
      this.emit(
        'error',
        `Error crawling Snapshot space: ${error instanceof Error ? error.message : 'unknown'}`
      );
    }
  }

  private async fetchProposals(skip: number): Promise<SnapshotProposal[]> {
    await this.rateLimiter.removeTokens(1);
    const query = `
      query ($spaceId: String!, $first: Int!, $skip: Int!) {
        proposals(
          first: $first,
          skip: $skip,
          where: { space: $spaceId },
          orderBy: "created",
          orderDirection: desc
        ) {
          id
          title
          body
          choices
          start
          end
          snapshot
          state
          author
          space {
            id
            name
          }
          scores
          scores_total
        }
      }
    `;

    // Use utility function to create variables
    const variables = createGraphQLVariables(this.spaceId, this.batchSize, skip);

    try {
      // Direct use graphql client with retry logic
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const data: any = await this.client.request(query, variables);
          return data?.proposals || [];
        } catch (error: any) {
          if (attempt < 3) {
            const delay = calculateRetryDelay(attempt);
            await new Promise(res => setTimeout(res, delay));
            continue;
          }
          handleGlobalError(error, 'fetchProposals(Snapshot)');
          return [];
        }
      }
      return [];
    } catch (error: any) {
      handleGlobalError(error, 'fetchProposals(Snapshot outer)');
      return [];
    }
  }

  private async getLastCrawlInfo(spaceId: string): Promise<CrawlInfo> {
    const result = await db('snapshot_crawl_status').where({ space_id: spaceId }).first();
    return result
      ? { lastTimestamp: new Date(result.last_crawl_timestamp) }
      : createDefaultCrawlInfo();
  }

  private async updateLastCrawlInfo(spaceId: string): Promise<void> {
    await db('snapshot_crawl_status')
      .insert({
        space_id: spaceId,
        last_crawl_timestamp: new Date(),
      })
      .onConflict('space_id')
      .merge();
  }

  private async processProposalsBatch(proposals: SnapshotProposal[]): Promise<void> {
    const batchSize = 30;

    // Transform proposals to database format using utility function
    const dbProposals = transformProposalsBatch(proposals, this.forumName);

    // Create batches using utility function
    const batches = createBatches(dbProposals, batchSize);

    for (const batch of batches) {
      try {
        await db.transaction(async trx => {
          for (const proposal of batch) {
            this.logger.debug(
              `Inserting proposal: ${formatProposalForLog(proposals.find(p => p.id === proposal.id)!)}`
            );

            await trx('snapshot_proposals')
              .insert(proposal)
              .onConflict(['id', 'forum_name'])
              .merge();
          }
        });
      } catch (error: any) {
        handleGlobalError(error, 'processProposalsBatch(Snapshot)');
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}
