// processRecentPosts.ts

import { Logger } from './services/logging';
import { loggerConfig } from './config/loggerConfig';
import db from './db/db';
import { Post } from './db/models/types';
import { chunk } from 'lodash';
import { openai, model } from './services/llm/openaiClient';
import { zodResponseFormat } from 'openai/helpers/zod';
import { BatchEvaluationSchema } from './services/llm/schema';
import { sanitizeContent } from './services/llm/contentProcessorService';
import { withLLMErrorHandling } from './services/errorHandling/llmErrors';
import { roundNumericFields } from './utils/numberUtils';
import { systemPostPrompt } from './services/llm/prompt';

const logger = new Logger({
  ...loggerConfig,
  logFile: 'logs/process-recent-posts.log',
});

async function processRecentPosts(
  forumName: string,
  batchSize: number = 100,
  maxBatches?: number
): Promise<void> {
  try {
    logger.info(`Starting processing of recent posts for ${forumName}`);

    const unevaluatedPosts = await db('posts as p')
      .leftJoin('post_evaluations as pe', function () {
        this.on('p.id', '=', 'pe.post_id').andOn('p.forum_name', '=', 'pe.forum_name');
      })
      .where('p.forum_name', forumName)
      .whereNull('pe.id')
      .select('p.id', 'p.forum_name', 'p.plain_text', 'p.created_at')
      .orderBy('p.created_at', 'desc');

    const totalPosts = unevaluatedPosts.length;
    logger.info(`Found ${totalPosts} unevaluated posts.`);

    if (totalPosts === 0) {
      logger.info('No posts to process. Exiting.');
      return;
    }

    const totalBatches = maxBatches
      ? Math.min(Math.ceil(totalPosts / batchSize), maxBatches)
      : Math.ceil(totalPosts / batchSize);

    const batches = chunk(unevaluatedPosts, batchSize);

    for (let i = 0; i < totalBatches; i++) {
      const batch = batches[i];
      logger.info(`Processing batch ${i + 1} of ${totalBatches}`);

      logger.info(
        `Batch date range: ${batch[batch.length - 1].created_at} to ${batch[0].created_at}`
      );

      try {
        await processPostBatch(batch, forumName);
        logger.info(`Batch ${i + 1} processed successfully.`);
      } catch (error: any) {
        logger.error(`Error processing batch ${i + 1}:`, error);
      }

      // Add delay between batches
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    logger.info(`Processing completed.`);
  } catch (error: any) {
    logger.error(`Error processing recent posts:`, error);
  } finally {
    if (require.main === module) {
      await db.destroy();
    }
  }
}

async function processPostBatch(posts: Post[], _forumName: string): Promise<void> {
  await withLLMErrorHandling(async () => {
    const messages = [
      {
        role: 'system',
        content: systemPostPrompt,
      },
      ...posts.map(post => ({
        role: 'user',
        content: sanitizeContent(post.plain_text),
      })),
    ];

    const completion = await openai.beta.chat.completions.parse({
      model,
      messages,
      response_format: zodResponseFormat(BatchEvaluationSchema, 'batch_evaluation'),
    });

    const evaluationData = completion.choices[0].message.parsed;

    if (!evaluationData) {
      throw new Error('Received null response from OpenAI');
    }

    const evaluations = evaluationData.evaluations;

    if (evaluations.length !== posts.length) {
      throw new Error('Mismatch between number of evaluations and posts');
    }

    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      const evaluation = evaluations[i];

      try {
        await db('post_evaluations').insert({
          post_id: post.id,
          forum_name: post.forum_name,
          llm_model: model,
          ...roundNumericFields(evaluation),
          key_points: Array.isArray(evaluation.key_points)
            ? evaluation.key_points
            : [evaluation.key_points],
          tags: Array.isArray(evaluation.tags) ? evaluation.tags : [evaluation.tags],
          suggested_improvements: evaluation.suggested_improvements,
        });
        logger.info(`Processed evaluation for post ${post.id}`);
      } catch (error: any) {
        logger.error(`Error inserting evaluation for post ${post.id}:`, error);
      }
    }
  }, `Evaluating batch of ${posts.length} posts`);
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const forumName = args[0];
  const batchSize = parseInt(args[1]) || 100;
  const maxBatches = args[2] ? parseInt(args[2]) : undefined;

  if (!forumName) {
    logger.error('Please provide a forum name as the first argument');
    process.exit(1);
  }

  processRecentPosts(forumName, batchSize, maxBatches)
    .then(() => {
      logger.info('Post processing completed successfully.');
      process.exit(0);
    })
    .catch((error: any) => {
      logger.error('Post processing failed:', error);
      process.exit(1);
    });
}
