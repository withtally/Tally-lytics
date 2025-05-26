// services/utils/__tests__/discourseUrls.test.ts

import { DiscourseUrlHelper } from '../discourseUrls';
import { ForumConfig } from '../../../config/forumConfig';

describe('DiscourseUrlHelper', () => {
  let helper: DiscourseUrlHelper;
  let mockForumConfig: ForumConfig;

  beforeEach(() => {
    mockForumConfig = {
      apiConfig: {
        discourseUrl: 'https://forum.example.com',
        apiKey: 'test-key',
        apiUsername: 'test-user',
      },
      name: 'Test Forum',
    } as ForumConfig;

    helper = new DiscourseUrlHelper(mockForumConfig);
  });

  describe('constructor', () => {
    it('should remove trailing slashes from discourse URL', () => {
      const configWithTrailingSlash = {
        ...mockForumConfig,
        apiConfig: {
          ...mockForumConfig.apiConfig,
          discourseUrl: 'https://forum.example.com/',
        },
      };

      const helperWithSlash = new DiscourseUrlHelper(configWithTrailingSlash);
      const result = helperWithSlash.getTopicUrl(123);

      expect(result).toBe('https://forum.example.com/t/123');
    });
  });

  describe('getTopicUrl', () => {
    it('should generate topic URL without slug', () => {
      const result = helper.getTopicUrl(123);
      expect(result).toBe('https://forum.example.com/t/123');
    });

    it('should generate topic URL with slug', () => {
      const result = helper.getTopicUrl(123, 'sample-topic');
      expect(result).toBe('https://forum.example.com/t/sample-topic/123');
    });

    it('should handle numeric ID as string', () => {
      const result = helper.getTopicUrl('456');
      expect(result).toBe('https://forum.example.com/t/456');
    });
  });

  describe('getPostUrl', () => {
    it('should generate post URL', () => {
      const result = helper.getPostUrl(123, 456);
      expect(result).toBe('https://forum.example.com/t/123/456');
    });

    it('should generate post URL with slug', () => {
      const result = helper.getPostUrl(123, 456, 'topic-slug');
      expect(result).toBe('https://forum.example.com/t/topic-slug/123/456');
    });
  });

  describe('getUserUrl', () => {
    it('should generate user URL', () => {
      const result = helper.getUserUrl('testuser');
      expect(result).toBe('https://forum.example.com/u/testuser');
    });

    it('should handle usernames with special characters', () => {
      const result = helper.getUserUrl('test-user_123');
      expect(result).toBe('https://forum.example.com/u/test-user_123');
    });
  });

  describe('getTopicApiUrl', () => {
    it('should generate API URL for topic', () => {
      const result = helper.getTopicApiUrl(123);
      expect(result).toBe('https://forum.example.com/t/123.json');
    });

    it('should handle string ID', () => {
      const result = helper.getTopicApiUrl('456');
      expect(result).toBe('https://forum.example.com/t/456.json');
    });
  });

  describe('getLatestTopicsApiUrl', () => {
    it('should generate latest topics URL without page', () => {
      const result = helper.getLatestTopicsApiUrl();
      expect(result).toBe('https://forum.example.com/latest.json');
    });

    it('should generate latest topics URL with page number', () => {
      const result = helper.getLatestTopicsApiUrl(2);
      expect(result).toBe('https://forum.example.com/latest.json?page=2');
    });

    it('should handle undefined page parameter', () => {
      const result = helper.getLatestTopicsApiUrl(undefined);
      expect(result).toBe('https://forum.example.com/latest.json');
    });
  });

  describe('configuration', () => {
    it('should work with different base URLs', () => {
      const differentConfig = {
        ...mockForumConfig,
        apiConfig: {
          ...mockForumConfig.apiConfig,
          discourseUrl: 'https://gov.compound.finance',
        },
      };

      const differentHelper = new DiscourseUrlHelper(differentConfig);
      const result = differentHelper.getTopicUrl(123);

      expect(result).toBe('https://gov.compound.finance/t/123');
    });
  });
});