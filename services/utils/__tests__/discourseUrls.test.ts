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
    it('should initialize with forum config', () => {
      expect(helper).toBeInstanceOf(DiscourseUrlHelper);
    });

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

    it('should remove multiple trailing slashes', () => {
      const configWithMultipleSlashes = {
        ...mockForumConfig,
        apiConfig: {
          ...mockForumConfig.apiConfig,
          discourseUrl: 'https://forum.example.com///',
        },
      };

      const helperWithSlashes = new DiscourseUrlHelper(configWithMultipleSlashes);
      const result = helperWithSlashes.getTopicUrl(123);

      expect(result).toBe('https://forum.example.com/t/123');
    });

    it('should handle URL without trailing slash', () => {
      const result = helper.getTopicUrl(123);
      expect(result).toBe('https://forum.example.com/t/123');
    });
  });

  describe('getTopicUrl', () => {
    it('should generate topic URL without slug', () => {
      const result = helper.getTopicUrl(123);
      expect(result).toBe('https://forum.example.com/t/123');
    });

    it('should generate topic URL with slug', () => {
      const result = helper.getTopicUrl(123, 'my-topic-slug');
      expect(result).toBe('https://forum.example.com/t/my-topic-slug/123');
    });

    it('should handle numeric topic ID as number', () => {
      const result = helper.getTopicUrl(456);
      expect(result).toBe('https://forum.example.com/t/456');
    });

    it('should handle zero topic ID', () => {
      const result = helper.getTopicUrl(0);
      expect(result).toBe('https://forum.example.com/t/0');
    });

    it('should handle negative topic ID', () => {
      const result = helper.getTopicUrl(-1);
      expect(result).toBe('https://forum.example.com/t/-1');
    });

    it('should handle large topic ID', () => {
      const result = helper.getTopicUrl(999999999);
      expect(result).toBe('https://forum.example.com/t/999999999');
    });

    it('should handle empty slug', () => {
      const result = helper.getTopicUrl(123, '');
      expect(result).toBe('https://forum.example.com/t/123');
    });

    it('should handle slug with special characters', () => {
      const result = helper.getTopicUrl(123, 'topic-with-dashes-and_underscores');
      expect(result).toBe('https://forum.example.com/t/topic-with-dashes-and_underscores/123');
    });

    it('should handle slug with spaces (though not typical)', () => {
      const result = helper.getTopicUrl(123, 'topic with spaces');
      expect(result).toBe('https://forum.example.com/t/topic with spaces/123');
    });

    it('should handle very long slug', () => {
      const longSlug = 'a'.repeat(200);
      const result = helper.getTopicUrl(123, longSlug);
      expect(result).toBe(`https://forum.example.com/t/${longSlug}/123`);
    });
  });

  describe('getPostUrl', () => {
    it('should generate post URL without slug', () => {
      const result = helper.getPostUrl(123, 5);
      expect(result).toBe('https://forum.example.com/t/123/5');
    });

    it('should generate post URL with slug', () => {
      const result = helper.getPostUrl(123, 5, 'my-topic-slug');
      expect(result).toBe('https://forum.example.com/t/my-topic-slug/123/5');
    });

    it('should handle zero post ID', () => {
      const result = helper.getPostUrl(123, 0);
      expect(result).toBe('https://forum.example.com/t/123/0');
    });

    it('should handle negative post ID', () => {
      const result = helper.getPostUrl(123, -1);
      expect(result).toBe('https://forum.example.com/t/123/-1');
    });

    it('should handle large post ID', () => {
      const result = helper.getPostUrl(123, 999999);
      expect(result).toBe('https://forum.example.com/t/123/999999');
    });

    it('should handle both zero topic and post ID', () => {
      const result = helper.getPostUrl(0, 0);
      expect(result).toBe('https://forum.example.com/t/0/0');
    });

    it('should handle empty slug in post URL', () => {
      const result = helper.getPostUrl(123, 5, '');
      expect(result).toBe('https://forum.example.com/t/123/5');
    });

    it('should handle slug with special characters in post URL', () => {
      const result = helper.getPostUrl(123, 5, 'post-topic-slug');
      expect(result).toBe('https://forum.example.com/t/post-topic-slug/123/5');
    });
  });

  describe('getUserUrl', () => {
    it('should generate user profile URL', () => {
      const result = helper.getUserUrl('john_doe');
      expect(result).toBe('https://forum.example.com/u/john_doe');
    });

    it('should handle username with special characters', () => {
      const result = helper.getUserUrl('user-with-dashes');
      expect(result).toBe('https://forum.example.com/u/user-with-dashes');
    });

    it('should handle username with underscores', () => {
      const result = helper.getUserUrl('user_with_underscores');
      expect(result).toBe('https://forum.example.com/u/user_with_underscores');
    });

    it('should handle numeric username', () => {
      const result = helper.getUserUrl('123456');
      expect(result).toBe('https://forum.example.com/u/123456');
    });

    it('should handle empty username', () => {
      const result = helper.getUserUrl('');
      expect(result).toBe('https://forum.example.com/u/');
    });

    it('should handle username with dots', () => {
      const result = helper.getUserUrl('user.name');
      expect(result).toBe('https://forum.example.com/u/user.name');
    });

    it('should handle very long username', () => {
      const longUsername = 'a'.repeat(100);
      const result = helper.getUserUrl(longUsername);
      expect(result).toBe(`https://forum.example.com/u/${longUsername}`);
    });

    it('should handle username with spaces (though not typical)', () => {
      const result = helper.getUserUrl('user name');
      expect(result).toBe('https://forum.example.com/u/user name');
    });
  });

  describe('getTopicApiUrl', () => {
    it('should generate topic API URL', () => {
      const result = helper.getTopicApiUrl(123);
      expect(result).toBe('https://forum.example.com/t/123.json');
    });

    it('should handle zero topic ID in API URL', () => {
      const result = helper.getTopicApiUrl(0);
      expect(result).toBe('https://forum.example.com/t/0.json');
    });

    it('should handle negative topic ID in API URL', () => {
      const result = helper.getTopicApiUrl(-1);
      expect(result).toBe('https://forum.example.com/t/-1.json');
    });

    it('should handle large topic ID in API URL', () => {
      const result = helper.getTopicApiUrl(999999999);
      expect(result).toBe('https://forum.example.com/t/999999999.json');
    });
  });

  describe('getLatestTopicsApiUrl', () => {
    it('should generate latest topics API URL without page', () => {
      const result = helper.getLatestTopicsApiUrl();
      expect(result).toBe('https://forum.example.com/latest.json');
    });

    it('should generate latest topics API URL with page number', () => {
      const result = helper.getLatestTopicsApiUrl(2);
      expect(result).toBe('https://forum.example.com/latest.json?page=2');
    });

    it('should handle page number 0', () => {
      const result = helper.getLatestTopicsApiUrl(0);
      expect(result).toBe('https://forum.example.com/latest.json?page=0');
    });

    it('should handle negative page number', () => {
      const result = helper.getLatestTopicsApiUrl(-1);
      expect(result).toBe('https://forum.example.com/latest.json?page=-1');
    });

    it('should handle large page number', () => {
      const result = helper.getLatestTopicsApiUrl(999999);
      expect(result).toBe('https://forum.example.com/latest.json?page=999999');
    });

    it('should not add page parameter for undefined', () => {
      const result = helper.getLatestTopicsApiUrl(undefined);
      expect(result).toBe('https://forum.example.com/latest.json');
    });

    it('should handle page number 1', () => {
      const result = helper.getLatestTopicsApiUrl(1);
      expect(result).toBe('https://forum.example.com/latest.json?page=1');
    });
  });

  describe('integration with different forum configurations', () => {
    it('should work with different base URLs', () => {
      const config = {
        ...mockForumConfig,
        apiConfig: {
          ...mockForumConfig.apiConfig,
          discourseUrl: 'https://community.another-site.org',
        },
      };

      const differentHelper = new DiscourseUrlHelper(config);

      expect(differentHelper.getTopicUrl(123)).toBe('https://community.another-site.org/t/123');
      expect(differentHelper.getUserUrl('user')).toBe('https://community.another-site.org/u/user');
      expect(differentHelper.getTopicApiUrl(123)).toBe(
        'https://community.another-site.org/t/123.json'
      );
    });

    it('should work with localhost URLs', () => {
      const config = {
        ...mockForumConfig,
        apiConfig: {
          ...mockForumConfig.apiConfig,
          discourseUrl: 'http://localhost:3000',
        },
      };

      const localHelper = new DiscourseUrlHelper(config);

      expect(localHelper.getTopicUrl(123)).toBe('http://localhost:3000/t/123');
      expect(localHelper.getPostUrl(123, 5)).toBe('http://localhost:3000/t/123/5');
    });

    it('should work with IP address URLs', () => {
      const config = {
        ...mockForumConfig,
        apiConfig: {
          ...mockForumConfig.apiConfig,
          discourseUrl: 'http://192.168.1.100:8080',
        },
      };

      const ipHelper = new DiscourseUrlHelper(config);

      expect(ipHelper.getTopicUrl(123)).toBe('http://192.168.1.100:8080/t/123');
      expect(ipHelper.getLatestTopicsApiUrl(2)).toBe(
        'http://192.168.1.100:8080/latest.json?page=2'
      );
    });

    it('should work with subdirectory installations', () => {
      const config = {
        ...mockForumConfig,
        apiConfig: {
          ...mockForumConfig.apiConfig,
          discourseUrl: 'https://example.com/forum',
        },
      };

      const subdirHelper = new DiscourseUrlHelper(config);

      expect(subdirHelper.getTopicUrl(123)).toBe('https://example.com/forum/t/123');
      expect(subdirHelper.getUserUrl('user')).toBe('https://example.com/forum/u/user');
    });
  });
});
