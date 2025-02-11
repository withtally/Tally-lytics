// File: /Users/dennisonbertram/develop/discourse-demo/services/tally/databaseService.ts

import _knex, { Knex } from 'knex';
import { _DbConfig, Proposal } from './types';
import db from '../../db/db';

export class DatabaseService {
  private db: Knex;

  constructor(private _config: any) {
    this.db = db;
  }

  async insertProposal(proposal: Proposal, forumName: string): Promise<void> {
    const proposalToInsert = {
      ...proposal,
      forum_name: forumName,
      onchain_id: proposal.onchain_id,
      original_id: proposal.original_id,
      created_at: proposal.created_at,
      start_timestamp: proposal.start_timestamp,
      governor_id: proposal.governor_id,
      governor_name: proposal.governor_name,
      timelock_id: proposal.timelock_id,
      token_decimals: proposal.token_decimals,
      vote_stats: JSON.stringify(proposal.vote_stats),
    };

    await db('tally_proposals')
      .insert(proposalToInsert)
      .onConflict(['id', 'forum_name']) // Update conflict constraint
      .merge();
  }

  async updateProposal(proposal: Proposal, forumName: string): Promise<void> {
    await this.db('tally_proposals')
      .where({ id: proposal.id, forum_name: forumName })
      .update(proposal);
  }

  async getLastCrawlStatus(
    forumName: string
  ): Promise<{ last_proposal_id: string | null; last_crawl_timestamp: Date } | undefined> {
    return this.db('tally_crawl_status').where({ forum_name: forumName }).first();
  }

  async updateLastCrawlStatus(
    forumName: string,
    lastProposalId: string | null,
    lastCrawlTimestamp: Date
  ): Promise<void> {
    await this.db('tally_crawl_status')
      .insert({
        forum_name: forumName,
        last_proposal_id: lastProposalId,
        last_crawl_timestamp: lastCrawlTimestamp,
      })
      .onConflict('forum_name')
      .merge();
  }

  async getNonFinalStateProposals(forumName: string): Promise<Proposal[]> {
    return this.db('tally_proposals')
      .where({ forum_name: forumName })
      .whereNotIn('status', ['Canceled', 'Defeated', 'Expired', 'Executed']);
  }

  async insertProposalEvaluation(
    proposalId: string,
    evaluation: string,
    forumName: string
  ): Promise<void> {
    await this.db('tally_proposal_evaluations')
      .insert({
        proposal_id: proposalId,
        evaluation: evaluation,
        forum_name: forumName,
      })
      .onConflict('proposal_id')
      .merge();
  }
}
