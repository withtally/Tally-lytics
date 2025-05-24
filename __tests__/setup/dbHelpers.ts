// __tests__/setup/dbHelpers.ts - Database testing utilities

import { pgVectorClient } from '../../db/pgvectorClient';
import db from '../../db/db';
import { createTestPost, createTestTopic, createTestPostEvaluation } from '../factories/postFactory';
import type { TestPost, TestTopic, TestPostEvaluation } from '../factories/postFactory';

/**
 * Setup test database with clean state
 */
export async function setupTestDatabase() {
  try {
    // Run migrations to ensure schema is up to date
    await db.migrate.latest();
    console.log('✅ Test database migrations complete');
  } catch (error) {
    console.error('❌ Test database setup failed:', error);
    throw error;
  }
}

/**
 * Clean up test database
 */
export async function cleanupTestDatabase() {
  try {
    // Clean up all test data
    await db('post_evaluations').del();
    await db('post_vectors').del();
    await db('topic_vectors').del();
    await db('posts').del();
    await db('topics').del();
    await db('users').del();
    await db('common_topics').del();
    await db('search_log').del();
    
    console.log('✅ Test database cleaned');
  } catch (error) {
    console.error('❌ Test database cleanup failed:', error);
  }
}

/**
 * Create a test database transaction for isolated testing
 */
export async function createTestTransaction() {
  const trx = await db.transaction();
  
  // Helper to rollback and close transaction
  const cleanup = async () => {
    try {
      await trx.rollback();
    } catch (error) {
      // Transaction may already be rolled back
    }
  };
  
  return { trx, cleanup };
}

/**
 * Seed test data in database
 */
export async function seedTestData(options: {
  posts?: number;
  topics?: number;
  forums?: string[];
  trx?: any;
} = {}) {
  const {
    posts = 5,
    topics = 2,
    forums = ['ARBITRUM', 'COMPOUND'],
    trx = db
  } = options;

  const createdTopics: TestTopic[] = [];
  const createdPosts: TestPost[] = [];

  // Create topics for each forum
  for (const forumName of forums) {
    for (let i = 0; i < topics; i++) {
      const topic = createTestTopic({ forum_name: forumName });
      
      await trx('topics').insert({
        id: topic.id,
        forum_name: topic.forum_name,
        title: topic.title,
        posts_count: topic.posts_count,
        created_at: topic.created_at,
        updated_at: topic.updated_at,
        discourse_topic_id: topic.discourse_topic_id,
        category_id: topic.category_id,
        slug: topic.slug,
        views: topic.views,
        reply_count: topic.reply_count,
        like_count: topic.like_count,
        last_posted_at: topic.last_posted_at,
      });
      
      createdTopics.push(topic);
    }
  }

  // Create posts for each topic
  for (const topic of createdTopics) {
    for (let i = 0; i < posts; i++) {
      const post = createTestPost({ 
        topic_id: topic.id, 
        forum_name: topic.forum_name 
      });
      
      await trx('posts').insert({
        id: post.id,
        topic_id: post.topic_id,
        forum_name: post.forum_name,
        title: post.title,
        content: post.content,
        author: post.author,
        author_id: post.author_id,
        post_number: post.post_number,
        created_at: post.created_at,
        updated_at: post.updated_at,
        reply_count: post.reply_count,
        like_count: post.like_count,
        raw: post.raw,
        cooked: post.cooked,
        discourse_post_id: post.discourse_post_id,
        discourse_topic_id: post.discourse_topic_id,
        avatar_template: post.avatar_template,
        username: post.username,
        evaluated: post.evaluated,
      });
      
      createdPosts.push(post);
    }
  }

  return { topics: createdTopics, posts: createdPosts };
}

/**
 * Create test post evaluations in database
 */
export async function seedTestEvaluations(posts: TestPost[], trx: any = db) {
  const evaluations: TestPostEvaluation[] = [];
  
  for (const post of posts) {
    const evaluation = createTestPostEvaluation({
      post_id: post.id,
      forum_name: post.forum_name,
    });
    
    await trx('post_evaluations').insert({
      id: evaluation.id,
      post_id: evaluation.post_id,
      forum_name: evaluation.forum_name,
      quality_score: evaluation.quality_score,
      relevance_score: evaluation.relevance_score,
      summary: evaluation.summary,
      tags: JSON.stringify(evaluation.tags),
      evaluation_data: JSON.stringify(evaluation.evaluation_data),
      created_at: evaluation.created_at,
      updated_at: evaluation.updated_at,
    });
    
    evaluations.push(evaluation);
  }
  
  return evaluations;
}

/**
 * Get test posts from database
 */
export async function getTestPosts(forum?: string, trx: any = db) {
  let query = trx('posts').select('*');
  
  if (forum) {
    query = query.where('forum_name', forum);
  }
  
  return await query;
}

/**
 * Get test topics from database
 */
export async function getTestTopics(forum?: string, trx: any = db) {
  let query = trx('topics').select('*');
  
  if (forum) {
    query = query.where('forum_name', forum);
  }
  
  return await query;
}

/**
 * Verify database connection is working
 */
export async function verifyDatabaseConnection() {
  try {
    const isHealthy = await pgVectorClient.healthCheck();
    if (!isHealthy) {
      throw new Error('Database health check failed');
    }
    
    // Test basic query
    const result = await db.raw('SELECT 1 as test');
    if (result.rows[0].test !== 1) {
      throw new Error('Database query test failed');
    }
    
    return true;
  } catch (error) {
    console.error('Database connection verification failed:', error);
    return false;
  }
}

/**
 * Wait for database to be ready
 */
export async function waitForDatabase(maxAttempts: number = 10, delayMs: number = 1000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const isConnected = await verifyDatabaseConnection();
    
    if (isConnected) {
      console.log(`✅ Database ready after ${attempt} attempt(s)`);
      return true;
    }
    
    if (attempt < maxAttempts) {
      console.log(`⏳ Database not ready, attempt ${attempt}/${maxAttempts}, retrying...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  throw new Error(`Database not ready after ${maxAttempts} attempts`);
}