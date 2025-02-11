/* eslint-env node, commonjs */
/* global exports, process, console */

exports.up = async function (knex) {
  const isProd = process.env.NODE_ENV === 'production';

  return knex.transaction(async trx => {
    try {
      // Create Forum Activity Trends View
      await trx.raw(`
        CREATE MATERIALIZED VIEW IF NOT EXISTS forum_activity_trends AS
        WITH daily_stats AS (
            SELECT 
                posts.forum_name,
                DATE_TRUNC('day', posts.created_at) as day,
                COUNT(DISTINCT posts.topic_id) as new_topics,
                COUNT(DISTINCT posts.id) as total_posts,
                COUNT(DISTINCT posts.username) as active_users,
                AVG(post_evaluations.overall_quality) as avg_post_quality
            FROM posts
            LEFT JOIN post_evaluations ON posts.id = post_evaluations.post_id
                AND posts.forum_name = post_evaluations.forum_name
            GROUP BY posts.forum_name, DATE_TRUNC('day', posts.created_at)
        )
        SELECT 
            daily_stats.forum_name,
            daily_stats.day,
            daily_stats.new_topics,
            daily_stats.total_posts,
            daily_stats.active_users,
            daily_stats.avg_post_quality,
            AVG(daily_stats.total_posts) OVER (
                PARTITION BY daily_stats.forum_name 
                ORDER BY daily_stats.day 
                ROWS BETWEEN 7 PRECEDING AND CURRENT ROW
            ) as seven_day_avg_posts,
            AVG(daily_stats.active_users) OVER (
                PARTITION BY daily_stats.forum_name 
                ORDER BY daily_stats.day 
                ROWS BETWEEN 7 PRECEDING AND CURRENT ROW
            ) as seven_day_avg_users
        FROM daily_stats
        ORDER BY daily_stats.day DESC;

        CREATE UNIQUE INDEX IF NOT EXISTS forum_activity_trends_forum_day_idx 
        ON forum_activity_trends (forum_name, day);
        
        CREATE INDEX IF NOT EXISTS forum_activity_trends_recent_idx 
        ON forum_activity_trends (forum_name, day DESC);
      `);

      // Create User Engagement Metrics View
      await trx.raw(`
        CREATE MATERIALIZED VIEW IF NOT EXISTS user_engagement_metrics AS
        SELECT 
            posts.forum_name,
            COUNT(DISTINCT posts.username) as total_users,
            COUNT(DISTINCT CASE WHEN posts.created_at >= NOW() - INTERVAL '30 days' 
                THEN posts.username END) as monthly_active_users,
            COUNT(DISTINCT CASE WHEN posts.created_at >= NOW() - INTERVAL '7 days' 
                THEN posts.username END) as weekly_active_users,
            COUNT(DISTINCT CASE WHEN posts.created_at >= NOW() - INTERVAL '1 day' 
                THEN posts.username END) as daily_active_users,
            COUNT(DISTINCT posts.topic_id) / COUNT(DISTINCT posts.username)::float as avg_topics_per_user,
            COUNT(*) / COUNT(DISTINCT posts.username)::float as avg_posts_per_user
        FROM posts
        GROUP BY posts.forum_name;

        CREATE UNIQUE INDEX IF NOT EXISTS user_engagement_metrics_forum_idx 
        ON user_engagement_metrics (forum_name);
      `);

      // Create Topic Quality Analysis View
      await trx.raw(`
        CREATE MATERIALIZED VIEW IF NOT EXISTS topic_quality_analysis AS
        SELECT 
            topics.forum_name,
            topics.id as topic_id,
            topics.title,
            COUNT(posts.id) as reply_count,
            COUNT(DISTINCT posts.username) as unique_participants,
            AVG(post_evaluations.overall_quality) as avg_post_quality,
            AVG(post_evaluations.engagement_potential) as avg_engagement_potential,
            AVG(post_evaluations.constructiveness) as avg_constructiveness,
            MAX(posts.created_at) - MIN(posts.created_at) as discussion_duration,
            topic_evaluations.dominant_topic,
            topic_evaluations.key_points
        FROM topics
        LEFT JOIN posts ON topics.id = posts.topic_id 
            AND topics.forum_name = posts.forum_name
        LEFT JOIN post_evaluations ON posts.id = post_evaluations.post_id 
            AND posts.forum_name = post_evaluations.forum_name
        LEFT JOIN topic_evaluations ON topics.id = topic_evaluations.topic_id 
            AND topics.forum_name = topic_evaluations.forum_name
        GROUP BY topics.forum_name, topics.id, topics.title, 
            topic_evaluations.dominant_topic, topic_evaluations.key_points;

        CREATE UNIQUE INDEX IF NOT EXISTS topic_quality_analysis_forum_topic_idx 
        ON topic_quality_analysis (forum_name, topic_id);
        
        CREATE INDEX IF NOT EXISTS topic_quality_analysis_quality_idx 
        ON topic_quality_analysis (forum_name, avg_post_quality DESC);
      `);

      // Create Community Health Scores View
      await trx.raw(`
        CREATE MATERIALIZED VIEW IF NOT EXISTS community_health_scores AS
        WITH metrics AS (
            SELECT 
                posts.forum_name,
                COUNT(DISTINCT posts.username) / 30.0 as daily_active_users,
                COUNT(DISTINCT posts.topic_id) / 30.0 as daily_new_topics,
                AVG(post_evaluations.overall_quality) as content_quality,
                1 - AVG(post_evaluations.hostility)/10.0 as civility_score,
                COUNT(DISTINCT posts.username) / NULLIF(COUNT(*), 0)::float as user_participation_ratio
            FROM posts
            JOIN post_evaluations ON posts.id = post_evaluations.post_id
                AND posts.forum_name = post_evaluations.forum_name
            WHERE posts.created_at >= NOW() - INTERVAL '30 days'
            GROUP BY posts.forum_name
        )
        SELECT 
            metrics.forum_name,
            metrics.daily_active_users,
            metrics.daily_new_topics,
            metrics.content_quality,
            metrics.civility_score,
            metrics.user_participation_ratio,
            (
                GREATEST(LEAST(metrics.daily_active_users / 10.0, 1), 0) * 0.2 +
                GREATEST(LEAST(metrics.daily_new_topics / 5.0, 1), 0) * 0.2 +
                GREATEST(LEAST(metrics.content_quality / 10.0, 1), 0) * 0.3 +
                metrics.civility_score * 0.15 +
                GREATEST(LEAST(metrics.user_participation_ratio, 1), 0) * 0.15
            ) * 100 as health_score
        FROM metrics;

        CREATE UNIQUE INDEX IF NOT EXISTS community_health_scores_forum_idx 
        ON community_health_scores (forum_name);
        
        CREATE INDEX IF NOT EXISTS community_health_scores_rank_idx 
        ON community_health_scores (health_score DESC);
      `);

      // Update refresh function
      await trx.raw(`
        CREATE OR REPLACE FUNCTION refresh_all_views()
        RETURNS void AS $$
        BEGIN
            REFRESH MATERIALIZED VIEW CONCURRENTLY forum_activity_trends;
            REFRESH MATERIALIZED VIEW CONCURRENTLY user_engagement_metrics;
            REFRESH MATERIALIZED VIEW CONCURRENTLY topic_quality_analysis;
            REFRESH MATERIALIZED VIEW CONCURRENTLY community_health_scores;
        END;
        $$ LANGUAGE plpgsql;
      `);

      if (isProd) {
        // Schedule refresh (only in production)
        await trx.raw(`
          SELECT cron.schedule(
              'refresh_analytics_views',
              '0 * * * *',
              $$SELECT refresh_all_views()$$
          );
        `);
      }
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  });
};

exports.down = async function (knex) {
  const isProd = process.env.NODE_ENV === 'production';

  return knex.transaction(async trx => {
    try {
      if (isProd) {
        // Remove cron job (only in production)
        await trx.raw(`SELECT cron.unschedule('refresh_analytics_views');`);
      }

      // Drop views
      await trx.raw(`
        DROP MATERIALIZED VIEW IF EXISTS forum_activity_trends CASCADE;
        DROP MATERIALIZED VIEW IF EXISTS user_engagement_metrics CASCADE;
        DROP MATERIALIZED VIEW IF EXISTS topic_quality_analysis CASCADE;
        DROP MATERIALIZED VIEW IF EXISTS community_health_scores CASCADE;
      `);

      // Drop function
      await trx.raw(`
        DROP FUNCTION IF EXISTS refresh_all_views();
      `);
    } catch (error) {
      console.error('Migration rollback failed:', error);
      throw error;
    }
  });
};
