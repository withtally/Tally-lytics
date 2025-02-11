/* eslint-env node, commonjs */
/* global exports, process, console */

exports.up = async function (knex) {
  // Popular Topics Analysis with fixed ranking
  await knex.raw(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS popular_topics_analysis AS
      WITH ranked_posts AS (
          SELECT 
              posts.topic_id,
              posts.forum_name,
              posts.plain_text,
              ROW_NUMBER() OVER (
                  PARTITION BY posts.topic_id 
                  ORDER BY post_evaluations.overall_quality DESC NULLS LAST
              ) as rank
          FROM posts
          LEFT JOIN post_evaluations 
              ON posts.id = post_evaluations.post_id
              AND posts.forum_name = post_evaluations.forum_name
      )
      SELECT 
          topics.forum_name,
          topics.id as topic_id,
          topics.title,
          COUNT(DISTINCT posts.id) as total_responses,
          COUNT(DISTINCT posts.username) as unique_participants,
          MAX(posts.created_at) - topics.created_at as discussion_duration,
          AVG(post_evaluations.overall_quality) as avg_quality,
          AVG(post_evaluations.engagement_potential) as engagement_score,
          topic_evaluations.key_points,
          ranked_posts.plain_text as highest_quality_response
      FROM topics
      LEFT JOIN posts ON topics.id = posts.topic_id 
          AND topics.forum_name = posts.forum_name
      LEFT JOIN post_evaluations ON posts.id = post_evaluations.post_id 
          AND posts.forum_name = post_evaluations.forum_name
      LEFT JOIN topic_evaluations ON topics.id = topic_evaluations.topic_id 
          AND topics.forum_name = topic_evaluations.forum_name
      LEFT JOIN ranked_posts ON topics.id = ranked_posts.topic_id 
          AND topics.forum_name = ranked_posts.forum_name
          AND ranked_posts.rank = 1
      WHERE topics.created_at >= NOW() - INTERVAL '90 days'
      GROUP BY topics.forum_name, topics.id, topics.title, topics.created_at,
          topic_evaluations.key_points, ranked_posts.plain_text;
  
      CREATE UNIQUE INDEX IF NOT EXISTS popular_topics_analysis_idx 
      ON popular_topics_analysis (forum_name, topic_id);
    `);

  // Create User Participation Patterns
  await knex.raw(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS user_participation_patterns AS
      WITH user_stats AS (
          SELECT 
              posts.forum_name,
              posts.username,
              COUNT(DISTINCT posts.id) as total_posts,
              COUNT(DISTINCT posts.topic_id) as topics_participated,
              AVG(post_evaluations.overall_quality) as avg_quality,
              PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY post_evaluations.overall_quality) as median_quality,
              AVG(post_evaluations.constructiveness) as avg_constructiveness,
              AVG(post_evaluations.hostility) as avg_hostility,
              MAX(posts.created_at) - MIN(posts.created_at) as participation_span,
              COUNT(DISTINCT DATE_TRUNC('day', posts.created_at)) as active_days
          FROM posts
          LEFT JOIN post_evaluations ON posts.id = post_evaluations.post_id 
              AND posts.forum_name = post_evaluations.forum_name
          WHERE posts.created_at >= NOW() - INTERVAL '180 days'
          GROUP BY posts.forum_name, posts.username
      )
      SELECT 
          forum_name,
          username,
          total_posts,
          topics_participated,
          avg_quality,
          median_quality,
          avg_constructiveness,
          avg_hostility,
          participation_span,
          active_days,
          CASE 
              WHEN EXTRACT(days FROM participation_span) = 0 THEN 1
              ELSE active_days::float / EXTRACT(days FROM participation_span)
          END as participation_consistency,
          NTILE(4) OVER (PARTITION BY forum_name ORDER BY avg_quality DESC) as quality_quartile
      FROM user_stats
      WHERE total_posts >= 5;
  
      CREATE UNIQUE INDEX IF NOT EXISTS user_participation_patterns_idx 
      ON user_participation_patterns (forum_name, username);
    `);

  // Topic Category Analysis
  await knex.raw(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS topic_category_analysis AS
      WITH categorized_topics AS (
          SELECT 
              t.forum_name,
              te.dominant_topic as category,
              COUNT(DISTINCT t.id) as topic_count,
              AVG(pe.overall_quality) as avg_post_quality,
              COUNT(DISTINCT p.username) as unique_participants,
              SUM(CASE WHEN pe.overall_quality >= 7 THEN 1 ELSE 0 END) as high_quality_posts
          FROM topics t
          LEFT JOIN topic_evaluations te ON t.id = te.topic_id 
              AND t.forum_name = te.forum_name
          LEFT JOIN posts p ON t.id = p.topic_id 
              AND t.forum_name = p.forum_name
          LEFT JOIN post_evaluations pe ON p.id = pe.post_id 
              AND p.forum_name = pe.forum_name
          WHERE te.dominant_topic IS NOT NULL
          GROUP BY t.forum_name, te.dominant_topic
      )
      SELECT 
          forum_name,
          category,
          topic_count,
          avg_post_quality,
          unique_participants,
          high_quality_posts,
          high_quality_posts::float / NULLIF(topic_count, 0) as quality_ratio,
          RANK() OVER (PARTITION BY forum_name ORDER BY avg_post_quality DESC) as quality_rank
      FROM categorized_topics;
  
      CREATE UNIQUE INDEX IF NOT EXISTS topic_category_analysis_idx 
      ON topic_category_analysis (forum_name, category);
    `);

  // Governance Impact Analysis
  await knex.raw(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS governance_impact_analysis AS
      WITH proposal_discussion AS (
          SELECT 
              t.forum_name,
              CASE 
                  WHEN t.title ILIKE '%proposal%' THEN 'Proposal'
                  WHEN t.title ILIKE '%gov%' THEN 'Governance'
                  WHEN t.title ILIKE '%vote%' THEN 'Voting'
                  ELSE 'Other'
              END as discussion_type,
              COUNT(DISTINCT t.id) as discussion_count,
              COUNT(DISTINCT p.username) as participant_count,
              AVG(pe.overall_quality) as avg_quality,
              AVG(pe.engagement_potential) as avg_engagement,
              COUNT(DISTINCT p.id) as total_responses
          FROM topics t
          LEFT JOIN posts p ON t.id = p.topic_id 
              AND t.forum_name = p.forum_name
          LEFT JOIN post_evaluations pe ON p.id = pe.post_id 
              AND p.forum_name = pe.forum_name
          WHERE t.created_at >= NOW() - INTERVAL '90 days'
          GROUP BY t.forum_name, discussion_type
      )
      SELECT 
          pd.*,
          COALESCE(sp.total_proposals, 0) as snapshot_proposals,
          COALESCE(tp.total_proposals, 0) as tally_proposals,
          pd.participant_count::float / NULLIF(pd.discussion_count, 0) as avg_participants_per_discussion,
          pd.total_responses::float / NULLIF(pd.discussion_count, 0) as avg_responses_per_discussion
      FROM proposal_discussion pd
      LEFT JOIN (
          SELECT forum_name, COUNT(*) as total_proposals 
          FROM snapshot_proposals 
          WHERE created_at >= NOW() - INTERVAL '90 days'
          GROUP BY forum_name
      ) sp ON pd.forum_name = sp.forum_name
      LEFT JOIN (
          SELECT forum_name, COUNT(*) as total_proposals 
          FROM tally_proposals 
          WHERE created_at >= NOW() - INTERVAL '90 days'
          GROUP BY forum_name
      ) tp ON pd.forum_name = tp.forum_name;
  
      CREATE UNIQUE INDEX IF NOT EXISTS governance_impact_analysis_idx 
      ON governance_impact_analysis (forum_name, discussion_type);
    `);

  // Update refresh function
  await knex.raw(`
      CREATE OR REPLACE FUNCTION refresh_all_views()
      RETURNS void AS $$
      BEGIN
          REFRESH MATERIALIZED VIEW CONCURRENTLY forum_activity_trends;
          REFRESH MATERIALIZED VIEW CONCURRENTLY user_engagement_metrics;
          REFRESH MATERIALIZED VIEW CONCURRENTLY topic_quality_analysis;
          REFRESH MATERIALIZED VIEW CONCURRENTLY community_health_scores;
          REFRESH MATERIALIZED VIEW CONCURRENTLY popular_topics_analysis;
          REFRESH MATERIALIZED VIEW CONCURRENTLY user_participation_patterns;
          REFRESH MATERIALIZED VIEW CONCURRENTLY topic_category_analysis;
          REFRESH MATERIALIZED VIEW CONCURRENTLY governance_impact_analysis;
      END;
      $$ LANGUAGE plpgsql;
    `);
};

exports.down = async function (knex) {
  await knex.raw(`
      DROP MATERIALIZED VIEW IF EXISTS popular_topics_analysis CASCADE;
      DROP MATERIALIZED VIEW IF EXISTS user_participation_patterns CASCADE;
      DROP MATERIALIZED VIEW IF EXISTS topic_category_analysis CASCADE;
      DROP MATERIALIZED VIEW IF EXISTS governance_impact_analysis CASCADE;
    `);

  // Restore original refresh function
  await knex.raw(`
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
};
