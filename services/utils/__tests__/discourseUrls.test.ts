// services/utils/__tests__/discourseUrls.test.ts

import { describe, it, expect, beforeEach } from '@jest/globals';
import { DiscourseUrlHelper } from '../discourseUrls';

describe('DiscourseUrlHelper', () => {
  const baseUrl = 'https://forum.example.com';
  const mockForumConfig = {
    apiConfig: {
      discourseUrl: baseUrl,
      apiKey: 'test-key',
      apiUsername: 'test-user',
    },
    forums: ['test-forum'],
  } as any;
  let urlHelper: DiscourseUrlHelper;

  beforeEach(() => {
    urlHelper = new DiscourseUrlHelper(mockForumConfig);
  });

  describe('constructor', () => {
    it('should create instance with forum config', () => {
      expect(urlHelper).toBeDefined();
      expect(urlHelper).toBeInstanceOf(DiscourseUrlHelper);
    });

    it('should handle base URL with trailing slash', () => {
      const configWithSlash = {
        ...mockForumConfig,
        apiConfig: {
          ...mockForumConfig.apiConfig,
          discourseUrl: baseUrl + '/',
        },
      };
      const helperWithSlash = new DiscourseUrlHelper(configWithSlash);
      expect(helperWithSlash).toBeDefined();
    });
  });

  describe('getTopicUrl', () => {
    it('should generate correct topic URL', () => {
      const topicId = 123;
      const slug = 'test-topic-slug';
      const url = urlHelper.getTopicUrl(topicId, slug);
      
      expect(url).toBe(`${baseUrl}/t/${slug}/${topicId}`);
    });

    it('should handle missing slug', () => {
      const topicId = 123;
      const url = urlHelper.getTopicUrl(topicId);
      
      expect(url).toBe(`${baseUrl}/t/${topicId}`);
    });
  });

  describe('getPostUrl', () => {
    it('should generate correct post URL', () => {
      const topicId = 123;
      const postNumber = 5;
      const url = urlHelper.getPostUrl(topicId, postNumber);
      
      expect(url).toBe(`${baseUrl}/t/${topicId}/${postNumber}`);
    });

    it('should generate correct post URL with slug', () => {
      const topicId = 123;
      const postNumber = 5;
      const slug = 'test-topic';
      const url = urlHelper.getPostUrl(topicId, postNumber, slug);
      
      expect(url).toBe(`${baseUrl}/t/${slug}/${topicId}/${postNumber}`);
    });
  });

  describe('getUserUrl', () => {
    it('should generate correct user URL', () => {
      const username = 'testuser';
      const url = urlHelper.getUserUrl(username);
      
      expect(url).toBe(`${baseUrl}/u/${username}`);
    });
  });
});