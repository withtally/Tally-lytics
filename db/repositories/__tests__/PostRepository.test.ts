import { describe, test, expect, beforeEach } from '@jest/globals';

// Comprehensive tests for PostRepository

// Create mock database using the proven thenable pattern
let mockQueryResult: any = [];
let mockFirstResult: any = null;
let mockCountResult: any = [{ count: '0' }];
let mockInsertResult: any = [];

const createMockQueryBuilder = (): any => {
  const queryBuilder: any = {
    // Terminal methods that return promises
    first: jest.fn(() => Promise.resolve(mockFirstResult)),
    del: jest.fn(() => Promise.resolve(1)),
    insert: jest.fn(() => Promise.resolve(mockInsertResult)),
    update: jest.fn(() => Promise.resolve(1)),

    // Make the query builder itself thenable (for `await query`)
    then: jest.fn((resolve: any) => {
      if (resolve) {
        return Promise.resolve(resolve(mockQueryResult));
      }
      return Promise.resolve(mockQueryResult);
    }),
    catch: jest.fn((handler: any) => Promise.resolve()),
  };

  // Add chainable methods that return the query builder
  queryBuilder.select = jest.fn(() => queryBuilder);
  queryBuilder.where = jest.fn(() => queryBuilder);
  queryBuilder.whereNull = jest.fn(() => queryBuilder);
  queryBuilder.whereNotNull = jest.fn(() => queryBuilder);
  queryBuilder.orderBy = jest.fn(() => queryBuilder);
  queryBuilder.limit = jest.fn(() => queryBuilder);
  queryBuilder.count = jest.fn(() => queryBuilder);
  queryBuilder.join = jest.fn(() => queryBuilder);
  queryBuilder.leftJoin = jest.fn(() => queryBuilder);

  return queryBuilder;
};

// Track all created query builders for multiple queries
const allQueryBuilders: any[] = [];
const mockDb = jest.fn(() => {
  const builder = createMockQueryBuilder();
  allQueryBuilders.push(builder);
  return builder;
});

// Mock transaction functionality
(mockDb as any).transaction = jest.fn(async (callback: any) => {
  const trx = jest.fn(() => createMockQueryBuilder());
  return await callback(trx);
});

jest.mock('../../db', () => ({
  default: mockDb,
}));

import { PostRepository } from '../PostRepository';
import type { Post, PostFilter } from '../IPostRepository';
import db from '../../db';

describe('PostRepository', () => {
  let postRepository: PostRepository;

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

    postRepository = new PostRepository(db);
  });

  describe('findById', () => {
    test('should return post when found', async () => {
      const mockPost = {
        id: '1',
        topic_id: '1',
        content: 'Test post content',
        forum_name: 'arbitrum',
        created_at: new Date(),
      };
      mockFirstResult = mockPost;

      const result = await postRepository.findById('1');
      expect(result).toEqual(mockPost);
    });

    test('should return null when post not found', async () => {
      mockFirstResult = null;

      const result = await postRepository.findById('999');
      expect(result).toBeNull();
    });

    test('should handle string ID', async () => {
      const mockPost = { id: '1', content: 'Test Post' };
      mockFirstResult = mockPost;

      const result = await postRepository.findById('1');
      expect(result).toEqual(mockPost);
    });
  });

  describe('find', () => {
    test('should return all posts without filters', async () => {
      const mockPosts = [
        { id: '1', content: 'Post 1', forum_name: 'arbitrum' },
        { id: '2', content: 'Post 2', forum_name: 'compound' },
      ];
      mockQueryResult = mockPosts;

      const result = await postRepository.find({});
      expect(result).toEqual(mockPosts);
    });

    test('should apply topic filter', async () => {
      const filter: PostFilter = { topic_id: '1' };
      const mockPosts = [{ id: '1', content: 'Post 1', topic_id: '1' }];
      mockQueryResult = mockPosts;

      const result = await postRepository.find(filter);
      expect(result).toEqual(mockPosts);
    });

    test('should apply forum filter', async () => {
      const filter: PostFilter = { forum_name: 'arbitrum' };
      const mockPosts = [{ id: '1', content: 'Post 1', forum_name: 'arbitrum' }];
      mockQueryResult = mockPosts;

      const result = await postRepository.find(filter);
      expect(result).toEqual(mockPosts);
    });

    test('should apply date range filters', async () => {
      const filter: PostFilter = {
        created_after: new Date('2023-01-01'),
        created_before: new Date('2023-12-31'),
      };
      const mockPosts = [{ id: '1', content: 'Post 1' }];
      mockQueryResult = mockPosts;

      const result = await postRepository.find(filter);
      expect(result).toEqual(mockPosts);
    });

    test('should apply quality score filters', async () => {
      const filter: PostFilter = { quality_score_min: 7.0, quality_score_max: 9.0 };
      const mockPosts = [{ id: '1', content: 'Post 1' }];
      mockQueryResult = mockPosts;

      const result = await postRepository.find(filter);
      expect(result).toEqual(mockPosts);
    });
  });

  describe('find by topic_id', () => {
    test('should return posts for topic', async () => {
      const mockPosts = [
        { id: '1', topic_id: '1', content: 'Post 1' },
        { id: '2', topic_id: '1', content: 'Post 2' },
      ];
      mockQueryResult = mockPosts;

      const result = await postRepository.find({ topic_id: '1' });
      expect(result).toEqual(mockPosts);
    });

    test('should return empty array for topic with no posts', async () => {
      mockQueryResult = [];

      const result = await postRepository.find({ topic_id: '999' });
      expect(result).toEqual([]);
    });
  });

  describe('getCountByForum', () => {
    test('should return count for forum', async () => {
      mockFirstResult = { count: '42' };

      const result = await postRepository.getCountByForum('arbitrum');
      expect(result).toBe(42);
    });

    test('should return count for different forum', async () => {
      mockFirstResult = { count: '15' };

      const result = await postRepository.getCountByForum('compound');
      expect(result).toBe(15);
    });

    test('should handle zero count', async () => {
      mockFirstResult = { count: '0' };

      const result = await postRepository.getCountByForum('empty-forum');
      expect(result).toBe(0);
    });
  });

  describe('create', () => {
    test('should create post and return Post object', async () => {
      const postData: Omit<Post, 'created_at' | 'updated_at'> = {
        id: '123',
        topic_id: '1',
        content: 'New post content',
        forum_name: 'arbitrum',
        author: 'test_user',
        author_id: 'user123',
        post_number: 1,
      };
      const createdPost = {
        ...postData,
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockInsertResult = [createdPost];

      const result = await postRepository.create(postData);
      expect(result).toEqual(createdPost);
    });

    test('should handle post with minimal required fields', async () => {
      const postData = {
        id: '456',
        topic_id: '1',
        content: 'Minimal post',
        forum_name: 'compound',
        author: 'test_user',
        author_id: 'user456',
        post_number: 1,
      };
      const createdPost = {
        ...postData,
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockInsertResult = [createdPost];

      const result = await postRepository.create(postData as any);
      expect(result).toEqual(createdPost);
    });
  });

  describe('update', () => {
    test('should update post and return updated Post object', async () => {
      const updates = { content: 'Updated content' };
      const updatedPost = {
        id: '1',
        topic_id: '1',
        content: 'Updated content',
        forum_name: 'arbitrum',
        author: 'test_user',
        author_id: 'user1',
        post_number: 1,
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockFirstResult = updatedPost;

      const result = await postRepository.update('1', updates);
      expect(result).toEqual(updatedPost);
    });

    test('should handle updating non-existent post', async () => {
      const updates = { content: 'Updated content' };
      // Mock returning null for non-existent post
      const builder = createMockQueryBuilder();
      builder.first = jest.fn(() => Promise.resolve(null));
      mockDb.mockReturnValue(builder);

      await expect(postRepository.update('999', updates)).rejects.toThrow();
    });
  });

  describe('delete', () => {
    test('should delete post', async () => {
      await expect(postRepository.delete('1')).resolves.toBeUndefined();
    });

    test('should handle non-existent post', async () => {
      const builder = createMockQueryBuilder();
      builder.del = jest.fn(() => Promise.resolve(0));
      mockDb.mockReturnValue(builder);

      await expect(postRepository.delete('999')).resolves.toBeUndefined();
    });
  });

  describe('transaction handling', () => {
    test('should work within transactions', async () => {
      const postData = {
        id: '789',
        topic_id: '1',
        content: 'Transaction post',
        forum_name: 'arbitrum',
        author: 'test_user',
        author_id: 'user789',
        post_number: 1,
      };
      const createdPost = {
        ...postData,
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockInsertResult = [createdPost];

      let transactionPost: Post | undefined;
      await db.transaction(async (trx: any) => {
        const repo = new PostRepository(trx);
        transactionPost = await repo.create(postData as any);
      });

      expect(transactionPost).toEqual(createdPost);
    });
  });

  describe('error handling', () => {
    test('should handle database errors', async () => {
      const builder = createMockQueryBuilder();
      builder.first = jest.fn(() => Promise.reject(new Error('Database error')));
      mockDb.mockReturnValue(builder);

      await expect(postRepository.findById('1')).rejects.toThrow('Database error');
    });
  });

  describe('data validation', () => {
    test('should handle posts with all optional fields', async () => {
      const mockPost = {
        id: '1',
        topic_id: '1',
        content: 'Complete post content',
        forum_name: 'arbitrum',
        created_at: new Date(),
        updated_at: new Date(),
        author: 'test_user',
        author_id: 'user1',
        post_number: 5,
        reply_count: 2,
        quality_score: 8.5,
        raw: 'Raw markdown content',
      };
      mockFirstResult = mockPost;

      const result = await postRepository.findById('1');
      expect(result).toEqual(mockPost);
    });

    test('should handle posts with null optional fields', async () => {
      const mockPost = {
        id: '1',
        topic_id: '1',
        content: 'Minimal post',
        forum_name: 'arbitrum',
        author: 'test_user',
        author_id: 'user1',
        post_number: 1,
        created_at: new Date(),
        updated_at: new Date(),
        title: null,
        reply_count: null,
        like_count: null,
        quality_score: null,
        raw: null,
      };
      mockFirstResult = mockPost;

      const result = await postRepository.findById('1');
      expect(result).toEqual(mockPost);
    });
  });

  describe('complex filtering', () => {
    test('should handle multiple filters simultaneously', async () => {
      const filter: PostFilter = {
        topic_id: '1',
        forum_name: 'arbitrum',
        created_after: new Date('2023-01-01'),
        created_before: new Date('2023-12-31'),
        quality_score_min: 5.0,
        quality_score_max: 10.0,
      };
      const mockPosts = [{ id: '1', content: 'Filtered post' }];
      mockQueryResult = mockPosts;

      const result = await postRepository.find(filter);
      expect(result).toEqual(mockPosts);
    });

    test('should handle empty filter object', async () => {
      const filter: PostFilter = {};
      const mockPosts = [{ id: '1', content: 'All posts' }];
      mockQueryResult = mockPosts;

      const result = await postRepository.find(filter);
      expect(result).toEqual(mockPosts);
    });
  });

  describe('content handling', () => {
    test('should handle posts with special characters in content', async () => {
      const mockPost = {
        id: '1',
        content: 'Post with émojis 🚀 and special chars: @#$%^&*()',
        forum_name: 'arbitrum',
      };
      mockFirstResult = mockPost;

      const result = await postRepository.findById('1');
      expect(result).toEqual(mockPost);
    });

    test('should handle posts with very long content', async () => {
      const longContent = 'a'.repeat(10000);
      const mockPost = {
        id: '1',
        content: longContent,
        forum_name: 'arbitrum',
      };
      mockFirstResult = mockPost;

      const result = await postRepository.findById('1');
      expect(result).toEqual(mockPost);
    });

    test('should handle posts with empty content', async () => {
      const mockPost = {
        id: '1',
        content: '',
        forum_name: 'arbitrum',
      };
      mockFirstResult = mockPost;

      const result = await postRepository.findById('1');
      expect(result).toEqual(mockPost);
    });
  });
});