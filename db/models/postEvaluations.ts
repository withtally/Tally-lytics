import type { _knex } from 'knex';
import { _config } from '../config';

import db from '../db';

import { PostEvaluation } from './types';

// db/models/postEvaluations.ts

export async function insertPostEvaluation(evaluation: PostEvaluation) {
  const evaluationToInsert = {
    ...evaluation,
    key_points: JSON.stringify(evaluation.key_points),
    tags: JSON.stringify(evaluation.tags),
  };

  return db('post_evaluations').insert(evaluationToInsert).returning('id');
}

export async function getPostEvaluation(
  id: number,
  forumName: string
): Promise<PostEvaluation | undefined> {
  const evaluation = await db('post_evaluations').where({ id, forum_name: forumName }).first();
  if (evaluation) {
    evaluation.key_points = JSON.parse(evaluation.key_points);
    evaluation.tags = JSON.parse(evaluation.tags);
  }
  return evaluation;
}

export async function getPostEvaluationsByPostId(
  postId: number,
  forumName: string
): Promise<PostEvaluation[]> {
  const evaluations = await db('post_evaluations').where({
    post_id: postId,
    forum_name: forumName,
  });
  return evaluations.map(evaluation => ({
    ...evaluation,
    key_points: JSON.parse(evaluation.key_points),
    tags: JSON.parse(evaluation.tags),
  }));
}

const _roundNumericFields = (_obj: any) => {
  // ... existing code ...
};
