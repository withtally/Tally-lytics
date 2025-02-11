// historicalPostEvalsByDate.ts

import db from './db/db';
import { Logger } from './services/logging';
import { loggerConfig } from './config/loggerConfig';
import { forumConfigs } from './config/forumConfig';
import { evaluateUnanalyzedPostsInBatches } from './services/llm/postService';
import { chunk } from 'lodash';

const logger = new Logger({
  ...loggerConfig,
  logFile: 'logs/historical-post-evaluation.log',
});

interface PostProcessingStats {
  postsFound: number;
  postsProcessed: number;
  errors: Array<{ batchNumber: number; error: string }>;
  oldestProcessedDate: string | null;
  newestProcessedDate: string | null;
}

async function processHistoricalPosts(
  forumName: string,
  batchSize: number = 100,
  maxBatches?: number,
  startDate?: Date,
  endDate: Date = new Date()
): Promise<PostProcessingStats> {
  logger.info(`Starting historical post processing for ${forumName}`);

  let query = db('posts')
    .where('forum_name', forumName)
    .where('created_at', '<=', endDate.toISOString());

  if (startDate) {
    query = query.where('created_at', '>=', startDate.toISOString());
  }

  const allPosts = await query
    .select('id', 'forum_name', 'created_at')
    .orderBy('created_at', 'desc');

  logger.info(`Retrieved ${allPosts.length} total posts for ${forumName}`);

  const evaluatedPostIds = new Set(
    (await db('post_evaluations').where('forum_name', forumName).select('post_id')).map(
      row => row.post_id
    )
  );

  logger.info(`Found ${evaluatedPostIds.size} already evaluated posts`);

  const unevaluatedPosts = allPosts.filter(post => !evaluatedPostIds.has(post.id));

  const stats: PostProcessingStats = {
    postsFound: unevaluatedPosts.length,
    postsProcessed: 0,
    errors: [],
    oldestProcessedDate:
      unevaluatedPosts.length > 0 ? unevaluatedPosts[unevaluatedPosts.length - 1].created_at : null,
    newestProcessedDate: unevaluatedPosts.length > 0 ? unevaluatedPosts[0].created_at : null,
  };

  logger.info(`Found ${stats.postsFound} unevaluated posts in ${forumName}`);

  if (unevaluatedPosts.length > 0) {
    const samplePosts = unevaluatedPosts.slice(0, 5);
    logger.info('Sample of first 5 posts to be processed (should be newest first):');
    samplePosts.forEach((post, idx) => {
      logger.info(`${idx + 1}. Post ID: ${post.id}, Created: ${post.created_at}`);
    });

    const totalBatches = maxBatches
      ? Math.min(Math.ceil(unevaluatedPosts.length / batchSize), maxBatches)
      : Math.ceil(unevaluatedPosts.length / batchSize);

    const _batches = chunk(unevaluatedPosts, batchSize);

    for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
      const start = batchNum * batchSize;
      const end = Math.min(start + batchSize, unevaluatedPosts.length);
      const batch = unevaluatedPosts.slice(start, end);

      try {
        logger.info(`Processing batch ${batchNum + 1}/${totalBatches} for ${forumName}`);
        logger.info(
          `Batch date range: ${batch[batch.length - 1].created_at} to ${batch[0].created_at}`
        );

        const _batches = await db('post_evaluations')
          .whereIn(
            'post_id',
            batch.map(post => post.id)
          )
          .where('forum_name', forumName)
          .select('post_id');

        if (_batches.length > 0) {
          await evaluateUnanalyzedPostsInBatches(forumName, batch);
          stats.postsProcessed += batch.length;
          logger.info(
            `Completed batch ${batchNum + 1}. Processed ${stats.postsProcessed}/${stats.postsFound} posts`
          );
        } else {
          logger.info(`Skipping batch ${batchNum + 1} as all posts were already evaluated`);
        }
      } catch (error: any) {
        stats.errors.push({
          batchNumber: batchNum + 1,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        logger.error(`Error processing batch ${batchNum + 1} for ${forumName}:`, error);
      }
    }
  }

  return stats;
}

async function main() {
  const args = process.argv.slice(2);
  const batchSize = parseInt(args[0]) || 100;
  const maxBatches = args[1] ? parseInt(args[1]) : undefined;
  const specifiedForum = args[2];

  const startDateStr = args[3];
  const endDateStr = args[4];

  const startDate = startDateStr ? new Date(startDateStr) : undefined;
  const endDate = endDateStr ? new Date(endDateStr) : new Date();

  console.log(
    `Starting historical post evaluation with batch size ${batchSize}${maxBatches ? ` and max ${maxBatches} batches` : ''}`
  );
  if (startDate || endDate) {
    console.log(
      `Date range: ${startDate?.toISOString() || 'unlimited'} to ${endDate.toISOString()}`
    );
  }

  try {
    const results: Record<string, PostProcessingStats> = {};

    if (specifiedForum) {
      const forumConfig = forumConfigs.find(config => config.name === specifiedForum);
      if (!forumConfig) {
        throw new Error(`Forum configuration not found for ${specifiedForum}`);
      }
      results[specifiedForum] = await processHistoricalPosts(
        specifiedForum,
        batchSize,
        maxBatches,
        startDate,
        endDate
      );
    } else {
      for (const config of forumConfigs) {
        logger.info(`Processing forum: ${config.name}`);
        results[config.name] = await processHistoricalPosts(
          config.name,
          batchSize,
          maxBatches,
          startDate,
          endDate
        );
      }
    }

    console.log('\nProcessing Summary:');
    console.log('==================');
    for (const [forum, stats] of Object.entries(results)) {
      console.log(`\nForum: ${forum}`);
      console.log(`Posts Found: ${stats.postsFound}`);
      console.log(`Posts Processed: ${stats.postsProcessed}`);
      if (stats.newestProcessedDate && stats.oldestProcessedDate) {
        console.log(`Date Range: ${stats.oldestProcessedDate} to ${stats.newestProcessedDate}`);
      }

      if (stats.errors.length > 0) {
        console.log('\nErrors:');
        stats.errors.forEach(error => {
          console.log(`- Batch ${error.batchNumber}: ${error.error}`);
        });
      }
    }

    const totalErrors = Object.values(results).reduce((sum, s) => sum + s.errors.length, 0);
    if (totalErrors > 0) {
      console.log(`\nCompleted with ${totalErrors} errors. Check logs for details.`);
      process.exit(1);
    } else {
      console.log('\nAll processing completed successfully.');
      process.exit(0);
    }
  } catch (error: any) {
    logger.error('Fatal error during historical post processing:', error);
    console.error('Fatal error occurred. Check logs for details.');
    process.exit(1);
  } finally {
    if (require.main === module) {
      await db.destroy();
    }
  }
}

if (require.main === module) {
  main();
}

export { processHistoricalPosts };
