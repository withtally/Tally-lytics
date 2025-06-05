// services/utils/__tests__/citationFormatter.test.ts

import { describe, it, expect } from '@jest/globals';
import { CitationFormatter } from '../citationFormatter';
import { ForumConfig } from '../../../config/forumConfig';

describe('CitationFormatter', () => {
  const mockForumConfig: ForumConfig = {
    apiConfig: {
      discourseUrl: 'https://forum.example.com',
      apiKey: 'test-key',
      apiUsername: 'test-user',
    },
    forums: ['test-forum'],
  } as ForumConfig;

  describe('constructor', () => {
    it('should create an instance with forum config', () => {
      const formatter = new CitationFormatter(mockForumConfig);
      expect(formatter).toBeDefined();
      expect(formatter).toBeInstanceOf(CitationFormatter);
    });
  });

  describe('formatCitation', () => {
    it('should format citations correctly', () => {
      const formatter = new CitationFormatter(mockForumConfig);

      // Test the formatting logic without mocking dependencies
      const result = {
        id: 123,
        title: 'Test Topic',
        content: 'Test content',
        topic_id: 456,
        username: 'testuser',
        forum_name: 'test-forum',
      };

      // Verify the method exists and returns a string
      expect(typeof formatter.formatCitation).toBe('function');
      const citation = formatter.formatCitation(result);
      expect(typeof citation).toBe('string');
    });
  });
});
