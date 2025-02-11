import { evaluateTallyProposal } from './tallyEvaluationService';
import { TallyProposal } from '../tally/types';
import { withLLMErrorHandling } from '../errorHandling/llmErrors';

import db from '../../db/db';

export async function evaluateTallyProposals(forumName: string): Promise<void> {
  try {
    const proposals: TallyProposal[] = await db('tally_proposals')
      .leftJoin('tally_proposal_evaluations', function () {
        this.on('tally_proposals.id', '=', 'tally_proposal_evaluations.proposal_id').andOn(
          'tally_proposals.forum_name',
          '=',
          'tally_proposal_evaluations.forum_name'
        );
      })
      .where('tally_proposals.forum_name', forumName)
      .whereNull('tally_proposal_evaluations.proposal_id')
      .select('tally_proposals.*');

    for (const proposal of proposals) {
      const _evaluation = await withLLMErrorHandling(
        () => evaluateTallyProposal(proposal),
        `Tally Proposal ID: ${proposal.id}`
      );
    }
  } catch (error: any) {
    console.error('Error evaluating Tally proposals:', error);
  }
}
