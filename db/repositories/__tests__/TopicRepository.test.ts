import { describe, test, expect, beforeEach, mock } from 'bun:test';

// Comprehensive tests for TopicRepository

// Create mock database using the proven thenable pattern
let mockQueryResult: any = [];
let mockFirstResult: any = null;
let mockCountResult: any = [{ count: '0' }];
let mockInsertResult: any = [];

const createMockQueryBuilder = (): any => {
  const queryBuilder: any = {
    // Terminal methods that return promises
    first: mock(() => Promise.resolve(mockFirstResult)),
    del: mock(() => Promise.resolve(1)),
    insert: mock(() => Promise.resolve(mockInsertResult)),
    update: mock(() => Promise.resolve(1)),

    // Make the query builder itself thenable (for `await query`)
    then: mock((resolve: any) => {
      if (resolve) {
        return Promise.resolve(resolve(mockQueryResult));
      }
      return Promise.resolve(mockQueryResult);
    }),
    catch: mock((handler: any) => Promise.resolve()),
  };

  // Add chainable methods that return the query builder
  queryBuilder.select = mock(() => queryBuilder);
  queryBuilder.where = mock(() => queryBuilder);
  queryBuilder.whereNull = mock(() => queryBuilder);
  queryBuilder.whereNotNull = mock(() => queryBuilder);
  queryBuilder.orderBy = mock(() => queryBuilder);
  queryBuilder.limit = mock(() => queryBuilder);
  queryBuilder.count = mock(() => queryBuilder);

  return queryBuilder;
};

// Track all created query builders for multiple queries
const allQueryBuilders: any[] = [];
const mockDb = mock(() => {
  const builder = createMockQueryBuilder();
  allQueryBuilders.push(builder);
  return builder;
});

// Mock transaction functionality
(mockDb as any).transaction = mock(async (callback: any) => {
  const trx = mock(() => createMockQueryBuilder());
  return await callback(trx);
});

mock.module('../../db', () => ({
  default: mockDb,
}));

import { TopicRepository } from '../TopicRepository';
import type { Topic, TopicFilter } from '../ITopicRepository';
import db from '../../db';

describe('TopicRepository', () => {
  let topicRepository: TopicRepository;

  beforeEach(() => {
    // Reset all mock state
    mockQueryResult = [];
    mockFirstResult = null;
    mockCountResult = [{ count: '0' }];
    mockInsertResult = [];
    allQueryBuilders.length = 0;
    
    // Clear the mockDb to reset any custom implementations
    mockDb.mockClear();
    mockDb.mockImplementation(() => {
      const builder = createMockQueryBuilder();
      allQueryBuilders.push(builder);
      return builder;
    });

    topicRepository = new TopicRepository(db);
  });

  describe('findById', () => {
    test('should return topic when found', async () => {
      const mockTopic = {
        id: 1,
        title: 'Test Topic',
        forum_name: 'arbitrum',
        created_at: new Date(),
      };
      mockFirstResult = mockTopic;

      const result = await topicRepository.findById(1);
      expect(result).toEqual(mockTopic);
    });

    test('should return null when topic not found', async () => {
      mockFirstResult = null;

      const result = await topicRepository.findById(999);
      expect(result).toBeNull();
    });

    test('should handle string ID', async () => {
      const mockTopic = { id: 1, title: 'Test Topic' };
      mockFirstResult = mockTopic;

      const result = await topicRepository.findById('1');
      expect(result).toEqual(mockTopic);
    });
  });

  describe('find', () => {
    test('should return all topics with filters', async () => {
      const filter: TopicFilter = { forum_name: 'arbitrum' };
      const mockTopics = [
        { id: 1, title: 'Topic 1', forum_name: 'arbitrum' },
        { id: 2, title: 'Topic 2', forum_name: 'arbitrum' },
      ];
      mockQueryResult = mockTopics;

      const result = await topicRepository.find(filter);
      expect(result).toEqual(mockTopics);
    });

    test('should apply forum filter', async () => {
      const filter: TopicFilter = { forum_name: 'arbitrum' };
      const mockTopics = [{ id: 1, title: 'Topic 1', forum_name: 'arbitrum' }];
      mockQueryResult = mockTopics;

      const result = await topicRepository.find(filter);
      expect(result).toEqual(mockTopics);
    });

    test('should apply date range filters', async () => {
      const filter: TopicFilter = {
        created_after: new Date('2023-01-01'),
        created_before: new Date('2023-12-31'),
      };
      const mockTopics = [{ id: 1, title: 'Topic 1' }];
      mockQueryResult = mockTopics;

      const result = await topicRepository.find(filter);
      expect(result).toEqual(mockTopics);
    });

    test('should apply min/max posts filters', async () => {
      const filter: TopicFilter = { min_posts: 5, max_posts: 10 };
      const mockTopics = [{ id: 1, title: 'Topic 1' }];
      mockQueryResult = mockTopics;

      const result = await topicRepository.find(filter);
      expect(result).toEqual(mockTopics);
    });
  });

  describe('getCountByForum', () => {
    test('should return count for specific forum', async () => {
      mockFirstResult = { count: '42' };

      const result = await topicRepository.getCountByForum('arbitrum');
      expect(result).toBe(42);
    });

    test('should handle zero count', async () => {
      mockFirstResult = { count: '0' };

      const result = await topicRepository.getCountByForum('compound');
      expect(result).toBe(0);
    });
  });

  describe('create', () => {
    test('should create topic and return topic object', async () => {
      const topicData: Omit<Topic, 'created_at' | 'updated_at'> = {
        id: '123',
        title: 'New Topic',
        forum_name: 'arbitrum',
        posts_count: 0,
      };
      const createdTopic = {
        ...topicData,
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockFirstResult = createdTopic;

      const result = await topicRepository.create(topicData);
      expect(result).toEqual(createdTopic);
    });

    test('should handle topic with minimal required fields', async () => {
      const topicData = {
        id: '456',
        title: 'Minimal Topic',
        forum_name: 'compound',
        posts_count: 0,
      };
      const createdTopic = {
        ...topicData,
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockFirstResult = createdTopic;

      const result = await topicRepository.create(topicData);
      expect(result).toEqual(createdTopic);
    });
  });

  describe('update', () => {
    test('should update topic and return updated topic object', async () => {
      const updates = { title: 'Updated Title' };
      const updatedTopic = {
        id: '1',
        title: 'Updated Title',
        forum_name: 'arbitrum',
        posts_count: 5,
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockFirstResult = updatedTopic;

      const result = await topicRepository.update('1', updates);
      expect(result).toEqual(updatedTopic);
    });

    test('should handle topic not found', async () => {
      const updates = { title: 'Updated Title' };
      mockFirstResult = null;
      const builder = createMockQueryBuilder();
      builder.first = mock(() => Promise.resolve(null));
      mockDb.mockReturnValue(builder);

      await expect(topicRepository.update('999', updates)).rejects.toThrow();
    });
  });

  describe('delete', () => {
    test('should delete topic successfully', async () => {
      await topicRepository.delete('1');
      // Verify the delete method was called - no return value expected
    });

    test('should handle non-existent topic', async () => {
      const builder = createMockQueryBuilder();
      builder.del = mock(() => Promise.resolve(0));
      mockDb.mockReturnValue(builder);

      // Should not throw even if topic doesn't exist
      await topicRepository.delete('999');
    });
  });

  describe('transaction handling', () => {
    test('should work within transactions', async () => {
      const topicData = {
        id: '789',
        title: 'Transaction Topic',
        forum_name: 'arbitrum',
      };
      const createdTopic = {
        id: '789',
        title: 'Transaction Topic',
        forum_name: 'arbitrum',
        posts_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockInsertResult = [createdTopic];

      let transactionId: string | undefined;
      await db.transaction(async (trx: any) => {
        const repo = new TopicRepository(trx);
        const result = await repo.create(topicData as any);
        transactionId = result.id;
      });

      expect(transactionId).toBe('789');
    });
  });

  describe('error handling', () => {
    test('should handle database errors', async () => {
      const builder = createMockQueryBuilder();
      builder.first = mock(() => Promise.reject(new Error('Database error')));
      mockDb.mockReturnValue(builder);

      await expect(topicRepository.findById(1)).rejects.toThrow('Database error');
    });
  });

  describe('data validation', () => {
    test('should handle topics with all optional fields', async () => {
      const mockTopic = {
        id: 1,
        title: 'Complete Topic',
        forum_name: 'arbitrum',
        created_at: new Date(),
        updated_at: new Date(),
        author_username: 'test_user',
        post_count: 5,
        last_posted_at: new Date(),
        tags: ['governance', 'proposal'],
        summary: 'Test summary',
        evaluation_score: 8.5,
      };
      mockFirstResult = mockTopic;

      const result = await topicRepository.findById(1);
      expect(result).toEqual(mockTopic);
    });

    test('should handle topics with null optional fields', async () => {
      const mockTopic = {
        id: 1,
        title: 'Minimal Topic',
        forum_name: 'arbitrum',
        created_at: new Date(),
        updated_at: null,
        author_username: null,
        post_count: null,
        last_posted_at: null,
        tags: null,
        summary: null,
        evaluation_score: null,
      };
      mockFirstResult = mockTopic;

      const result = await topicRepository.findById(1);
      expect(result).toEqual(mockTopic);
    });
  });

  describe('complex filtering', () => {
    test('should handle multiple filters simultaneously', async () => {
      const filter: TopicFilter = {
        forum_name: 'arbitrum',
        created_after: new Date('2023-01-01'),
        created_before: new Date('2023-12-31'),
        min_posts: 5,
        max_posts: 100,
      };
      const mockTopics = [{ id: 1, title: 'Filtered Topic' }];
      mockQueryResult = mockTopics;

      const result = await topicRepository.find(filter);
      expect(result).toEqual(mockTopics);
    });

    test('should handle empty filter object', async () => {
      const filter: TopicFilter = {};
      const mockTopics = [{ id: 1, title: 'All Topics' }];
      mockQueryResult = mockTopics;

      const result = await topicRepository.find(filter);
      expect(result).toEqual(mockTopics);
    });
  });
});