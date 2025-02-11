// historicalPostEvals.ts

import { Logger } from './services/logging';
import { loggerConfig } from './config/loggerConfig';
import db from './db/db';
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

export async function processHistoricalPosts(
  forumName: string,
  batchSize: number = 100,
  maxBatches?: number
): Promise<PostProcessingStats> {
  logger.info(`Starting historical post processing for ${forumName}`);

  const unevaluatedPosts = await db('posts as p')
    .leftJoin('post_evaluations as pe', function () {
      this.on('p.id', '=', 'pe.post_id').andOn('p.forum_name', '=', 'pe.forum_name');
    })
    .where('p.forum_name', forumName)
    .whereNull('pe.id')
    .select('p.id', 'p.forum_name', 'p.created_at')
    .orderBy('p.created_at', 'desc');

  const stats: PostProcessingStats = {
    postsFound: unevaluatedPosts.length,
    postsProcessed: 0,
    errors: [],
    oldestProcessedDate:
      unevaluatedPosts.length > 0 ? unevaluatedPosts[unevaluatedPosts.length - 1].created_at : null,
    newestProcessedDate: unevaluatedPosts.length > 0 ? unevaluatedPosts[0].created_at : null,
  };

  logger.info(`Found ${stats.postsFound} unevaluated posts in ${forumName}`);

  if (unevaluatedPosts.length === 0) {
    logger.info('No posts to process. Exiting.');
    return stats;
  }

  const totalBatches = maxBatches
    ? Math.min(Math.ceil(unevaluatedPosts.length / batchSize), maxBatches)
    : Math.ceil(unevaluatedPosts.length / batchSize);

  const batches = chunk(unevaluatedPosts, batchSize);

  for (let i = 0; i < totalBatches; i++) {
    const batch = batches[i];
    logger.info(`Processing batch ${i + 1} of ${totalBatches}`);
    logger.info(
      `Batch date range: ${batch[batch.length - 1].created_at} to ${batch[0].created_at}`
    );

    try {
      const alreadyEvaluated = await db('post_evaluations')
        .whereIn(
          'post_id',
          batch.map(post => post.id)
        )
        .where('forum_name', forumName)
        .select('post_id');

      if (alreadyEvaluated.length > 0) {
        const evaluatedIds = new Set(alreadyEvaluated.map(row => row.post_id));
        const filteredBatch = batch.filter(post => !evaluatedIds.has(post.id));

        if (filteredBatch.length > 0) {
          await evaluateUnanalyzedPostsInBatches(forumName, filteredBatch);
          stats.postsProcessed += filteredBatch.length;
        } else {
          logger.info(`Skipping batch ${i + 1} as all posts were already evaluated`);
        }
      } else {
        await evaluateUnanalyzedPostsInBatches(forumName, batch);
        stats.postsProcessed += batch.length;
      }

      logger.info(
        `Completed batch ${i + 1}. Processed ${stats.postsProcessed}/${stats.postsFound} posts`
      );
    } catch (error: any) {
      stats.errors.push({
        batchNumber: i + 1,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      logger.error(`Error processing batch ${i + 1} for ${forumName}:`, error);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return stats;
}

async function main() {
  const args = process.argv.slice(2);
  const batchSize = parseInt(args[0]) || 100;
  const maxBatches = args[1] ? parseInt(args[1]) : undefined;
  const specifiedForum = args[2];

  console.log(
    `Starting historical post evaluation with batch size ${batchSize}${maxBatches ? ` and max ${maxBatches} batches` : ''}...`
  );

  try {
    const results: Record<string, PostProcessingStats> = {};

    if (specifiedForum) {
      const forumConfig = forumConfigs.find(config => config.name === specifiedForum);
      if (!forumConfig) {
        throw new Error(`Forum configuration not found for ${specifiedForum}`);
      }
      results[specifiedForum] = await processHistoricalPosts(specifiedForum, batchSize, maxBatches);
    } else {
      for (const config of forumConfigs) {
        logger.info(`Processing forum: ${config.name}`);
        results[config.name] = await processHistoricalPosts(config.name, batchSize, maxBatches);
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

    const totalErrors = Object.values(results).reduce((sum, stats) => sum + stats.errors.length, 0);
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
