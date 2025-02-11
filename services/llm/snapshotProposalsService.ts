// services/llm/snapshotProposalsService.ts

import _knex from 'knex';
import _config from '../../knexfile';
import { evaluateSnapshotProposal } from './snapshotEvaluationService';
import { Logger } from '../logging';

import { loggerConfig } from '../../config/loggerConfig';

import db from '../../db/db';

const logger = new Logger({
  ...loggerConfig,
  logFile: 'logs/evaluateSnapshotProposals.log',
});

export async function evaluateSnapshotProposals(forumName: string): Promise<void> {
  try {
    const proposals = await db('snapshot_proposals')
      .leftJoin('snapshot_proposal_evaluations', function () {
        this.on('snapshot_proposals.id', '=', 'snapshot_proposal_evaluations.proposal_id').andOn(
          'snapshot_proposals.forum_name',
          '=',
          'snapshot_proposal_evaluations.forum_name'
        );
      })
      .where('snapshot_proposals.forum_name', forumName)
      .whereNull('snapshot_proposal_evaluations.proposal_id')
      .select('snapshot_proposals.*');

    for (const proposal of proposals) {
      await evaluateSnapshotProposal(proposal, forumName);
      logger.info(`Evaluated Snapshot Proposal ID: ${proposal.id}`);
    }
  } catch (error: any) {
    logger.error(`Error evaluating Snapshot proposals:, ${JSON.stringify(error)}`);
  }
}
