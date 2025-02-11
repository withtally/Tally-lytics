// services/snapshot/index.ts
import { EventEmitter } from 'events';
import { GraphQLClient } from 'graphql-request';
import { RateLimiter } from 'limiter';
import { Logger } from '../logging';
import { loggerConfig } from '../../config/loggerConfig';
import db from '../../db/db';
import { handleGlobalError } from '../errorHandling/globalErrorHandler';

export interface SnapshotProposal {
  id: string;
  forum_name: string;
  title: string;
  body: string;
  choices: string[];
  start: number;
  end: number;
  snapshot: string;
  state: string;
  author: string;
  space: {
    id: string;
    name: string;
  };
  scores: number[];
  scores_total: number;
}

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
    try {
      this.logger.info(`Starting to crawl Snapshot space: ${this.spaceId}`);
      this.emit('start', `Starting to crawl Snapshot space: ${this.spaceId}`);

      const { lastTimestamp } = await this.getLastCrawlInfo(this.spaceId);

      let skip = 0;
      let hasMore = true;
      let newestTimestamp = lastTimestamp.getTime();

      while (hasMore) {
        this.resetProcessingTimeout();
        const batch = await this.fetchProposals(skip);

        if (batch.length === 0) {
          this.logger.info('No more proposals found');
          break;
        }

        batch.forEach(p => {
          newestTimestamp = Math.max(newestTimestamp, p.start);
        });

        const newProposals = batch.filter(p => p.start * 1000 > lastTimestamp.getTime());

        if (newProposals.length === 0) {
          this.logger.info('No new proposals in this batch');
          break;
        }

        await this.processProposalsBatch(newProposals);

        if (batch.length < this.batchSize) {
          hasMore = false;
        } else {
          skip += this.batchSize;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (newestTimestamp > lastTimestamp.getTime()) {
        await this.updateLastCrawlInfo(this.spaceId);
      }

      this.logger.info(`Finished crawling Snapshot space: ${this.spaceId}`);
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
    const _url = 'https://hub.snapshot.org/graphql';
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
    const variables = { spaceId: this.spaceId, first: this.batchSize, skip };
    try {
      // Direct use graphql client (no requestWithRetry), but if fails:
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const data: any = await this.client.request(query, variables);
          return data?.proposals || [];
        } catch (error: any) {
          if (attempt < 3) {
            await new Promise(res => setTimeout(res, Math.pow(2, attempt) * 1000));
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

  private async getLastCrawlInfo(spaceId: string): Promise<{ lastTimestamp: Date }> {
    const result = await db('snapshot_crawl_status').where({ space_id: spaceId }).first();
    return {
      lastTimestamp: result ? new Date(result.last_crawl_timestamp) : new Date(0),
    };
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
    for (let i = 0; i < proposals.length; i += batchSize) {
      const batch = proposals.slice(i, i + batchSize);
      try {
        await db.transaction(async trx => {
          for (const proposal of batch) {
            const proposalToInsert = {
              id: proposal.id,
              title: proposal.title,
              body: proposal.body,
              choices: JSON.stringify(proposal.choices),
              start: new Date(proposal.start * 1000),
              end: new Date(proposal.end * 1000),
              snapshot: proposal.snapshot,
              state: proposal.state,
              author: proposal.author,
              space_id: proposal.space.id,
              space_name: proposal.space.name,
              scores: JSON.stringify(proposal.scores),
              scores_total: proposal.scores_total?.toString() || '0',
              forum_name: this.forumName,
            };

            await trx('snapshot_proposals')
              .insert(proposalToInsert)
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
