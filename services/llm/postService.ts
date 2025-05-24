import { insertPostEvaluation } from '../../db/models/postEvaluations';
import { estimateTokens } from '../../utils/tokenizer';
import { evaluatePostsBatch } from './postEvaluation';
import { vectorizeEvaluation } from './embeddings/evaluationVectorizer';
import db from '../../db/db';
import { Logger } from '../logging';
import { loggerConfig } from '../../config/loggerConfig';

const logger = new Logger({
  ...loggerConfig,
  logFile: 'logs/post-service.log',
});

const MAX_TOKENS = 4000;
const BATCH_TOKEN_LIMIT = MAX_TOKENS - 500;

function sanitizeTagName(name: string): string {
  return name.replace(/'/g, "''");
}

export async function evaluateUnanalyzedPostsInBatches(forumName: string): Promise<void> {
  try {
    // NEW VERSION - Main query with proper JOIN
    const unanalyzedPosts = await db('posts as p')
      .leftJoin('post_evaluations as pe', function () {
        this.on('p.id', '=', 'pe.post_id').andOn('p.forum_name', '=', 'pe.forum_name');
      })
      .whereNull('pe.id') // Only get posts without evaluations
      .where('p.forum_name', forumName)
      .select('p.id', 'p.plain_text')
      .orderBy('p.id');

    let batch = [];
    let batchTokens = 0;

    for (const post of unanalyzedPosts) {
      const postTokens = estimateTokens(post.plain_text);

      if (batchTokens + postTokens > BATCH_TOKEN_LIMIT && batch.length > 0) {
        await processBatch(batch, forumName);
        batch = [];
        batchTokens = 0;
      }

      batch.push(post);
      batchTokens += postTokens;
    }

    if (batch.length > 0) {
      await processBatch(batch, forumName);
    }
  } catch (error: any) {
    logger.error('Error during batch post evaluation:', error);
    throw error;
  }
}

export async function processBatch(batch: any[], forumName: string) {
  await db.transaction(async trx => {
    try {
      // Check all posts in batch at once
      const existingEvaluations = await trx('post_evaluations')
        .whereIn(
          'post_id',
          batch.map(post => post.id)
        )
        .andWhere('forum_name', forumName)
        .select('post_id');

      const existingPostIds = new Set(existingEvaluations.map(element => element.post_id));

      // Filter out any posts that got evaluated in the meantime
      const postsToProcess = batch.filter(post => !existingPostIds.has(post.id));

      if (postsToProcess.length === 0) {
        return;
      }

      const postContents = postsToProcess.map(post => post.plain_text);
      const evaluations = await evaluatePostsBatch(postContents, forumName);

      if (evaluations === null) {
        logger.warn('Skipping batch due to insufficient LLM credits');
        return;
      }

      for (let i = 0; i < evaluations.length; i++) {
        const evaluation = evaluations[i];
        const post = postsToProcess[i];
        if (!post) {
          logger.error(`No corresponding post found for evaluation at index ${i}`);
          continue;
        }

        // Double-check for existing evaluation
        // In processBatch function, update the existing evaluation check:
        const existingEval = await trx('post_evaluations')
          .where({
            post_id: post.id,
            forum_name: forumName,
          })
          .first();

        if (existingEval) {
          logger.debug(`Skipping already evaluated post ${post.id}`);
          continue;
        }

        evaluation.post_id = post.id;
        evaluation.forum_name = forumName;

        // Format arrays properly
        evaluation.key_points = Array.isArray(evaluation.key_points)
          ? evaluation.key_points
          : [evaluation.key_points].filter(Boolean);

        evaluation.tags = Array.isArray(evaluation.tags)
          ? evaluation.tags
          : evaluation.tags
            ? [evaluation.tags]
            : [];

        const evalIds = await insertPostEvaluation(evaluation);

        if (!evalIds || evalIds.length === 0) {
          throw new Error(`Failed to get ID for newly inserted evaluation of post ${post.id}`);
        }

        const evalId = evalIds[0]?.id;

        if (!evalId) {
          throw new Error(`Failed to get ID for newly inserted evaluation of post ${post.id}`);
        }

        // Create vector for the evaluation
        await vectorizeEvaluation('post', evalId, forumName);

        // Process tags more efficiently
        if (evaluation.tags && evaluation.tags.length > 0) {
          // First, ensure all tags exist (batch insert)
          const uniqueTags = [
            ...new Set(evaluation.tags.map(t => t.toUpperCase()).map(tag => sanitizeTagName(tag))),
          ];

          // Insert all tags in one query
          await trx.raw(
            `INSERT INTO tags (name)
     VALUES ${uniqueTags.map(tag => `('${tag}')`).join(',')}
     ON CONFLICT (name) DO NOTHING`
          );

          // Get all tag IDs in one query
          const tags = await trx('tags').whereIn('name', uniqueTags).select('id', 'name');

          // Create tag associations in one query
          if (tags.length > 0) {
            await trx.raw(
              `INSERT INTO post_tags (post_id, forum_name, tag_id)
       VALUES ${tags.map(tag => `(${post.id}, '${forumName}', ${tag.id})`).join(',')}
       ON CONFLICT (post_id, forum_name, tag_id) DO NOTHING`
            );
          }
        }

        // Update post last_analyzed timestamp
        await trx('posts')
          .where({ id: post.id, forum_name: forumName })
          .update({ last_analyzed: trx.fn.now() });

        logger.debug(`Post ${post.id} evaluated, vectorized, and tags processed`);
      }
    } catch (error: any) {
      logger.error('Error in batch processing:', error);
      throw error;
    }
  });
}
