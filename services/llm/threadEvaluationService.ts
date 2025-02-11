import { Logger } from '../logging';
import { loggerConfig } from '../../config/loggerConfig';
import { evaluateTopicChunk } from './topicEvaluation';
import { insertTopicEvaluation } from '../../db/models/topicEvaluations';
import { vectorizeEvaluation } from './embeddings/evaluationVectorizer';
import { chunkText } from './topicsService';
import { TopicEvaluation } from './types';
import db from '../../db/db';

const MAX_TOKENS = 4000;
const CHUNK_TOKEN_LIMIT = MAX_TOKENS - 500;

const logger = new Logger({
  ...loggerConfig,
  logFile: 'logs/thread-evaluation.log',
});

export async function evaluateUnevaluatedThreads(forumName: string): Promise<void> {
  try {
    logger.info(`Starting thread evaluation for forum: ${forumName}`);

    const unevaluatedTopics = await db('topics as t')
      .leftJoin('topic_evaluations as te', function () {
        this.on('t.id', '=', 'te.topic_id').andOn('t.forum_name', '=', 'te.forum_name');
      })
      .whereNull('te.id')
      .where('t.forum_name', forumName)
      .select('t.id', 't.forum_name');

    logger.info(`Found ${unevaluatedTopics.length} unevaluated threads`);

    for (const topic of unevaluatedTopics) {
      await db.transaction(async trx => {
        try {
          // Double-check within transaction that no evaluation exists
          const existingEval = await trx('topic_evaluations')
            .where({
              topic_id: topic.id,
              forum_name: topic.forum_name,
            })
            .first();

          if (existingEval) {
            logger.info(`Topic ${topic.id} already has thread evaluation, skipping`);
            return;
          }

          // Get all posts for the thread in chronological order
          const posts = await trx('posts')
            .where({
              topic_id: topic.id,
              forum_name: topic.forum_name,
            })
            .orderBy('created_at')
            .select('plain_text');

          const threadText = posts.map(post => post.plain_text).join('\n\n');

          if (!threadText) {
            logger.warn(`Topic ${topic.id} has no content`);
            return;
          }

          // Process the thread in chunks
          const chunks = chunkText(threadText, CHUNK_TOKEN_LIMIT);
          const chunkEvaluations = [];

          for (const chunk of chunks) {
            const evaluation = await evaluateTopicChunk(chunk, topic.forum_name);
            if (evaluation) {
              chunkEvaluations.push(evaluation);
            }
          }

          if (chunkEvaluations.length === 0) {
            logger.warn(`No valid evaluations generated for topic ${topic.id}`);
            return;
          }

          // Aggregate evaluations
          const aggregatedEvaluation = aggregateEvaluations(chunkEvaluations);

          if (!aggregatedEvaluation) {
            logger.error(`Failed to aggregate evaluations for topic ${topic.id}`);
            return;
          }

          // Add required fields
          const fullEvaluation: TopicEvaluation = {
            ...aggregatedEvaluation,
            topic_id: topic.id,
            forum_name: topic.forum_name,
          };

          // Insert the evaluation and get the ID
          const evalIds = await insertTopicEvaluation(fullEvaluation);

          if (!evalIds || evalIds.length === 0) {
            throw new Error(`Failed to get ID for newly inserted evaluation of topic ${topic.id}`);
          }

          const evalId = evalIds[0].id; // Extract the numeric ID from the object

          if (typeof evalId !== 'number') {
            logger.error('Invalid evaluation ID type:', { evalId, type: typeof evalId });
            throw new Error(`Invalid evaluation ID type for topic ${topic.id}`);
          }

          // Create vector for the evaluation using the numeric ID
          await vectorizeEvaluation('topic', evalId, topic.forum_name);

          logger.info(`Successfully evaluated thread for topic ${topic.id}`);
        } catch (error: any) {
          logger.error(`Error evaluating thread for topic ${topic.id}:`, error);
          throw error;
        }
      });
    }

    logger.info(`Completed thread evaluation for forum: ${forumName}`);
  } catch (error: any) {
    logger.error('Error in evaluateUnevaluatedThreads:', error);
    throw error;
  }
}

function aggregateEvaluations(
  evaluations: TopicEvaluation[]
): Omit<TopicEvaluation, 'topic_id' | 'forum_name'> | null {
  if (!evaluations || evaluations.length === 0) {
    return null;
  }

  const numEvaluations = evaluations.length;

  const sumFields = {
    overall_quality: 0,
    helpfulness: 0,
    relevance: 0,
    unique_perspective: 0,
    logical_reasoning: 0,
    fact_based: 0,
    clarity: 0,
    constructiveness: 0,
    hostility: 0,
    emotional_tone: 0,
    engagement_potential: 0,
    persuasiveness: 0,
  };

  const dominantTopics: Record<string, number> = {};
  const keyPointsSet = new Set<string>();
  const tagsSet = new Set<string>();
  let suggestedImprovements = '';

  evaluations.forEach(evaluation => {
    Object.keys(sumFields).forEach(field => {
      sumFields[field] += evaluation[field] || 0;
    });

    if (evaluation.dominant_topic) {
      dominantTopics[evaluation.dominant_topic] =
        (dominantTopics[evaluation.dominant_topic] || 0) + 1;
    }

    if (Array.isArray(evaluation.key_points)) {
      evaluation.key_points.forEach(kp => keyPointsSet.add(kp));
    }
    if (Array.isArray(evaluation.tags)) {
      evaluation.tags.forEach(tag => tagsSet.add(tag));
    }
    if (evaluation.suggested_improvements) {
      suggestedImprovements += evaluation.suggested_improvements + '\n';
    }
  });

  const averagedFields = Object.entries(sumFields).reduce(
    (acc, [key, sum]) => ({
      ...acc,
      [key]: Math.round(sum / numEvaluations),
    }),
    {}
  );

  const dominantTopic =
    Object.entries(dominantTopics).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';

  return {
    llm_model: evaluations[0].llm_model,
    ...averagedFields,
    dominant_topic: dominantTopic,
    key_points: Array.from(keyPointsSet),
    suggested_improvements: suggestedImprovements.trim(),
    tags: Array.from(tagsSet),
  } as Omit<TopicEvaluation, 'topic_id' | 'forum_name'>;
}
