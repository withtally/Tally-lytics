// services/server/dataRoutes.ts
// Routes for fetching posts and topics data for the explore page

import type { Context, Hono } from 'hono';
import { Logger } from '../logging';

export const dataRoutes = (app: Hono, logger: Logger) => {
  // Get posts with pagination and filtering
  app.get('/api/posts', async (c: Context) => {
    try {
      const { page = '1', limit = '20', forum, orderBy = 'created_at' } = c.req.query();
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const offset = (pageNum - 1) * limitNum;

      const db = require('../../db/db').default;

      let query = db('posts')
        .leftJoin('post_evaluations', 'posts.id', 'post_evaluations.post_id')
        .leftJoin('topics', function () {
          this.on('posts.topic_id', '=', 'topics.id').on(
            'posts.forum_name',
            '=',
            'topics.forum_name'
          );
        })
        .select([
          'posts.id',
          'topics.title',
          'posts.plain_text as content',
          'posts.username as author',
          'posts.created_at',
          'posts.forum_name',
          'posts.topic_id',
          'post_evaluations.overall_quality',
          'post_evaluations.relevance',
          'post_evaluations.emotional_tone',
          'post_evaluations.key_points',
        ])
        .limit(limitNum)
        .offset(offset)
        .orderBy(`posts.${orderBy}`, 'desc');

      // Filter by forum if specified
      if (forum && forum !== 'all') {
        query = query.where('posts.forum_name', forum);
      }

      const posts = await query;

      // Transform to match frontend interface
      const transformedPosts = posts.map((post: any) => ({
        id: post.id,
        title: post.title,
        content: post.content,
        author: post.author,
        created_at: post.created_at,
        forum_name: post.forum_name,
        topic_id: post.topic_id,
        post_evaluation: post.overall_quality
          ? {
              quality_score: post.overall_quality,
              relevance_score: post.relevance,
              sentiment:
                post.emotional_tone <= 5
                  ? 'negative'
                  : post.emotional_tone >= 8
                    ? 'positive'
                    : 'neutral',
              summary: post.key_points,
            }
          : undefined,
      }));

      return c.json({
        data: transformedPosts,
        pagination: {
          page: pageNum,
          limit: limitNum,
          hasMore: transformedPosts.length === limitNum,
        },
      });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Posts fetch error:', { error: errorMessage });

      // Return 200 with empty data and error info for better frontend compatibility
      return c.json({
        data: [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          hasMore: false,
        },
        error: 'Failed to fetch posts',
        details: errorMessage,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Get topics with pagination and filtering
  app.get('/api/topics', async (c: Context) => {
    try {
      const { page = '1', limit = '20', forum, orderBy = 'created_at' } = c.req.query();
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const offset = (pageNum - 1) * limitNum;

      const db = require('../../db/db').default;

      let query = db('topics')
        .leftJoin('topic_evaluations', 'topics.id', 'topic_evaluations.topic_id')
        .select([
          'topics.id',
          'topics.title',
          'topics.created_at',
          'topics.forum_name',
          'topics.posts_count',
          'topic_evaluations.overall_quality',
          'topic_evaluations.relevance',
          'topic_evaluations.key_points',
        ])
        .limit(limitNum)
        .offset(offset)
        .orderBy(`topics.${orderBy}`, 'desc');

      // Filter by forum if specified
      if (forum && forum !== 'all') {
        query = query.where('topics.forum_name', forum);
      }

      const topics = await query;

      // Transform to match frontend interface
      const transformedTopics = topics.map((topic: any) => ({
        id: topic.id,
        title: topic.title,
        created_at: topic.created_at,
        forum_name: topic.forum_name,
        posts_count: topic.posts_count || 0,
        views: 0, // Views not tracked in current schema
        topic_evaluation: topic.overall_quality
          ? {
              quality_score: topic.overall_quality,
              relevance_score: topic.relevance,
              summary: topic.key_points,
            }
          : undefined,
      }));

      return c.json({
        data: transformedTopics,
        pagination: {
          page: pageNum,
          limit: limitNum,
          hasMore: transformedTopics.length === limitNum,
        },
      });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Topics fetch error:', { error: errorMessage });

      // Return 200 with empty data and error info for better frontend compatibility
      return c.json({
        data: [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          hasMore: false,
        },
        error: 'Failed to fetch topics',
        details: errorMessage,
        timestamp: new Date().toISOString(),
      });
    }
  });
};
