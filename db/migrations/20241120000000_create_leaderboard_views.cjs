/* eslint-env node, commonjs */
/* global exports, process, console */

// migrations/[timestamp]_create_leaderboard_views.js

exports.up = async function (knex) {
  const isProd = process.env.NODE_ENV === 'production';

  // Use a transaction to ensure all operations succeed or fail together
  return knex.transaction(async trx => {
    try {
      if (isProd) {
        // Enable pg_cron extension if not already enabled (only in production)
        // Commented out for Railway PostgreSQL
        // await trx.raw('CREATE EXTENSION IF NOT EXISTS "pg_cron";');
      }

      // Create combined score calculation function
      await trx.raw(`
                CREATE OR REPLACE FUNCTION calculate_combined_score(
                    overall_quality NUMERIC,
                    helpfulness NUMERIC,
                    relevance NUMERIC,
                    unique_perspective NUMERIC,
                    logical_reasoning NUMERIC,
                    fact_based NUMERIC
                ) RETURNS NUMERIC AS $$
                BEGIN
                    RETURN (
                        overall_quality * 2 + 
                        helpfulness + 
                        relevance + 
                        unique_perspective + 
                        logical_reasoning + 
                        fact_based
                    ) / 7;
                END;
                $$ LANGUAGE plpgsql IMMUTABLE;
            `);

      // Create Weekly Leaderboard View
      await trx.raw(`
                CREATE MATERIALIZED VIEW IF NOT EXISTS user_leaderboard_weekly AS
                WITH weekly_scores AS (
                    SELECT 
                        p.username,
                        p.forum_name,
                        AVG(pe.overall_quality) as avg_quality,
                        AVG(pe.helpfulness) as avg_helpfulness,
                        AVG(pe.relevance) as avg_relevance,
                        AVG(pe.unique_perspective) as avg_unique_perspective,
                        AVG(pe.logical_reasoning) as avg_logical_reasoning,
                        AVG(pe.fact_based) as avg_fact_based,
                        COUNT(p.id) as post_count,
                        AVG(calculate_combined_score(
                            pe.overall_quality,
                            pe.helpfulness,
                            pe.relevance,
                            pe.unique_perspective,
                            pe.logical_reasoning,
                            pe.fact_based
                        )) as combined_score
                    FROM posts p
                    JOIN post_evaluations pe ON p.id = pe.post_id
                    WHERE p.created_at >= NOW() - INTERVAL '7 days'
                    GROUP BY p.username, p.forum_name
                    HAVING COUNT(p.id) >= 3
                )
                SELECT 
                    username,
                    forum_name,
                    avg_quality,
                    avg_helpfulness,
                    avg_relevance,
                    avg_unique_perspective,
                    avg_logical_reasoning,
                    avg_fact_based,
                    post_count,
                    combined_score,
                    RANK() OVER (PARTITION BY forum_name ORDER BY combined_score DESC) as rank
                FROM weekly_scores
                WHERE combined_score IS NOT NULL;
            `);

      // Create Monthly Leaderboard View
      await trx.raw(`
                CREATE MATERIALIZED VIEW IF NOT EXISTS user_leaderboard_monthly AS
                WITH monthly_scores AS (
                    SELECT 
                        p.username,
                        p.forum_name,
                        AVG(pe.overall_quality) as avg_quality,
                        AVG(pe.helpfulness) as avg_helpfulness,
                        AVG(pe.relevance) as avg_relevance,
                        AVG(pe.unique_perspective) as avg_unique_perspective,
                        AVG(pe.logical_reasoning) as avg_logical_reasoning,
                        AVG(pe.fact_based) as avg_fact_based,
                        COUNT(p.id) as post_count,
                        AVG(calculate_combined_score(
                            pe.overall_quality,
                            pe.helpfulness,
                            pe.relevance,
                            pe.unique_perspective,
                            pe.logical_reasoning,
                            pe.fact_based
                        )) as combined_score
                    FROM posts p
                    JOIN post_evaluations pe ON p.id = pe.post_id
                    WHERE p.created_at >= NOW() - INTERVAL '30 days'
                    GROUP BY p.username, p.forum_name
                    HAVING COUNT(p.id) >= 5
                )
                SELECT 
                    username,
                    forum_name,
                    avg_quality,
                    avg_helpfulness,
                    avg_relevance,
                    avg_unique_perspective,
                    avg_logical_reasoning,
                    avg_fact_based,
                    post_count,
                    combined_score,
                    RANK() OVER (PARTITION BY forum_name ORDER BY combined_score DESC) as rank
                FROM monthly_scores
                WHERE combined_score IS NOT NULL;
            `);

      // Create Quarterly Leaderboard View
      await trx.raw(`
                CREATE MATERIALIZED VIEW IF NOT EXISTS user_leaderboard_quarterly AS
                WITH quarterly_scores AS (
                    SELECT 
                        p.username,
                        p.forum_name,
                        AVG(pe.overall_quality) as avg_quality,
                        AVG(pe.helpfulness) as avg_helpfulness,
                        AVG(pe.relevance) as avg_relevance,
                        AVG(pe.unique_perspective) as avg_unique_perspective,
                        AVG(pe.logical_reasoning) as avg_logical_reasoning,
                        AVG(pe.fact_based) as avg_fact_based,
                        COUNT(p.id) as post_count,
                        AVG(calculate_combined_score(
                            pe.overall_quality,
                            pe.helpfulness,
                            pe.relevance,
                            pe.unique_perspective,
                            pe.logical_reasoning,
                            pe.fact_based
                        )) as combined_score
                    FROM posts p
                    JOIN post_evaluations pe ON p.id = pe.post_id
                    WHERE p.created_at >= NOW() - INTERVAL '90 days'
                    GROUP BY p.username, p.forum_name
                    HAVING COUNT(p.id) >= 10
                )
                SELECT 
                    username,
                    forum_name,
                    avg_quality,
                    avg_helpfulness,
                    avg_relevance,
                    avg_unique_perspective,
                    avg_logical_reasoning,
                    avg_fact_based,
                    post_count,
                    combined_score,
                    RANK() OVER (PARTITION BY forum_name ORDER BY combined_score DESC) as rank
                FROM quarterly_scores
                WHERE combined_score IS NOT NULL;
            `);

      // Create All-Time Leaderboard View
      await trx.raw(`
                CREATE MATERIALIZED VIEW IF NOT EXISTS user_leaderboard_alltime AS
                WITH alltime_scores AS (
                    SELECT 
                        p.username,
                        p.forum_name,
                        AVG(pe.overall_quality) as avg_quality,
                        AVG(pe.helpfulness) as avg_helpfulness,
                        AVG(pe.relevance) as avg_relevance,
                        AVG(pe.unique_perspective) as avg_unique_perspective,
                        AVG(pe.logical_reasoning) as avg_logical_reasoning,
                        AVG(pe.fact_based) as avg_fact_based,
                        COUNT(p.id) as post_count,
                        AVG(calculate_combined_score(
                            pe.overall_quality,
                            pe.helpfulness,
                            pe.relevance,
                            pe.unique_perspective,
                            pe.logical_reasoning,
                            pe.fact_based
                        )) as combined_score
                    FROM posts p
                    JOIN post_evaluations pe ON p.id = pe.post_id
                    GROUP BY p.username, p.forum_name
                    HAVING COUNT(p.id) >= 15
                )
                SELECT 
                    username,
                    forum_name,
                    avg_quality,
                    avg_helpfulness,
                    avg_relevance,
                    avg_unique_perspective,
                    avg_logical_reasoning,
                    avg_fact_based,
                    post_count,
                    combined_score,
                    RANK() OVER (PARTITION BY forum_name ORDER BY combined_score DESC) as rank
                FROM alltime_scores
                WHERE combined_score IS NOT NULL;
            `);

      // Create refresh function
      await trx.raw(`
                CREATE OR REPLACE FUNCTION refresh_leaderboards()
                RETURNS void AS $$
                BEGIN
                    REFRESH MATERIALIZED VIEW CONCURRENTLY user_leaderboard_weekly;
                    REFRESH MATERIALIZED VIEW CONCURRENTLY user_leaderboard_monthly;
                    REFRESH MATERIALIZED VIEW CONCURRENTLY user_leaderboard_quarterly;
                    REFRESH MATERIALIZED VIEW CONCURRENTLY user_leaderboard_alltime;
                END;
                $$ LANGUAGE plpgsql;
            `);

      // Create trigger function
      await trx.raw(`
                CREATE OR REPLACE FUNCTION trigger_refresh_leaderboards()
                RETURNS trigger AS $$
                BEGIN
                    PERFORM pg_notify('refresh_leaderboards', '');
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;
            `);

      // Create triggers
      await trx.raw(`
                CREATE TRIGGER refresh_leaderboards_trigger
                    AFTER INSERT OR UPDATE OR DELETE ON posts
                    FOR EACH STATEMENT
                    EXECUTE FUNCTION trigger_refresh_leaderboards();

                CREATE TRIGGER refresh_leaderboards_eval_trigger
                    AFTER INSERT OR UPDATE OR DELETE ON post_evaluations
                    FOR EACH STATEMENT
                    EXECUTE FUNCTION trigger_refresh_leaderboards();
            `);

      if (isProd) {
        // Schedule periodic refresh (only in production)
        await trx.raw(`
                    SELECT cron.schedule(
                        'refresh_leaderboards_hourly',
                        '0 * * * *',
                        'SELECT refresh_leaderboards()'
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

  // Use a transaction to ensure all operations succeed or fail together
  return knex.transaction(async trx => {
    try {
      if (isProd) {
        // Drop cron job (only in production)
        await trx.raw(`SELECT cron.unschedule('refresh_leaderboards_hourly');`);
      }

      // Drop triggers
      await trx.raw(`
                DROP TRIGGER IF EXISTS refresh_leaderboards_trigger ON posts;
                DROP TRIGGER IF EXISTS refresh_leaderboards_eval_trigger ON post_evaluations;
            `);

      // Drop functions
      await trx.raw(`
                DROP FUNCTION IF EXISTS trigger_refresh_leaderboards();
                DROP FUNCTION IF EXISTS refresh_leaderboards();
                DROP FUNCTION IF EXISTS calculate_combined_score(NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC);
            `);

      // Drop materialized views
      await trx.raw(`
                DROP MATERIALIZED VIEW IF EXISTS user_leaderboard_weekly;
                DROP MATERIALIZED VIEW IF EXISTS user_leaderboard_monthly;
                DROP MATERIALIZED VIEW IF EXISTS user_leaderboard_quarterly;
                DROP MATERIALIZED VIEW IF EXISTS user_leaderboard_alltime;
            `);
    } catch (error) {
      console.error('Migration rollback failed:', error);
      throw error;
    }
  });
};
