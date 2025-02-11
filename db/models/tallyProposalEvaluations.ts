import db from '../db';

export interface TallyProposalEvaluation {
  id?: number;
  proposal_id: string;
  summary: string;
  impact: string;
  pros_and_cons: string;
  risks_and_concerns: string;
  overall_assessment: string;
  forum_name: string;
  created_at?: Date;
  updated_at?: Date;
}

export async function insertTallyProposalEvaluation(evaluation: TallyProposalEvaluation) {
  return await db('tally_proposal_evaluations')
    .insert(evaluation)
    .onConflict(['proposal_id', 'forum_name']) // Update conflict constraint
    .merge();
}

export async function getTallyProposalEvaluation(
  proposal_id: string,
  forum_name: string
): Promise<TallyProposalEvaluation | undefined> {
  return await db('tally_proposal_evaluations').where({ proposal_id, forum_name }).first();
}
