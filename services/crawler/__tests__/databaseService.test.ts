// services/crawler/__tests__/databaseService.test.ts

import { describe, test, beforeEach, expect } from '@jest/globals';

// Mock the dependencies
jest.mock('../../../db/db', () => ({
  default: jest.fn(),
}));
jest.mock('html-to-text', () => ({
  htmlToText: jest.fn(),
}));
jest.mock('../../user/userService', () => ({
  default: { upsertUser: jest.fn() },
}));
jest.mock('../../logging', () => ({
  Logger: jest.fn(),
}));
jest.mock('../../../config/loggerConfig', () => ({
  loggerConfig: { level: 'info' },
}));

// Import after mocking
import { DatabaseService } from '../databaseService';
import { htmlToText } from 'html-to-text';
import userService from '../../user/userService';
import { Logger } from '../../logging';
import db from '../../../db/db';

describe.skip('DatabaseService', () => {
  let databaseService: DatabaseService;
  let mockDb: any;
  let mockLogger: any;
  let mockUserService: any;
  let mockHtmlToText: any;

  beforeEach(() => {
    // Mock database with method chaining
    mockDb = {
      raw: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }),
      where: jest.fn(),
      max: jest.fn(),
      first: jest.fn(),
      insert: jest.fn(),
      onConflict: jest.fn(),
      merge: jest.fn(),
    };

    // Set up method chaining
    mockDb.where.mockReturnThis();
    mockDb.max.mockReturnThis();
    mockDb.insert.mockReturnThis();
    mockDb.onConflict.mockReturnThis();

    // Mock Logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    // Mock userService
    mockUserService = {
      upsertUser: jest.fn().mockResolvedValue(undefined),
    };

    // Mock htmlToText
    mockHtmlToText = jest.fn((html: string) => html.replace(/<[^>]*>/g, ''));

    // Assign mocks to imported modules
    Object.assign(dbDb);
    Object.assign(
      db,
      jest.fn().mockImplementation(() => mockDb)
    );
    (Logger as any).mockImplementation(() => mockLogger);
    (userService as any).upsertUser = mockUserService.upsertUser;
    (htmlToText as any).mockImplementation(mockHtmlToText);

    // Clear all mocks
    mock.restore();

    // Create service instance
    databaseService = new DatabaseService({});
  });

  describe.skip('constructor', () => {
    test('should initialize with database connection test', async () => {
      expect(mockDb.raw).toHaveBeenCalledWith('SELECT 1');
      expect(mockLogger.info).toHaveBeenCalledWith('Database connection established successfully');
    });
  });

  describe.skip('getLatestTopicTimestamp', () => {
    test('should return latest timestamp when topics exist', async () => {
      const mockTimestamp = '2023-12-01T10:00:00.000Z';
      mockDb.first.mockResolvedValue({ latest_timestamp: mockTimestamp });

      const result = await databaseService.getLatestTopicTimestamp('test-forum');

      expect(mockDb.where).toHaveBeenCalledWith({ forum_name: 'test-forum' });
      expect(mockDb.max).toHaveBeenCalledWith('created_at as latest_timestamp');
      expect(result).toEqual(new Date(mockTimestamp));
    });

    test('should return null when no topics exist', async () => {
      mockDb.first.mockResolvedValue(null);

      const result = await databaseService.getLatestTopicTimestamp('test-forum');

      expect(result).toBeNull();
    });

    test('should return null when timestamp is null', async () => {
      mockDb.first.mockResolvedValue({ latest_timestamp: null });

      const result = await databaseService.getLatestTopicTimestamp('test-forum');

      expect(result).toBeNull();
    });
  });

  describe.skip('getLatestPostTimestamp', () => {
    test('should return latest timestamp when posts exist', async () => {
      const mockTimestamp = '2023-12-01T15:30:00.000Z';
      mockDb.first.mockResolvedValue({ latest_timestamp: mockTimestamp });

      const result = await databaseService.getLatestPostTimestamp('test-forum');

      expect(mockDb.where).toHaveBeenCalledWith({ forum_name: 'test-forum' });
      expect(mockDb.max).toHaveBeenCalledWith('created_at as latest_timestamp');
      expect(result).toEqual(new Date(mockTimestamp));
    });

    test('should return null when no posts exist', async () => {
      mockDb.first.mockResolvedValue(null);

      const result = await databaseService.getLatestPostTimestamp('test-forum');

      expect(result).toBeNull();
    });
  });

  describe.skip('insertPost', () => {
    const mockPost = {
      id: 123,
      topic_id: 456,
      username: 'testuser',
      cooked: '<p>This is a <strong>test</strong> post.</p>',
      created_at: '2023-12-01T10:00:00.000Z',
      updated_at: '2023-12-01T11:00:00.000Z',
    };

    beforeEach(() => {
      mockDb.insert.mockResolvedValue(undefined);
      mockDb.merge.mockResolvedValue(undefined);
    });

    test('should insert post with converted HTML to text', async () => {
      await databaseService.insertPost(mockPost, 'test-forum');

      expect(mockHtmlToText).toHaveBeenCalledWith(mockPost.cooked, { wordwrap: 130 });
      expect(mockDb.insert).toHaveBeenCalledWith({
        id: mockPost.id,
        forum_name: 'test-forum',
        topic_id: mockPost.topic_id,
        username: mockPost.username,
        plain_text: 'This is a test post.',
        cooked: mockPost.cooked,
        created_at: mockPost.created_at,
        updated_at: mockPost.updated_at,
      });
      expect(mockDb.onConflict).toHaveBeenCalledWith(['id', 'forum_name']);
      expect(mockDb.merge).toHaveBeenCalled();
    });

    test('should use created_at as updated_at when updated_at is missing', async () => {
      const postWithoutUpdatedAt = {
        ...mockPost,
        updated_at: undefined as any,
      };

      await databaseService.insertPost(postWithoutUpdatedAt, 'test-forum');

      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          updated_at: mockPost.created_at,
        })
      );
    });
  });

  describe.skip('insertTopic', () => {
    const mockTopic = {
      id: 789,
      title: 'Test Topic',
      slug: 'test-topic',
      posts_count: 5,
      created_at: '2023-12-01T09:00:00.000Z',
      updated_at: '2023-12-01T12:00:00.000Z',
      last_posted_at: '2023-12-01T11:30:00.000Z',
      bumped_at: '2023-12-01T11:45:00.000Z',
    };

    beforeEach(() => {
      mockDb.insert.mockResolvedValue(undefined);
      mockDb.merge.mockResolvedValue(undefined);
    });

    test('should insert topic with primary updated_at timestamp', async () => {
      await databaseService.insertTopic(mockTopic, 'test-forum');

      expect(mockDb.insert).toHaveBeenCalledWith({
        id: mockTopic.id,
        forum_name: 'test-forum',
        title: mockTopic.title,
        slug: mockTopic.slug,
        posts_count: mockTopic.posts_count,
        created_at: mockTopic.created_at,
        updated_at: mockTopic.updated_at,
      });
      expect(mockDb.onConflict).toHaveBeenCalledWith(['id', 'forum_name']);
      expect(mockDb.merge).toHaveBeenCalled();
    });

    test('should fallback to last_posted_at when updated_at is missing', async () => {
      const topicWithoutUpdatedAt = {
        ...mockTopic,
        updated_at: undefined,
      };

      await databaseService.insertTopic(topicWithoutUpdatedAt, 'test-forum');

      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          updated_at: mockTopic.last_posted_at,
        })
      );
    });

    test('should fallback to bumped_at when updated_at and last_posted_at are missing', async () => {
      const topicWithFallbacks = {
        ...mockTopic,
        updated_at: undefined,
        last_posted_at: undefined,
      };

      await databaseService.insertTopic(topicWithFallbacks, 'test-forum');

      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          updated_at: mockTopic.bumped_at,
        })
      );
    });

    test('should fallback to created_at when all other timestamps are missing', async () => {
      const topicWithOnlyCreatedAt = {
        ...mockTopic,
        updated_at: undefined,
        last_posted_at: undefined,
        bumped_at: undefined,
      };

      await databaseService.insertTopic(topicWithOnlyCreatedAt, 'test-forum');

      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          updated_at: mockTopic.created_at,
        })
      );
    });
  });

  describe.skip('insertUser', () => {
    const mockUser = {
      id: 42,
      username: 'testuser',
      name: 'Test User',
      avatar_template: '/path/to/avatar.png',
    };

    beforeEach(() => {
      mockUserService.upsertUser.mockResolvedValue(undefined);
    });

    test('should call userService.upsertUser with transformed user data', async () => {
      await databaseService.insertUser(mockUser, 'test-forum');

      expect(mockUserService.upsertUser).toHaveBeenCalledWith({
        user_id: mockUser.id,
        username: mockUser.username,
        name: mockUser.name,
        avatar_template: mockUser.avatar_template,
        forum_name: 'test-forum',
      });
    });

    test('should handle users with missing optional fields', async () => {
      const userWithMissingFields = {
        id: 42,
        username: 'testuser',
      };

      await databaseService.insertUser(userWithMissingFields, 'test-forum');

      expect(mockUserService.upsertUser).toHaveBeenCalledWith({
        user_id: 42,
        username: 'testuser',
        name: undefined,
        avatar_template: undefined,
        forum_name: 'test-forum',
      });
    });

    test('should propagate userService errors', async () => {
      const error = new Error('User service failed');
      mockUserService.upsertUser.mockRejectedValue(error);

      await expect(databaseService.insertUser(mockUser, 'test-forum')).rejects.toThrow(error);
    });
  });
});
