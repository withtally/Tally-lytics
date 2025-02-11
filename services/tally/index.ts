import { EventEmitter } from 'events';
import { CrawlerConfig } from './types';
import { ApiService } from './apiService';
import { DatabaseService } from './databaseService';
import { Logger } from '../logging';
import { loggerConfig } from '../../config/loggerConfig';

import db from '../../db/db';

interface VoteStat {
  votesCount: number;
  votersCount: number;
  percent: number;
  type: string;
}

interface TallyProposal {
  id: string;
  forum_name: string;
  onchain_id: string;
  original_id: string;
  status: string;
  created_at: string;
  description: string;
  title: string;
  start_timestamp?: string;
  governor_id: string;
  governor_name: string;
  quorum: number;
  timelock_id: string;
  token_decimals: number;
  vote_stats: VoteStat[];
}

interface _ProcessedProposal extends Omit<TallyProposal, 'vote_stats'> {
  vote_stats: string | null; // JSON stringified vote stats
}

const _FINAL_STATES = ['Canceled', 'Defeated', 'Expired', 'Executed'];

export class TallyCrawler extends EventEmitter {
  private apiService: ApiService;
  private dbService: DatabaseService;
  private logger: Logger;

  constructor(private config: CrawlerConfig) {
    super();
    this.apiService = new ApiService(config.apiConfig);
    this.dbService = new DatabaseService(config.dbConfig);
    this.logger = new Logger({
      ...loggerConfig,
      logFile: 'logs/tally-crawler.log',
    });
  }

  private async getLastCrawlInfo(
    forumName: string
  ): Promise<{ lastProposalId: string | null; lastTimestamp: Date }> {
    const status = await db('tally_crawl_status').where({ forum_name: forumName }).first();

    if (!status) {
      return {
        lastProposalId: null,
        lastTimestamp: new Date(0), // Unix epoch if no previous crawl
      };
    }

    return {
      lastProposalId: status.last_proposal_id,
      lastTimestamp: new Date(status.last_crawl_timestamp),
    };
  }

  private async updateLastCrawlInfo(forumName: string, lastProposalId: string): Promise<void> {
    await db('tally_crawl_status')
      .insert({
        forum_name: forumName,
        last_proposal_id: lastProposalId,
        last_crawl_timestamp: new Date(),
      })
      .onConflict('forum_name')
      .merge();
  }

  async crawlProposals(forumName: string): Promise<void> {
    try {
      this.logger.info(
        `Starting to crawl Tally proposals for organization: ${this.config.organizationId}`
      );
      this.emit(
        'start',
        `Starting to crawl Tally proposals for organization: ${this.config.organizationId}`
      );

      const { lastProposalId, lastTimestamp } = await this.getLastCrawlInfo(forumName);
      let afterCursor = '';
      let newestProposalId = lastProposalId;
      let hasNewProposals = false;
      let hasMorePages = true;

      while (hasMorePages) {
        try {
          const { proposals, endCursor } = await this.apiService.fetchProposals(
            this.config.organizationId,
            afterCursor
          );

          if (proposals.length === 0) {
            this.logger.info('No more proposals found');
            hasMorePages = false;
            break;
          }

          // Filter out proposals we've already seen
          const newProposals = proposals.filter(proposal => {
            const proposalDate = new Date(proposal.created_at);
            return proposalDate > lastTimestamp;
          });

          if (newProposals.length === 0) {
            this.logger.info('No new proposals in this batch');
            hasMorePages = false;
            break;
          }

          // Update newest proposal ID if needed
          if (!newestProposalId && newProposals.length > 0) {
            newestProposalId = newProposals[0].id;
          }

          // Process the new proposals
          await this.processProposalsBatch(newProposals, forumName);
          hasNewProposals = true;

          if (proposals.length < 20) {
            // Assuming page size of 20
            this.logger.info('Last page reached based on proposal count');
            hasMorePages = false;
            break;
          }

          if (afterCursor === endCursor) {
            this.logger.info('No more pages to fetch');
            hasMorePages = false;
            break;
          }

          afterCursor = endCursor;
          await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
        } catch (error: any) {
          this.logger.error(`Error fetching proposals: ${error.message}`);
          if (error.response?.status === 429) {
            await new Promise(resolve => setTimeout(resolve, 60000)); // Wait longer on rate limit
            continue;
          }
          throw error;
        }
      }

      // Update the crawl status only if we found new proposals
      if (hasNewProposals && newestProposalId) {
        await this.updateLastCrawlInfo(forumName, newestProposalId);
        this.logger.info(`Updated last crawl status with proposal ID: ${newestProposalId}`);
      }

      this.logger.info('Finished crawling Tally proposals');
      this.emit('done', 'Finished crawling Tally proposals');
    } catch (error: any) {
      this.handleError(error as Error);
    }
  }

  private async processProposalsBatch(proposals: any[], forumName: string): Promise<void> {
    // Process in smaller batches of 10
    const batchSize = 30;
    for (let i = 0; i < proposals.length; i += batchSize) {
      const batch = proposals.slice(i, i + batchSize);
      console.log(`\nProcessing batch ${i / batchSize + 1}, size: ${batch.length}`);

      await db.transaction(async trx => {
        try {
          for (const proposal of batch) {
            const processedProposal = {
              id: proposal.id,
              forum_name: forumName,
              onchain_id: proposal.onchain_id,
              original_id: proposal.original_id,
              status: proposal.status,
              created_at: proposal.created_at,
              description: proposal.description,
              title: proposal.title,
              start_timestamp: proposal.start_timestamp,
              governor_id: proposal.governor_id,
              governor_name: proposal.governor_name,
              quorum: proposal.quorum,
              timelock_id: proposal.timelock_id,
              token_decimals: proposal.token_decimals,
              vote_stats: proposal.vote_stats ? JSON.stringify(proposal.vote_stats) : null,
            };

            // Insert/update proposal
            await trx('tally_proposals')
              .insert(processedProposal)
              .onConflict(['id', 'forum_name'])
              .merge();
          }

          // Explicitly commit this batch
          await trx.commit();
        } catch (error: any) {
          console.error(`Error in batch ${i / batchSize + 1}:`, error);
          await trx.rollback();
          throw error;
        }

        this.emit('proposalsProcessed', `Processed ${proposals.length} proposals`);
      });
    }
  }

  private handleError(error: Error): void {
    this.logger.error(`Error during crawling: ${error.message}`);
    this.emit('error', `Error during crawling: ${error.message}`);
  }
}
