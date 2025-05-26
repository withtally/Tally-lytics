// services/user/__tests__/userService.test.ts

import { expect, test, describe, beforeEach, afterEach } from '@jest/globals';

// Mock dependencies
const mockLogger = {
  debug: mock(),
  info: mock(),
  warn: mock(),
  error: mock(),
};

const mockDb = jest.fn();
const mockQueryBuilder = {
  insert: mock().mockReturnThis(),
  onConflict: mock().mockReturnThis(),
  merge: mock().mockResolvedValue(undefined),
  where: mock().mockReturnThis(),
  first: mock().mockResolvedValue(null),
};

// Mock global fetch instead of node-fetch
global.fetch = jest.fn();

jest.mock('../../logging', () => ({
  Logger: mock().mockImplementation(() => mockLogger),
}));
jest.mock('../../../config/loggerConfig', () => ({
  loggerConfig: { level: 'info' },
}));
jest.mock('../../../db/db', () => {
  return {
    __esModule: true,
    default: mockDb,
  };
});

import { UserService } from '../userService';
import type { DiscourseUser, DiscourseUserResponse } from '../userService';

const mockedFetch = global.fetch as any;

describe('UserService', () => {
  let service: UserService;
  const originalFetch = global.fetch;

  beforeEach(() => {
    mockLogger.debug.mockClear();
    mockLogger.info.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.error.mockClear();
    mockDb.mockClear();
    mockQueryBuilder.insert.mockClear();
    mockQueryBuilder.onConflict.mockClear();
    mockQueryBuilder.merge.mockClear();
    mockQueryBuilder.where.mockClear();
    mockQueryBuilder.first.mockClear();
    mockedFetch.mockClear();

    // Setup database mock - reset all methods to return this
    mockQueryBuilder.insert.mockReturnThis();
    mockQueryBuilder.onConflict.mockReturnThis();
    mockQueryBuilder.merge.mockResolvedValue(undefined);
    mockQueryBuilder.where.mockReturnThis();
    mockQueryBuilder.first.mockResolvedValue(null);

    mockDb.mockReturnValue(mockQueryBuilder);

    service = new UserService();
    // Override logger property
    (service as any).logger = mockLogger;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('constructor', () => {
    test('should create service with logger', () => {
      expect(() => new UserService()).not.toThrow();
    });
  });

  describe('fetchUserDetails', () => {
    const validParams = {
      username: 'testuser',
      forumUrl: 'https://example.com',
      apiKey: 'test-api-key',
      apiUsername: 'api-user',
    };

    const mockUserResponse: DiscourseUserResponse = {
      user: {
        id: 123,
        username: 'testuser',
        name: 'Test User',
        avatar_template: '/avatar/{size}.png',
        created_at: '2023-01-01T00:00:00.000Z',
        last_seen_at: '2023-01-02T00:00:00.000Z',
        website: 'https://testuser.com',
        location: 'Test City',
        bio_raw: 'Test bio',
        moderator: false,
        admin: true,
      },
    };

    test('should fetch user details successfully', async () => {
      // Given
      const mockResponse = {
        ok: true,
        status: 200,
        json: mock().mockResolvedValue(mockUserResponse),
      };
      mockedFetch.mockResolvedValue(mockResponse as any);

      // When
      const result = await service.fetchUserDetails(
        validParams.username,
        validParams.forumUrl,
        validParams.apiKey,
        validParams.apiUsername
      );

      // Then
      expect(result).toEqual({
        id: 123,
        username: 'testuser',
        name: 'Test User',
        avatar_template: '/avatar/{size}.png',
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: expect.any(String),
        last_seen_at: '2023-01-02T00:00:00.000Z',
        website: 'https://testuser.com',
        location: 'Test City',
        bio: 'Test bio',
        moderator: false,
        admin: true,
      });

      expect(mockedFetch).toHaveBeenCalledWith('https://example.com/users/testuser.json', {
        headers: {
          'Api-Key': 'test-api-key',
          'Api-Username': 'api-user',
          'Content-Type': 'application/json',
        },
      });

      expect(mockLogger.info).toHaveBeenCalledWith('Fetching user details for testuser');
    });

    test('should throw error for missing forumUrl', async () => {
      // When/Then
      await expect(service.fetchUserDetails('testuser', '', 'api-key', 'api-user')).rejects.toThrow(
        'Missing required API configuration'
      );
    });

    test('should throw error for missing apiKey', async () => {
      // When/Then
      await expect(
        service.fetchUserDetails('testuser', 'https://example.com', '', 'api-user')
      ).rejects.toThrow('Missing required API configuration');
    });

    test('should throw error for missing apiUsername', async () => {
      // When/Then
      await expect(
        service.fetchUserDetails('testuser', 'https://example.com', 'api-key', '')
      ).rejects.toThrow('Missing required API configuration');
    });

    test('should return null for 404 not found', async () => {
      // Given
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
      };
      mockedFetch.mockResolvedValue(mockResponse as any);

      // When
      const result = await service.fetchUserDetails(
        validParams.username,
        validParams.forumUrl,
        validParams.apiKey,
        validParams.apiUsername
      );

      // Then
      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith('User testuser not found');
    });

    test('should throw error for other HTTP errors', async () => {
      // Given
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      };
      mockedFetch.mockResolvedValue(mockResponse as any);

      // When/Then
      await expect(
        service.fetchUserDetails(
          validParams.username,
          validParams.forumUrl,
          validParams.apiKey,
          validParams.apiUsername
        )
      ).rejects.toThrow('API request failed: 500 Internal Server Error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error fetching user details for testuser:',
        expect.objectContaining({
          error: 'API request failed: 500 Internal Server Error',
        })
      );
    });

    test('should handle network errors', async () => {
      // Given
      const networkError = new Error('Network error');
      mockedFetch.mockRejectedValue(networkError);

      // When/Then
      await expect(
        service.fetchUserDetails(
          validParams.username,
          validParams.forumUrl,
          validParams.apiKey,
          validParams.apiUsername
        )
      ).rejects.toThrow('Network error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error fetching user details for testuser:',
        expect.objectContaining({
          error: 'Network error',
        })
      );
    });

    test('should handle JSON parsing errors', async () => {
      // Given
      const mockResponse = {
        ok: true,
        status: 200,
        json: mock().mockRejectedValue(new Error('Invalid JSON')),
      };
      mockedFetch.mockResolvedValue(mockResponse as any);

      // When/Then
      await expect(
        service.fetchUserDetails(
          validParams.username,
          validParams.forumUrl,
          validParams.apiKey,
          validParams.apiUsername
        )
      ).rejects.toThrow('Invalid JSON');
    });

    test('should handle partial user data', async () => {
      // Given
      const partialUserResponse = {
        user: {
          id: 123,
          username: 'testuser',
          name: 'Test User',
          avatar_template: '/avatar/{size}.png',
          created_at: '2023-01-01T00:00:00.000Z',
          last_seen_at: null,
          website: null,
          location: null,
          bio_raw: null,
          moderator: false,
          admin: false,
        },
      };

      const mockResponse = {
        ok: true,
        status: 200,
        json: mock().mockResolvedValue(partialUserResponse),
      };
      mockedFetch.mockResolvedValue(mockResponse as any);

      // When
      const result = await service.fetchUserDetails(
        validParams.username,
        validParams.forumUrl,
        validParams.apiKey,
        validParams.apiUsername
      );

      // Then
      expect(result).toEqual({
        id: 123,
        username: 'testuser',
        name: 'Test User',
        avatar_template: '/avatar/{size}.png',
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: expect.any(String),
        last_seen_at: null,
        website: null,
        location: null,
        bio: null,
        moderator: false,
        admin: false,
      });
    });
  });

  describe('upsertUser', () => {
    const mockUser: DiscourseUser = {
      id: 123,
      username: 'testuser',
      name: 'Test User',
      created_at: '2023-01-01T00:00:00.000Z',
      updated_at: '2023-01-01T00:00:00.000Z',
    };

    test('should upsert user successfully', async () => {
      // Given
      mockQueryBuilder.merge.mockResolvedValue(undefined);

      // When
      await service.upsertUser(mockUser, 'test-forum');

      // Then
      expect(mockDb).toHaveBeenCalledWith('users');
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith({
        ...mockUser,
        forum_name: 'test-forum',
        updated_at: expect.any(String),
      });
      expect(mockQueryBuilder.onConflict).toHaveBeenCalledWith(['id', 'forum_name']);
      expect(mockQueryBuilder.merge).toHaveBeenCalled();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Successfully upserted user testuser for forum test-forum'
      );
    });

    test('should throw error for missing user id', async () => {
      // Given
      const invalidUser = { ...mockUser, id: undefined } as any;

      // When/Then
      await expect(service.upsertUser(invalidUser, 'test-forum')).rejects.toThrow(
        'Missing required user data: id or username'
      );
    });

    test('should throw error for missing username', async () => {
      // Given
      const invalidUser = { ...mockUser, username: undefined } as any;

      // When/Then
      await expect(service.upsertUser(invalidUser, 'test-forum')).rejects.toThrow(
        'Missing required user data: id or username'
      );
    });

    test('should handle database errors', async () => {
      // Given
      const dbError = new Error('Database connection failed');
      mockQueryBuilder.merge.mockRejectedValue(dbError);

      // When/Then
      await expect(service.upsertUser(mockUser, 'test-forum')).rejects.toThrow(
        'Database connection failed'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error upserting user testuser:',
        expect.objectContaining({
          error: 'Database connection failed',
          forum: 'test-forum',
        })
      );
    });

    test('should include all user fields in upsert', async () => {
      // Given
      const fullUser: DiscourseUser = {
        id: 123,
        username: 'testuser',
        name: 'Test User',
        avatar_template: '/avatar/{size}.png',
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        last_seen_at: '2023-01-02T00:00:00.000Z',
        website: 'https://testuser.com',
        location: 'Test City',
        bio: 'Test bio',
        moderator: false,
        admin: true,
      };

      // When
      await service.upsertUser(fullUser, 'test-forum');

      // Then
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith({
        ...fullUser,
        forum_name: 'test-forum',
        updated_at: expect.any(String),
      });
    });
  });

  describe('getUserByUsername', () => {
    test('should get user by username successfully', async () => {
      // Given
      const mockUser: DiscourseUser = {
        id: 123,
        username: 'testuser',
        name: 'Test User',
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        forum_name: 'test-forum',
      };
      mockQueryBuilder.first.mockResolvedValue(mockUser);

      // When
      const result = await service.getUserByUsername('testuser', 'test-forum');

      // Then
      expect(result).toEqual(mockUser);
      expect(mockDb).toHaveBeenCalledWith('users');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({
        username: 'testuser',
        forum_name: 'test-forum',
      });
      expect(mockQueryBuilder.first).toHaveBeenCalled();
    });

    test('should return null when user not found', async () => {
      // Given
      mockQueryBuilder.first.mockResolvedValue(undefined);

      // When
      const result = await service.getUserByUsername('testuser', 'test-forum');

      // Then
      expect(result).toBeNull();
    });

    test('should throw error for empty username', async () => {
      // When/Then
      await expect(service.getUserByUsername('', 'test-forum')).rejects.toThrow(
        'Username and forum name are required'
      );
    });

    test('should throw error for empty forum name', async () => {
      // When/Then
      await expect(service.getUserByUsername('testuser', '')).rejects.toThrow(
        'Username and forum name are required'
      );
    });

    test('should handle database errors', async () => {
      // Given
      const dbError = new Error('Database query failed');
      mockQueryBuilder.first.mockRejectedValue(dbError);

      // When/Then
      await expect(service.getUserByUsername('testuser', 'test-forum')).rejects.toThrow(
        'Database query failed'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error fetching user testuser:',
        expect.objectContaining({
          error: 'Database query failed',
          forum: 'test-forum',
        })
      );
    });
  });
});
