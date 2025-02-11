import db from '../db';

import { TopicEvaluation } from './types';

export async function insertTopicEvaluation(evaluation: TopicEvaluation) {
  const evaluationToInsert = {
    ...evaluation,
    key_points: JSON.stringify(evaluation.key_points),
    tags: JSON.stringify(evaluation.tags),
  };

  return db('topic_evaluations').insert(evaluationToInsert).returning('id');
}

export async function getTopicEvaluation(
  id: number,
  forumName: string
): Promise<TopicEvaluation | undefined> {
  const evaluation = await db('topic_evaluations').where({ id, forum_name: forumName }).first();
  if (evaluation) {
    evaluation.key_points = JSON.parse(evaluation.key_points);
    evaluation.tags = JSON.parse(evaluation.tags);
  }
  return evaluation;
}

export async function getTopicEvaluationsByTopicId(
  topicId: number,
  forumName: string
): Promise<TopicEvaluation[]> {
  const evaluations = await db('topic_evaluations').where({
    topic_id: topicId,
    forum_name: forumName,
  });
  return evaluations.map(evaluation => ({
    ...evaluation,
    key_points: JSON.parse(evaluation.key_points),
    tags: JSON.parse(evaluation.tags),
  }));
}
