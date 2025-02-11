// services/llm/embeddings/evaluationVectorizer.ts
import { generateEmbeddings } from './embeddingService';
import db from '../../../db/db';
import { Logger } from '../../logging';
import { loggerConfig } from '../../../config/loggerConfig';

const logger = new Logger({
  ...loggerConfig,
  logFile: 'logs/evaluation-vectorization.log',
});

export async function vectorizeEvaluation(
  type: 'post' | 'topic',
  evaluationId: number,
  forumName: string,
  retryCount = 3
): Promise<void> {
  try {
    // Get the evaluation content
    const tableName = `${type}_evaluations`;
    const vectorTableName = `${type}_evaluation_vectors`;

    // Ensure evaluationId is a number
    const numericEvaluationId = Number(evaluationId);
    if (isNaN(numericEvaluationId)) {
      throw new Error(`Invalid evaluation ID: ${evaluationId}`);
    }

    const evaluation = await db(tableName)
      .where({
        id: numericEvaluationId,
        forum_name: forumName,
      })
      .first();

    if (!evaluation) {
      logger.warn(`No ${type} evaluation found for ID ${numericEvaluationId}`);
      return;
    }

    // Parse JSON fields if they're strings
    const keyPoints =
      typeof evaluation.key_points === 'string'
        ? JSON.parse(evaluation.key_points || '[]')
        : evaluation.key_points || [];

    const tags =
      typeof evaluation.tags === 'string'
        ? JSON.parse(evaluation.tags || '[]')
        : evaluation.tags || [];

    // Combine relevant fields for vectorization
    const contentToVectorize = [
      evaluation.dominant_topic,
      evaluation.suggested_improvements,
      ...keyPoints,
      ...tags,
    ]
      .filter(Boolean)
      .join('\n');

    if (!contentToVectorize) {
      logger.warn(`No content to vectorize for ${type} evaluation ${numericEvaluationId}`);
      return;
    }

    // Generate embedding
    const [embedding] = await generateEmbeddings([contentToVectorize]);

    if (!embedding || embedding.length !== 1536) {
      throw new Error(`Invalid embedding generated for ${type} evaluation ${numericEvaluationId}`);
    }

    // Insert or update the vector using proper PostgreSQL syntax
    await db.raw(
      `INSERT INTO ${vectorTableName} (evaluation_id, forum_name, vector)
         VALUES (?, ?, ?::vector(1536))
         ON CONFLICT (evaluation_id, forum_name)
         DO UPDATE SET vector = EXCLUDED.vector`,
      [numericEvaluationId, forumName, `[${embedding.join(',')}]`]
    );

    logger.info(`Vectorized ${type} evaluation ${numericEvaluationId}`);
  } catch (error: any) {
    if (retryCount > 0) {
      logger.warn(
        `Retrying vectorization for ${type} evaluation ${evaluationId}, ${retryCount} attempts remaining`
      );
      await new Promise(resolve => setTimeout(resolve, 1000));
      return vectorizeEvaluation(type, evaluationId, forumName, retryCount - 1);
    }
    logger.error(`Failed to vectorize ${type} evaluation ${evaluationId}: ${error.message}`);
    throw error;
  }
}
