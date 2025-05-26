// services/crawler/__tests__/apiService.test.ts

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { ApiService } from '../apiService';
import { ApiConfig } from '../types';
import { RateLimiter } from 'limiter';
import { requestWithRetry } from '../../../utils/requestWithRetry';
import { handleGlobalError } from '../../errorHandling/globalErrorHandler';

// Mock dependencies
jest.mock('limiter', () => ({
  RateLimiter: jest.fn(),
}));
jest.mock('../../../utils/requestWithRetry', () => ({
  requestWithRetry: jest.fn(),
}));
jest.mock('../../errorHandling/globalErrorHandler', () => ({
  handleGlobalError: jest.fn(),
}));

describe('ApiService', () => {
  let apiService: ApiService;
  let mockApiConfig: ApiConfig;
  let mockLimiter: any;
  let mockRequestWithRetry: any;
  let mockHandleGlobalError: any;

  beforeEach(() => {
    mockApiConfig = {
      apiKey: 'test-api-key',
      apiUsername: 'test-user',
      discourseUrl: 'https://forum.example.com',
    };

    // Mock RateLimiter
    mockLimiter = {
      removeTokens: jest.fn().mockResolvedValue(1),
    };

    (RateLimiter as any).mockImplementation(() => mockLimiter);

    // Mock requestWithRetry
    mockRequestWithRetry = requestWithRetry as any;

    // Mock handleGlobalError
    mockHandleGlobalError = handleGlobalError as any;

    apiService = new ApiService(mockApiConfig, 'test-forum');
  });

  afterEach(() => {
    mock.restore();
  });

  describe('constructor', () => {
    test('should initialize with correct config and forum name', () => {
      expect(RateLimiter).toHaveBeenCalledWith({
        tokensPerInterval: 5,
        interval: 'second',
      });
    });

    test('should store config and forum name', () => {
      const newApiService = new ApiService(mockApiConfig, 'custom-forum');
      expect(newApiService).toBeInstanceOf(ApiService);
    });

    test('should handle different rate limit configurations', () => {
      // Test that constructor sets up rate limiter correctly  
      expect(RateLimiter).toHaveBeenCalledWith({
        tokensPerInterval: 5,
        interval: 'second',
      });
    });
  });

  describe('fetchUserDetails', () => {
    const mockUserData = {
      user: {
        id: 123,
        username: 'testuser',
        name: 'Test User',
        avatar_template: '/user_avatar/forum.example.com/testuser/{size}/1_2.png',
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-02T00:00:00.000Z',
        last_seen_at: '2023-01-03T00:00:00.000Z',
        website: 'https://example.com',
        location: 'Test City',
        bio_raw: 'Test bio',
        bio_cooked: '<p>Test bio</p>',
        moderator: false,
        admin: false,
      },
    };

    beforeEach(() => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockUserData),
      };
      mockRequestWithRetry.mockResolvedValue(mockResponse as any);
    });

    test('should fetch user details successfully', async () => {
      const result = await apiService.fetchUserDetails('testuser');

      expect(mockLimiter.removeTokens).toHaveBeenCalledWith(1);
      expect(mockRequestWithRetry).toHaveBeenCalledWith(
        'https://forum.example.com/u/testuser.json',
        {
          method: 'GET',
          headers: {
            'Api-Key': 'test-api-key',
            'Api-Username': 'test-user',
            'Content-Type': 'application/json',
          },
        }
      );

      expect(result).toEqual({
        user: {
          id: 123,
          username: 'testuser',
          name: 'Test User',
          avatar_template: '/user_avatar/forum.example.com/testuser/360/1_2.png',
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-02T00:00:00.000Z',
          last_seen_at: '2023-01-03T00:00:00.000Z',
          website: 'https://example.com',
          location: 'Test City',
          bio_raw: 'Test bio',
          bio: '<p>Test bio</p>',
          moderator: false,
          admin: false,
        },
      });
    });

    test('should normalize avatar URL by replacing {size} placeholder', async () => {
      const result = await apiService.fetchUserDetails('testuser');

      expect(result.user.avatar_template).toBe(
        '/user_avatar/forum.example.com/testuser/360/1_2.png'
      );
    });

    test('should handle user data without updated_at field', async () => {
      const userDataWithoutUpdatedAt = {
        user: {
          ...mockUserData.user,
          updated_at: undefined,
        },
      };

      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(userDataWithoutUpdatedAt),
      };
      mockRequestWithRetry.mockResolvedValue(mockResponse as any);

      const result = await apiService.fetchUserDetails('testuser');

      expect(result.user.updated_at).toBe('2023-01-01T00:00:00.000Z'); // Falls back to created_at
    });

    test('should handle empty avatar template', async () => {
      const userDataWithEmptyAvatar = {
        user: {
          ...mockUserData.user,
          avatar_template: '',
        },
      };

      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(userDataWithEmptyAvatar),
      };
      mockRequestWithRetry.mockResolvedValue(mockResponse as any);

      const result = await apiService.fetchUserDetails('testuser');

      expect(result.user.avatar_template).toBe('');
    });

    test('should handle null avatar template', async () => {
      const userDataWithNullAvatar = {
        user: {
          ...mockUserData.user,
          avatar_template: null,
        },
      };

      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(userDataWithNullAvatar),
      };
      mockRequestWithRetry.mockResolvedValue(mockResponse as any);

      const result = await apiService.fetchUserDetails('testuser');

      expect(result.user.avatar_template).toBe('');
    });

    test('should handle user with admin privileges', async () => {
      const adminUserData = {
        user: {
          ...mockUserData.user,
          admin: true,
          moderator: true,
        },
      };

      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(adminUserData),
      };
      mockRequestWithRetry.mockResolvedValue(mockResponse as any);

      const result = await apiService.fetchUserDetails('admin');

      expect(result.user.admin).toBe(true);
      expect(result.user.moderator).toBe(true);
    });

    test('should handle 404 error and return fallback user data', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
      };
      mockRequestWithRetry.mockResolvedValue(mockResponse as any);

      const result = await apiService.fetchUserDetails('nonexistent');

      expect(mockHandleGlobalError).toHaveBeenCalledWith(
        expect.any(Error),
        '[Forum: test-forum] fetchUserDetails(nonexistent)'
      );

      expect(result).toEqual({
        user: {
          username: 'nonexistent',
          name: null,
          avatar_template: '',
          id: expect.any(Number),
        },
      });
    });

    test('should handle HTTP errors and return fallback user data', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
      };
      mockRequestWithRetry.mockResolvedValue(mockResponse as any);

      const result = await apiService.fetchUserDetails('testuser');

      expect(mockHandleGlobalError).toHaveBeenCalled();
      expect(result.user.username).toBe('testuser');
      expect(result.user.name).toBeNull();
    });

    test('should handle network errors and return fallback user data', async () => {
      const networkError = new Error('Network error');
      mockRequestWithRetry.mockRejectedValue(networkError);

      const result = await apiService.fetchUserDetails('testuser');

      expect(mockHandleGlobalError).toHaveBeenCalledWith(
        networkError,
        '[Forum: test-forum] fetchUserDetails(testuser)'
      );

      expect(result).toEqual({
        user: {
          username: 'testuser',
          name: null,
          avatar_template: '',
          id: expect.any(Number),
        },
      });
    });

    test('should handle JSON parsing errors', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      };
      mockRequestWithRetry.mockResolvedValue(mockResponse as any);

      const result = await apiService.fetchUserDetails('testuser');

      expect(mockHandleGlobalError).toHaveBeenCalled();
      expect(result.user.username).toBe('testuser');
    });

    test('should respect rate limiting', async () => {
      mockLimiter.removeTokens.mockResolvedValue(1);

      await apiService.fetchUserDetails('user1');
      await apiService.fetchUserDetails('user2');

      expect(mockLimiter.removeTokens).toHaveBeenCalledTimes(2);
      expect(mockLimiter.removeTokens).toHaveBeenCalledWith(1);
    });

    test('should handle rate limiting errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      mockLimiter.removeTokens.mockRejectedValue(rateLimitError);

      const result = await apiService.fetchUserDetails('testuser');

      expect(mockHandleGlobalError).toHaveBeenCalledWith(
        rateLimitError,
        '[Forum: test-forum] fetchUserDetails(testuser)'
      );

      expect(result).toEqual({
        user: {
          username: 'testuser',
          name: null,
          avatar_template: '',
          id: expect.any(Number),
        },
      });
    });

    test('should handle missing optional user fields', async () => {
      const minimalUserData = {
        user: {
          id: 123,
          username: 'testuser',
          name: 'Test User',
          avatar_template: '',
          created_at: '2023-01-01T00:00:00.000Z',
          // Missing optional fields
        },
      };

      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(minimalUserData),
      };
      mockRequestWithRetry.mockResolvedValue(mockResponse as any);

      const result = await apiService.fetchUserDetails('testuser');

      expect(result.user.id).toBe(123);
      expect(result.user.username).toBe('testuser');
      expect(result.user.updated_at).toBe('2023-01-01T00:00:00.000Z'); // Falls back to created_at
    });

    test('should handle special characters in username', async () => {
      await apiService.fetchUserDetails('user-with-special.chars_123');

      expect(mockRequestWithRetry).toHaveBeenCalledWith(
        'https://forum.example.com/u/user-with-special.chars_123.json',
        expect.any(Object)
      );
    });

    test('should handle empty username', async () => {
      const result = await apiService.fetchUserDetails('');

      expect(mockRequestWithRetry).toHaveBeenCalledWith(
        'https://forum.example.com/u/.json',
        expect.any(Object)
      );
    });

    test('should handle different forum configurations', async () => {
      const customConfig: ApiConfig = {
        apiKey: 'custom-key',
        apiUsername: 'custom-user',
        discourseUrl: 'https://custom-forum.org',
      };

      const customApiService = new ApiService(customConfig, 'custom-forum');
      await customApiService.fetchUserDetails('testuser');

      expect(mockRequestWithRetry).toHaveBeenLastCalledWith(
        'https://custom-forum.org/u/testuser.json',
        {
          method: 'GET',
          headers: {
            'Api-Key': 'custom-key',
            'Api-Username': 'custom-user',
            'Content-Type': 'application/json',
          },
        }
      );
    });
  });

  describe('normalizeAvatarUrl (private method testing via public interface)', () => {
    test('should replace {size} placeholder with 360', async () => {
      const userDataWithSizePlaceholder = {
        user: {
          id: 123,
          username: 'testuser',
          name: 'Test User',
          created_at: '2023-01-01T00:00:00.000Z',
          avatar_template: '/avatars/{size}/user.png',
        },
      };

      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(userDataWithSizePlaceholder),
      };
      mockRequestWithRetry.mockResolvedValue(mockResponse as any);

      const result = await apiService.fetchUserDetails('testuser');

      expect(result.user.avatar_template).toBe('/avatars/360/user.png');
    });

    test('should handle multiple {size} placeholders', async () => {
      const userDataWithMultiplePlaceholders = {
        user: {
          id: 123,
          username: 'testuser',
          name: 'Test User',
          created_at: '2023-01-01T00:00:00.000Z',
          avatar_template: '/avatars/{size}/user_{size}.png',
        },
      };

      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(userDataWithMultiplePlaceholders),
      };
      mockRequestWithRetry.mockResolvedValue(mockResponse as any);

      const result = await apiService.fetchUserDetails('testuser');

      expect(result.user.avatar_template).toBe('/avatars/360/user_{size}.png');
    });

    test('should handle avatar template without {size} placeholder', async () => {
      const userDataWithoutPlaceholder = {
        user: {
          id: 123,
          username: 'testuser',
          name: 'Test User',
          created_at: '2023-01-01T00:00:00.000Z',
          avatar_template: '/static/avatar.png',
        },
      };

      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(userDataWithoutPlaceholder),
      };
      mockRequestWithRetry.mockResolvedValue(mockResponse as any);

      const result = await apiService.fetchUserDetails('testuser');

      expect(result.user.avatar_template).toBe('/static/avatar.png');
    });
  });

  describe('fetchWithRateLimit error handling', () => {
    test('should throw appropriate error for 404 responses', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
      };
      mockRequestWithRetry.mockResolvedValue(mockResponse as any);

      await expect(apiService.fetchUserDetails('notfound')).resolves.toEqual({
        user: {
          username: 'notfound',
          name: null,
          avatar_template: '',
          id: expect.any(Number),
        },
      });

      expect(mockHandleGlobalError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '[Forum: test-forum] Not found: https://forum.example.com/u/notfound.json',
        }),
        '[Forum: test-forum] fetchUserDetails(notfound)'
      );
    });

    test('should throw appropriate error for other HTTP errors', async () => {
      const mockResponse = {
        ok: false,
        status: 403,
      };
      mockRequestWithRetry.mockResolvedValue(mockResponse as any);

      await expect(apiService.fetchUserDetails('forbidden')).resolves.toEqual({
        user: {
          username: 'forbidden',
          name: null,
          avatar_template: '',
          id: expect.any(Number),
        },
      });

      expect(mockHandleGlobalError).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            '[Forum: test-forum] HTTP error! status: 403 on URL: https://forum.example.com/u/forbidden.json',
        }),
        '[Forum: test-forum] fetchUserDetails(forbidden)'
      );
    });

    test('should handle and log fetchWithRateLimit errors', async () => {
      const networkError = new Error('Connection refused');
      mockRequestWithRetry.mockRejectedValue(networkError);

      const result = await apiService.fetchUserDetails('testuser');

      expect(mockHandleGlobalError).toHaveBeenCalledWith(
        networkError,
        '[Forum: test-forum] fetchWithRateLimit for https://forum.example.com/u/testuser.json'
      );

      expect(mockHandleGlobalError).toHaveBeenCalledWith(
        networkError,
        '[Forum: test-forum] fetchUserDetails(testuser)'
      );

      expect(result.user.username).toBe('testuser');
    });
  });

  describe('integration scenarios', () => {
    test('should handle successful flow with all features', async () => {
      const fullUserData = {
        user: {
          id: 456,
          username: 'poweruser',
          name: 'Power User',
          avatar_template: '/uploads/default/original/1X/{size}.png',
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-06-01T00:00:00.000Z',
          last_seen_at: '2023-12-01T00:00:00.000Z',
          website: 'https://poweruser.dev',
          location: 'San Francisco',
          bio_raw: 'Full-stack developer',
          bio_cooked: '<p>Full-stack developer</p>',
          moderator: true,
          admin: false,
        },
      };

      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(fullUserData),
      };
      mockRequestWithRetry.mockResolvedValue(mockResponse as any);

      const result = await apiService.fetchUserDetails('poweruser');

      expect(mockLimiter.removeTokens).toHaveBeenCalledWith(1);
      expect(result).toEqual({
        user: {
          id: 456,
          username: 'poweruser',
          name: 'Power User',
          avatar_template: '/uploads/default/original/1X/360.png',
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-06-01T00:00:00.000Z',
          last_seen_at: '2023-12-01T00:00:00.000Z',
          website: 'https://poweruser.dev',
          location: 'San Francisco',
          bio_raw: 'Full-stack developer',
          bio: '<p>Full-stack developer</p>',
          moderator: true,
          admin: false,
        },
      });
    });

    test('should handle multiple consecutive requests with rate limiting', async () => {
      const usernames = ['user1', 'user2', 'user3'];
      const responses = usernames.map((username, index) => ({
        user: {
          id: index + 1,
          username,
          name: `User ${index + 1}`,
          avatar_template: '',
          created_at: '2023-01-01T00:00:00.000Z',
        },
      }));

      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn(),
      };

      responses.forEach((response, index) => {
        mockResponse.json.mockResolvedValueOnce(response);
      });

      mockRequestWithRetry.mockResolvedValue(mockResponse as any);

      const results = await Promise.all(
        usernames.map(username => apiService.fetchUserDetails(username))
      );

      expect(mockLimiter.removeTokens).toHaveBeenCalledTimes(3);
      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.user.username).toBe(usernames[index]);
        expect(result.user.id).toBe(index + 1);
      });
    });
  });

  describe('fetchNewTopics', () => {
    const mockTopicsData = {
      topic_list: {
        topics: [
          {
            id: 1,
            title: 'Old Topic',
            created_at: '2023-01-01T00:00:00.000Z',
          },
          {
            id: 2,
            title: 'New Topic',
            created_at: '2023-12-01T00:00:00.000Z',
          },
          {
            id: 3,
            title: 'Another New Topic',
            created_at: '2023-12-02T00:00:00.000Z',
          },
        ],
      },
    };

    beforeEach(() => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockTopicsData),
      };
      mockRequestWithRetry.mockResolvedValue(mockResponse as any);
    });

    test('should fetch and filter new topics after start time', async () => {
      const startTime = new Date('2023-06-01T00:00:00.000Z');
      const result = await apiService.fetchNewTopics(startTime);

      expect(mockLimiter.removeTokens).toHaveBeenCalledWith(1);
      expect(mockRequestWithRetry).toHaveBeenCalledWith('https://forum.example.com/latest.json', {
        method: 'GET',
        headers: {
          'Api-Key': 'test-api-key',
          'Api-Username': 'test-user',
          'Content-Type': 'application/json',
        },
      });

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('New Topic');
      expect(result[1].title).toBe('Another New Topic');
    });

    test('should return empty array when no new topics found', async () => {
      const startTime = new Date('2024-01-01T00:00:00.000Z'); // After all topics
      const result = await apiService.fetchNewTopics(startTime);

      expect(result).toHaveLength(0);
    });

    test('should return all topics when start time is very old', async () => {
      const startTime = new Date('2020-01-01T00:00:00.000Z');
      const result = await apiService.fetchNewTopics(startTime);

      expect(result).toHaveLength(3);
    });

    test('should throw error when discourseUrl is not configured', async () => {
      const configWithoutUrl = {
        ...mockApiConfig,
        discourseUrl: '',
      };
      const apiServiceWithoutUrl = new ApiService(configWithoutUrl, 'test-forum');

      await expect(apiServiceWithoutUrl.fetchNewTopics(new Date())).rejects.toThrow(
        '[Forum: test-forum] discourseUrl is not configured'
      );
    });

    test('should throw error when discourseUrl is undefined', async () => {
      const configWithUndefinedUrl = {
        ...mockApiConfig,
        discourseUrl: undefined as any,
      };
      const apiServiceWithUndefinedUrl = new ApiService(configWithUndefinedUrl, 'test-forum');

      await expect(apiServiceWithUndefinedUrl.fetchNewTopics(new Date())).rejects.toThrow(
        '[Forum: test-forum] discourseUrl is not configured'
      );
    });

    test('should handle HTTP errors and return empty array', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
      };
      mockRequestWithRetry.mockResolvedValue(mockResponse as any);

      const result = await apiService.fetchNewTopics(new Date());

      expect(mockHandleGlobalError).toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    test('should handle network errors and return empty array', async () => {
      const networkError = new Error('Connection failed');
      mockRequestWithRetry.mockRejectedValue(networkError);

      const result = await apiService.fetchNewTopics(new Date());

      expect(mockHandleGlobalError).toHaveBeenCalledWith(
        networkError,
        '[Forum: test-forum] fetchNewTopics'
      );
      expect(result).toEqual([]);
    });

    test('should handle malformed response data gracefully', async () => {
      const malformedData = {
        topic_list: null,
      };

      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(malformedData),
      };
      mockRequestWithRetry.mockResolvedValue(mockResponse as any);

      const result = await apiService.fetchNewTopics(new Date());

      expect(mockHandleGlobalError).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('fetchNewPosts', () => {
    const mockPostsData = {
      post_stream: {
        posts: [
          {
            id: 1,
            content: 'Old post',
            created_at: '2023-01-01T00:00:00.000Z',
          },
          {
            id: 2,
            content: 'New post',
            created_at: '2023-12-01T00:00:00.000Z',
          },
          {
            id: 3,
            content: 'Another new post',
            created_at: '2023-12-02T00:00:00.000Z',
          },
        ],
      },
    };

    beforeEach(() => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockPostsData),
      };
      mockRequestWithRetry.mockResolvedValue(mockResponse as any);
    });

    test('should fetch and filter new posts after start time', async () => {
      const startTime = new Date('2023-06-01T00:00:00.000Z');
      const topicId = 123;
      const result = await apiService.fetchNewPosts(topicId, startTime);

      expect(mockLimiter.removeTokens).toHaveBeenCalledWith(1);
      expect(mockRequestWithRetry).toHaveBeenCalledWith('https://forum.example.com/t/123.json', {
        method: 'GET',
        headers: {
          'Api-Key': 'test-api-key',
          'Api-Username': 'test-user',
          'Content-Type': 'application/json',
        },
      });

      expect(result).toHaveLength(2);
      expect(result[0].content).toBe('New post');
      expect(result[1].content).toBe('Another new post');
    });

    test('should return empty array when no new posts found', async () => {
      const startTime = new Date('2024-01-01T00:00:00.000Z'); // After all posts
      const result = await apiService.fetchNewPosts(123, startTime);

      expect(result).toHaveLength(0);
    });

    test('should return all posts when start time is very old', async () => {
      const startTime = new Date('2020-01-01T00:00:00.000Z');
      const result = await apiService.fetchNewPosts(123, startTime);

      expect(result).toHaveLength(3);
    });

    test('should handle different topic IDs', async () => {
      const topicId = 456;
      await apiService.fetchNewPosts(topicId, new Date());

      expect(mockRequestWithRetry).toHaveBeenCalledWith(
        'https://forum.example.com/t/456.json',
        expect.any(Object)
      );
    });

    test('should handle zero topic ID', async () => {
      const topicId = 0;
      await apiService.fetchNewPosts(topicId, new Date());

      expect(mockRequestWithRetry).toHaveBeenCalledWith(
        'https://forum.example.com/t/0.json',
        expect.any(Object)
      );
    });

    test('should throw error when discourseUrl is not configured', async () => {
      const configWithoutUrl = {
        ...mockApiConfig,
        discourseUrl: '',
      };
      const apiServiceWithoutUrl = new ApiService(configWithoutUrl, 'test-forum');

      await expect(apiServiceWithoutUrl.fetchNewPosts(123, new Date())).rejects.toThrow(
        '[Forum: test-forum] discourseUrl is not configured'
      );
    });

    test('should throw error when discourseUrl is undefined', async () => {
      const configWithUndefinedUrl = {
        ...mockApiConfig,
        discourseUrl: undefined as any,
      };
      const apiServiceWithUndefinedUrl = new ApiService(configWithUndefinedUrl, 'test-forum');

      await expect(apiServiceWithUndefinedUrl.fetchNewPosts(123, new Date())).rejects.toThrow(
        '[Forum: test-forum] discourseUrl is not configured'
      );
    });

    test('should handle HTTP errors and return empty array', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
      };
      mockRequestWithRetry.mockResolvedValue(mockResponse as any);

      const result = await apiService.fetchNewPosts(999, new Date());

      expect(mockHandleGlobalError).toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    test('should handle network errors and return empty array', async () => {
      const networkError = new Error('Timeout');
      mockRequestWithRetry.mockRejectedValue(networkError);

      const result = await apiService.fetchNewPosts(123, new Date());

      expect(mockHandleGlobalError).toHaveBeenCalledWith(
        networkError,
        '[Forum: test-forum] fetchNewPosts(123)'
      );
      expect(result).toEqual([]);
    });

    test('should handle malformed response data gracefully', async () => {
      const malformedData = {
        post_stream: null,
      };

      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(malformedData),
      };
      mockRequestWithRetry.mockResolvedValue(mockResponse as any);

      const result = await apiService.fetchNewPosts(123, new Date());

      expect(mockHandleGlobalError).toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    test('should handle missing posts array', async () => {
      const dataWithoutPosts = {
        post_stream: {
          // Missing posts array
        },
      };

      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(dataWithoutPosts),
      };
      mockRequestWithRetry.mockResolvedValue(mockResponse as any);

      const result = await apiService.fetchNewPosts(123, new Date());

      expect(mockHandleGlobalError).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });
});
