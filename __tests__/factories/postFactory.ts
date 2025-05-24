// __tests__/factories/postFactory.ts - Factory for creating test post data

import { faker } from '@faker-js/faker';
import { randomForumName, randomUUID, randomRecentDate, randomContent, randomScore, randomTags } from '../setup/testUtils';

export interface TestPost {
  id: string;
  topic_id: string;
  forum_name: string;
  title?: string;
  content: string;
  author: string;
  author_id: string;
  post_number: number;
  created_at: Date;
  updated_at: Date;
  reply_count?: number;
  like_count?: number;
  raw?: string;
  cooked?: string;
  discourse_post_id?: number;
  discourse_topic_id?: number;
  avatar_template?: string;
  username?: string;
  evaluated?: boolean;
  ai_summary?: string;
  ai_tags?: string[];
  quality_score?: number;
  relevance_score?: number;
}

export interface TestPostEvaluation {
  id: string;
  post_id: string;
  forum_name: string;
  quality_score: number;
  relevance_score: number;
  summary: string;
  tags: string[];
  evaluation_data: any;
  created_at: Date;
  updated_at: Date;
}

export interface TestTopic {
  id: string;
  forum_name: string;
  title: string;
  posts_count: number;
  created_at: Date;
  updated_at: Date;
  discourse_topic_id?: number;
  category_id?: number;
  slug?: string;
  views?: number;
  reply_count?: number;
  like_count?: number;
  last_posted_at?: Date;
  ai_summary?: string;
  ai_tags?: string[];
  quality_score?: number;
}

/**
 * Create a test post with realistic data
 */
export const createTestPost = (overrides: Partial<TestPost> = {}): TestPost => {
  const basePost: TestPost = {
    id: randomUUID(),
    topic_id: randomUUID(),
    forum_name: randomForumName(),
    title: faker.lorem.sentence(),
    content: randomContent('medium'),
    author: faker.person.fullName(),
    author_id: randomUUID(),
    post_number: faker.number.int({ min: 1, max: 100 }),
    created_at: randomRecentDate(),
    updated_at: randomRecentDate(),
    reply_count: faker.number.int({ min: 0, max: 50 }),
    like_count: faker.number.int({ min: 0, max: 20 }),
    raw: randomContent('medium'),
    cooked: `<p>${randomContent('medium')}</p>`,
    discourse_post_id: faker.number.int({ min: 1000, max: 99999 }),
    discourse_topic_id: faker.number.int({ min: 100, max: 9999 }),
    avatar_template: '/user_avatar/forum.arbitrum.foundation/{size}/123_2.png',
    username: faker.internet.username(),
    evaluated: false,
    ai_summary: null,
    ai_tags: null,
    quality_score: null,
    relevance_score: null,
  };

  return { ...basePost, ...overrides };
};

/**
 * Create a test post that has been evaluated
 */
export const createEvaluatedTestPost = (overrides: Partial<TestPost> = {}): TestPost => {
  return createTestPost({
    evaluated: true,
    ai_summary: faker.lorem.paragraph(),
    ai_tags: randomTags(3),
    quality_score: randomScore(),
    relevance_score: randomScore(),
    ...overrides,
  });
};

/**
 * Create a test post evaluation
 */
export const createTestPostEvaluation = (overrides: Partial<TestPostEvaluation> = {}): TestPostEvaluation => {
  const baseEvaluation: TestPostEvaluation = {
    id: randomUUID(),
    post_id: randomUUID(),
    forum_name: randomForumName(),
    quality_score: randomScore(),
    relevance_score: randomScore(),
    summary: faker.lorem.paragraph(),
    tags: randomTags(3),
    evaluation_data: {
      reasoning: faker.lorem.paragraph(),
      confidence: randomScore(),
      model_used: 'gpt-3.5-turbo',
    },
    created_at: randomRecentDate(),
    updated_at: randomRecentDate(),
  };

  return { ...baseEvaluation, ...overrides };
};

/**
 * Create a test topic
 */
export const createTestTopic = (overrides: Partial<TestTopic> = {}): TestTopic => {
  const baseTopic: TestTopic = {
    id: randomUUID(),
    forum_name: randomForumName(),
    title: faker.lorem.sentence(),
    posts_count: faker.number.int({ min: 1, max: 100 }),
    created_at: randomRecentDate(),
    updated_at: randomRecentDate(),
    discourse_topic_id: faker.number.int({ min: 100, max: 9999 }),
    category_id: faker.number.int({ min: 1, max: 20 }),
    slug: faker.lorem.slug(),
    views: faker.number.int({ min: 10, max: 1000 }),
    reply_count: faker.number.int({ min: 0, max: 99 }),
    like_count: faker.number.int({ min: 0, max: 50 }),
    last_posted_at: randomRecentDate(),
    ai_summary: null,
    ai_tags: null,
    quality_score: null,
  };

  return { ...baseTopic, ...overrides };
};

/**
 * Create multiple test posts
 */
export const createTestPosts = (count: number, overrides: Partial<TestPost> = {}): TestPost[] => {
  return Array.from({ length: count }, () => createTestPost(overrides));
};

/**
 * Create test posts for a specific topic
 */
export const createTestPostsForTopic = (topicId: string, count: number = 5): TestPost[] => {
  return createTestPosts(count, { topic_id: topicId });
};

/**
 * Create test posts for a specific forum
 */
export const createTestPostsForForum = (forumName: string, count: number = 10): TestPost[] => {
  return createTestPosts(count, { forum_name: forumName });
};

/**
 * Create a test post with specific content for testing LLM evaluation
 */
export const createTestPostForEvaluation = (contentType: 'high_quality' | 'low_quality' | 'spam' = 'high_quality'): TestPost => {
  let content: string;
  let title: string;
  
  switch (contentType) {
    case 'high_quality':
      title = 'Proposal: Improve governance voting mechanism';
      content = `I propose we implement a new voting mechanism that addresses the current issues with voter participation. 

Key improvements:
1. Implement quadratic voting to reduce whale influence
2. Add delegation features for inactive voters
3. Introduce time-weighted voting based on token holding period

This would significantly improve our governance process and ensure more equitable representation of community interests.

Technical implementation details:
- Smart contract updates required for voting logic
- UI changes needed for delegation interface
- Migration plan for existing proposals

I welcome feedback from the community on this proposal.`;
      break;
      
    case 'low_quality':
      title = 'Question about stuff';
      content = 'hey guys, i have a question about the thing. can someone help me? thanks';
      break;
      
    case 'spam':
      title = 'Amazing opportunity!!!';
      content = 'Get rich quick with this amazing opportunity! Click here to learn more about making money fast!!! 🚀🚀🚀';
      break;
      
    default:
      content = randomContent();
      title = faker.lorem.sentence();
  }

  return createTestPost({
    title,
    content,
    raw: content,
    cooked: `<p>${content.replace(/\n/g, '</p><p>')}</p>`,
  });
};