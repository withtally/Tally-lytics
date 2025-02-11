// File: /Users/dennisonbertram/develop/discourse-demo/services/tally/proposalUpdater.ts

import { EventEmitter } from 'events';
import { CrawlerConfig } from './types';
import { ApiService } from './apiService';
import { DatabaseService } from './databaseService';
import { Logger } from './logger';

export class TallyProposalUpdater extends EventEmitter {
  private apiService: ApiService;
  private dbService: DatabaseService;
  private logger: Logger;

  constructor(private config: CrawlerConfig) {
    super();
    this.apiService = new ApiService(config.apiConfig);
    this.dbService = new DatabaseService(config.dbConfig);
    this.logger = new Logger(config.logConfig);
  }

  async updateNonFinalStateProposals(forumName: string): Promise<void> {
    try {
      this.logger.info('Starting to update non-final state proposals');
      this.emit('start', 'Starting to update non-final state proposals');

      const nonFinalProposals = await this.dbService.getNonFinalStateProposals(forumName);
      this.logger.info(`Found ${nonFinalProposals.length} non-final state proposals to update`);

      for (const proposal of nonFinalProposals) {
        const updatedProposal = await this.apiService.fetchProposalById(
          proposal.onchainId,
          proposal.governorId
        );
        if (updatedProposal) {
          if (updatedProposal.status !== proposal.status) {
            await this.dbService.updateProposal(updatedProposal, forumName);
            this.logger.info(
              `Updated proposal: ${proposal.id}, new status: ${updatedProposal.status}`
            );
            this.emit(
              'proposalUpdated',
              `Updated proposal: ${proposal.id}, new status: ${updatedProposal.status}`
            );
          } else {
            this.logger.info(
              `No status change for proposal: ${proposal.id}, current status: ${proposal.status}`
            );
          }
        } else {
          this.logger.error(`Failed to fetch updated data for proposal: ${proposal.id}`);
        }
      }

      this.logger.info('Finished updating non-final state proposals');
      this.emit('done', 'Finished updating non-final state proposals');
    } catch (error: any) {
      this.handleError(error as Error, 'Error updating non-final state proposals');
    }
  }

  private handleError(error: Error, context: string = 'Error during updating proposals'): void {
    this.logger.error(`${context}: ${error.message}`);
    this.logger.error(`Stack trace: ${error.stack}`);
    this.emit('error', `${context}: ${error.message}`);
  }
}
