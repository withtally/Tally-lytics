// utils/db/backfillUsers.ts
import db from '../../db/db';
import { ApiService } from '../../services/crawler/apiService';
import { Logger } from '../../services/logging';
import { loggerConfig } from '../../config/loggerConfig';
import { forumConfigs } from '../../config/forumConfig';
import { RateLimiter } from 'limiter';

const logger = new Logger({
  ...loggerConfig,
  logFile: 'logs/backfill-users.log',
});

interface BackfillStats {
  forum: string;
  totalUsers: number;
  processedUsers: number;
  successfulUpdates: number;
  failedUpdates: number;
  errors: Array<{ username: string; error: string }>;
}

async function getAllUniqueUsers(forumName: string): Promise<string[]> {
  try {
    // Get unique usernames from posts only, as that's where user info is stored
    const users = await db('posts')
      .where('forum_name', forumName)
      .distinct('username')
      .pluck('username');

    logger.info(`Found ${users.length} unique users in ${forumName}`);

    // Filter out any null/undefined/empty usernames
    const validUsers = users.filter(username => username && username.trim());

    logger.info(`After filtering, proceeding with ${validUsers.length} valid usernames`);

    return validUsers;
  } catch (error: any) {
    logger.error(`Error fetching unique users for ${forumName}:`, error);
    throw error;
  }
}

async function backfillUsers(forumName: string, batchSize: number = 10): Promise<BackfillStats> {
  const stats: BackfillStats = {
    forum: forumName,
    totalUsers: 0,
    processedUsers: 0,
    successfulUpdates: 0,
    failedUpdates: 0,
    errors: [],
  };

  try {
    const forumConfig = forumConfigs.find(config => config.name === forumName);
    if (!forumConfig) {
      throw new Error(`No configuration found for forum: ${forumName}`);
    }

    const apiService = new ApiService(forumConfig.apiConfig, forumConfig.name);
    const limiter = new RateLimiter({ tokensPerInterval: 5, interval: 'second' });

    const usernames = await getAllUniqueUsers(forumName);
    stats.totalUsers = usernames.length;

    logger.info(`Starting to process ${usernames.length} users for ${forumName}`);

    // Process users in batches
    for (let i = 0; i < usernames.length; i += batchSize) {
      const batch = usernames.slice(i, i + batchSize);
      logger.info(
        `Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(usernames.length / batchSize)}`
      );

      await Promise.all(
        batch.map(async username => {
          try {
            await limiter.removeTokens(1);

            // Check if user already exists with complete data
            const existingUser = await db('users')
              .where({
                username,
                forum_name: forumName,
              })
              .whereNotNull('avatar_template')
              .first();

            if (existingUser) {
              logger.info(`User ${username} already exists with complete data, skipping`);
              stats.processedUsers++;
              stats.successfulUpdates++;
              return;
            }

            const userDetails = await apiService.fetchUserDetails(username);

            if (userDetails && userDetails.user) {
              await db('users')
                .insert({
                  id: userDetails.user.id,
                  forum_name: forumName,
                  username: userDetails.user.username,
                  name: userDetails.user.name,
                  avatar_template: userDetails.user.avatar_template,
                  created_at: userDetails.user.created_at,
                  updated_at: new Date().toISOString(),
                  last_seen_at: userDetails.user.last_seen_at,
                  website: userDetails.user.website,
                  location: userDetails.user.location,
                  bio: userDetails.user.bio_raw,
                  moderator: userDetails.user.moderator,
                  admin: userDetails.user.admin,
                })
                .onConflict(['id', 'forum_name'])
                .merge();

              stats.successfulUpdates++;
              logger.info(`Successfully updated user: ${username}`);
            }
          } catch (error: any) {
            stats.failedUpdates++;
            stats.errors.push({
              username,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            logger.error(`Error processing user ${username}:`, error);
          }

          stats.processedUsers++;
        })
      );

      logger.info(`Progress: ${stats.processedUsers}/${stats.totalUsers} users processed`);

      // Add a small delay between batches
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return stats;
  } catch (error: any) {
    logger.error(`Fatal error during backfill for ${forumName}:`, error);
    throw error;
  }
}

async function backfillAllForums(): Promise<BackfillStats[]> {
  const allStats: BackfillStats[] = [];

  for (const config of forumConfigs) {
    logger.info(`Starting backfill for forum: ${config.name}`);
    try {
      const stats = await backfillUsers(config.name);
      allStats.push(stats);
      logger.info(`Completed backfill for forum: ${config.name}`, {
        processed: stats.processedUsers,
        successful: stats.successfulUpdates,
        failed: stats.failedUpdates,
      });
    } catch (error: any) {
      logger.error(`Failed to backfill forum ${config.name}:`, error);
    }
  }

  return allStats;
}

// Script execution
if (require.main === module) {
  backfillAllForums()
    .then(stats => {
      console.log('\nBackfill complete. Results:');
      console.table(
        stats.map(s => ({
          Forum: s.forum,
          'Total Users': s.totalUsers,
          Processed: s.processedUsers,
          Successful: s.successfulUpdates,
          Failed: s.failedUpdates,
        }))
      );

      // Log any errors
      stats.forEach(s => {
        if (s.errors.length > 0) {
          console.log(`\nErrors for ${s.forum}:`);
          s.errors.forEach(e => console.log(`- ${e.username}: ${e.error}`));
        }
      });

      process.exit(0);
    })
    .catch(error => {
      console.error('Backfill failed:', error);
      process.exit(1);
    });
}

// Export for use in other scripts
export { backfillUsers, backfillAllForums };
