import db from '../db';

export interface SnapshotProposalEvaluation {
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

export async function insertSnapshotProposalEvaluation(evaluation: SnapshotProposalEvaluation) {
  return await db('snapshot_proposal_evaluations')
    .insert(evaluation)
    .onConflict(['proposal_id', 'forum_name']) // Update conflict constraint
    .merge();
}

export async function getSnapshotProposalEvaluation(
  proposal_id: string,
  forum_name: string
): Promise<SnapshotProposalEvaluation | undefined> {
  return await db('snapshot_proposal_evaluations').where({ proposal_id, forum_name }).first();
}
