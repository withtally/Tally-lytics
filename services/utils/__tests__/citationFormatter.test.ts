// services/utils/__tests__/citationFormatter.test.ts

import { describe, it, beforeEach, expect, mock, spyOn } from 'bun:test';
import { ForumConfig } from '../../../config/forumConfig';

// Mock DiscourseUrlHelper methods
const mockUrlHelper = {
  getTopicUrl: mock(() => ''),
  getPostUrl: mock(() => ''),
  getUserUrl: mock(() => ''),
};

// Mock the DiscourseUrlHelper module
mock.module('../discourseUrls', () => ({
  DiscourseUrlHelper: mock(() => mockUrlHelper),
}));

import { CitationFormatter } from '../citationFormatter';

describe('CitationFormatter', () => {
  let formatter: CitationFormatter;
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

    // Reset mocks
    mockUrlHelper.getTopicUrl.mockClear();
    mockUrlHelper.getPostUrl.mockClear();
    mockUrlHelper.getUserUrl.mockClear();

    formatter = new CitationFormatter(mockForumConfig);
  });

  describe('constructor', () => {
    it('should create formatter with forum config', () => {
      expect(formatter).toBeInstanceOf(CitationFormatter);
    });

    it('should initialize DiscourseUrlHelper', () => {
      const newFormatter = new CitationFormatter(mockForumConfig);
      expect(newFormatter).toBeInstanceOf(CitationFormatter);
    });
  });

  describe('formatCitation', () => {
    const baseResult = {
      id: 123,
      title: 'Test Topic',
      content: 'This is test content',
      topic_id: 456,
      forum_name: 'test-forum',
    };

    beforeEach(() => {
      mockUrlHelper.getTopicUrl.mockReturnValue('https://forum.example.com/t/test-topic/456');
      mockUrlHelper.getPostUrl.mockReturnValue('https://forum.example.com/t/test-topic/456/5');
      mockUrlHelper.getUserUrl.mockReturnValue('https://forum.example.com/u/testuser');
    });

    it('should format basic citation with title and content', () => {
      const result = formatter.formatCitation(baseResult);

      expect(mockUrlHelper.getTopicUrl).toHaveBeenCalledWith(456, undefined);
      expect(result).toBe(
        '[Test Topic](https://forum.example.com/t/test-topic/456)\n' + 'This is test content'
      );
    });

    it('should format citation with all fields including post number', () => {
      const fullResult = {
        ...baseResult,
        post_number: 5,
        username: 'testuser',
        slug: 'test-topic',
      };

      const result = formatter.formatCitation(fullResult);

      expect(mockUrlHelper.getTopicUrl).toHaveBeenCalledWith(456, 'test-topic');
      expect(mockUrlHelper.getPostUrl).toHaveBeenCalledWith(456, 5, 'test-topic');
      expect(mockUrlHelper.getUserUrl).toHaveBeenCalledWith('testuser');

      expect(result).toBe(
        '[Test Topic](https://forum.example.com/t/test-topic/456)\n' +
          'This is test content\n' +
          '[View Post](https://forum.example.com/t/test-topic/456/5)\n' +
          'Posted by [testuser](https://forum.example.com/u/testuser)'
      );
    });

    it('should format citation with username but no post number', () => {
      const resultWithUsername = {
        ...baseResult,
        username: 'testuser',
      };

      const result = formatter.formatCitation(resultWithUsername);

      expect(mockUrlHelper.getTopicUrl).toHaveBeenCalledWith(456, undefined);
      expect(mockUrlHelper.getUserUrl).toHaveBeenCalledWith('testuser');
      expect(mockUrlHelper.getPostUrl).not.toHaveBeenCalled();

      expect(result).toBe(
        '[Test Topic](https://forum.example.com/t/test-topic/456)\n' +
          'This is test content\n' +
          'Posted by [testuser](https://forum.example.com/u/testuser)'
      );
    });

    it('should format citation with post number but no username', () => {
      const resultWithPostNumber = {
        ...baseResult,
        post_number: 3,
        slug: 'test-slug',
      };

      const result = formatter.formatCitation(resultWithPostNumber);

      expect(mockUrlHelper.getTopicUrl).toHaveBeenCalledWith(456, 'test-slug');
      expect(mockUrlHelper.getPostUrl).toHaveBeenCalledWith(456, 3, 'test-slug');
      expect(mockUrlHelper.getUserUrl).not.toHaveBeenCalled();

      expect(result).toBe(
        '[Test Topic](https://forum.example.com/t/test-topic/456)\n' +
          'This is test content\n' +
          '[View Post](https://forum.example.com/t/test-topic/456/5)'
      );
    });

    it('should handle missing topic_id by not creating links', () => {
      const resultNoTopicId = {
        ...baseResult,
        topic_id: 0,
        username: 'testuser',
      };

      const result = formatter.formatCitation(resultNoTopicId);

      expect(mockUrlHelper.getTopicUrl).not.toHaveBeenCalled();
      expect(mockUrlHelper.getPostUrl).not.toHaveBeenCalled();
      expect(mockUrlHelper.getUserUrl).toHaveBeenCalledWith('testuser');

      expect(result).toBe(
        'Test Topic\n' +
          'This is test content\n' +
          'Posted by [testuser](https://forum.example.com/u/testuser)'
      );
    });

    it('should handle null topic_id', () => {
      const resultNullTopicId = {
        ...baseResult,
        topic_id: null as any,
      };

      const result = formatter.formatCitation(resultNullTopicId);

      expect(mockUrlHelper.getTopicUrl).not.toHaveBeenCalled();
      expect(result).toBe('Test Topic\n' + 'This is test content');
    });

    it('should handle zero post number by not creating post link', () => {
      const resultZeroPost = {
        ...baseResult,
        post_number: 0,
        username: 'testuser',
      };

      const result = formatter.formatCitation(resultZeroPost);

      expect(mockUrlHelper.getPostUrl).not.toHaveBeenCalled();
      expect(result).toBe(
        '[Test Topic](https://forum.example.com/t/test-topic/456)\n' +
          'This is test content\n' +
          'Posted by [testuser](https://forum.example.com/u/testuser)'
      );
    });

    it('should handle negative post number by not creating post link', () => {
      const resultNegativePost = {
        ...baseResult,
        post_number: -1,
        username: 'testuser',
      };

      const result = formatter.formatCitation(resultNegativePost);

      expect(mockUrlHelper.getPostUrl).not.toHaveBeenCalled();
      expect(result).toBe(
        '[Test Topic](https://forum.example.com/t/test-topic/456)\n' +
          'This is test content\n' +
          'Posted by [testuser](https://forum.example.com/u/testuser)'
      );
    });

    it('should handle empty username', () => {
      const resultEmptyUsername = {
        ...baseResult,
        username: '',
        post_number: 5,
      };

      const result = formatter.formatCitation(resultEmptyUsername);

      expect(mockUrlHelper.getUserUrl).not.toHaveBeenCalled();
      expect(result).toBe(
        '[Test Topic](https://forum.example.com/t/test-topic/456)\n' +
          'This is test content\n' +
          '[View Post](https://forum.example.com/t/test-topic/456/5)'
      );
    });

    it('should handle special characters in title and content', () => {
      const resultSpecialChars = {
        ...baseResult,
        title: 'Title with [brackets] and (parentheses)',
        content: 'Content with **markdown** and *emphasis*',
      };

      const result = formatter.formatCitation(resultSpecialChars);

      expect(result).toContain('Title with [brackets] and (parentheses)');
      expect(result).toContain('Content with **markdown** and *emphasis*');
    });

    it('should handle unicode characters', () => {
      const resultUnicode = {
        ...baseResult,
        title: 'Tópíc wíth ùnícôdé 🚀',
        content: 'Cóntént wíth émójís 💯',
        username: 'usér-ñamé',
      };

      const result = formatter.formatCitation(resultUnicode);

      expect(result).toContain('Tópíc wíth ùnícôdé 🚀');
      expect(result).toContain('Cóntént wíth émójís 💯');
      expect(mockUrlHelper.getUserUrl).toHaveBeenCalledWith('usér-ñamé');
    });

    it('should handle very long content', () => {
      const longContent = 'A'.repeat(1000);
      const resultLongContent = {
        ...baseResult,
        content: longContent,
      };

      const result = formatter.formatCitation(resultLongContent);

      expect(result).toContain(longContent);
    });

    it('should handle slug with special characters', () => {
      const resultSpecialSlug = {
        ...baseResult,
        slug: 'topic-with-special-chars-123',
        post_number: 1,
      };

      const result = formatter.formatCitation(resultSpecialSlug);

      expect(mockUrlHelper.getTopicUrl).toHaveBeenCalledWith(456, 'topic-with-special-chars-123');
      expect(mockUrlHelper.getPostUrl).toHaveBeenCalledWith(456, 1, 'topic-with-special-chars-123');
    });

    it('should handle missing content gracefully', () => {
      const resultNoContent = {
        ...baseResult,
        content: '',
      };

      const result = formatter.formatCitation(resultNoContent);

      expect(result).toBe('[Test Topic](https://forum.example.com/t/test-topic/456)\n');
    });
  });

  describe('formatCitations', () => {
    const result1 = {
      id: 1,
      title: 'First Topic',
      content: 'First content',
      topic_id: 100,
      forum_name: 'test-forum',
    };

    const result2 = {
      id: 2,
      title: 'Second Topic',
      content: 'Second content',
      topic_id: 200,
      username: 'user2',
      post_number: 3,
      forum_name: 'test-forum',
    };

    const result3 = {
      id: 3,
      title: 'Third Topic',
      content: 'Third content',
      topic_id: 300,
      username: 'user3',
      forum_name: 'test-forum',
    };

    beforeEach(() => {
      mockUrlHelper.getTopicUrl.mockImplementation(
        (topicId: number) => `https://forum.example.com/t/topic/${topicId}`
      );
      mockUrlHelper.getPostUrl.mockImplementation(
        (topicId: number, postNumber: number) =>
          `https://forum.example.com/t/topic/${topicId}/${postNumber}`
      );
      mockUrlHelper.getUserUrl.mockImplementation(
        (username: string) => `https://forum.example.com/u/${username}`
      );
    });

    it('should format empty array', () => {
      const result = formatter.formatCitations([]);
      expect(result).toBe('');
    });

    it('should format single result', () => {
      const result = formatter.formatCitations([result1]);

      expect(result).toBe(
        '[First Topic](https://forum.example.com/t/topic/100)\n' + 'First content'
      );
    });

    it('should format multiple results with double newline separation', () => {
      const result = formatter.formatCitations([result1, result2]);

      expect(result).toBe(
        '[First Topic](https://forum.example.com/t/topic/100)\n' +
          'First content\n\n' +
          '[Second Topic](https://forum.example.com/t/topic/200)\n' +
          'Second content\n' +
          '[View Post](https://forum.example.com/t/topic/200/3)\n' +
          'Posted by [user2](https://forum.example.com/u/user2)'
      );
    });

    it('should format three results correctly', () => {
      const result = formatter.formatCitations([result1, result2, result3]);

      const expectedParts = result.split('\n\n');
      expect(expectedParts).toHaveLength(3);

      expect(expectedParts[0]).toContain('First Topic');
      expect(expectedParts[1]).toContain('Second Topic');
      expect(expectedParts[1]).toContain('View Post');
      expect(expectedParts[2]).toContain('Third Topic');
      expect(expectedParts[2]).toContain('Posted by [user3]');
    });

    it('should handle mixed result types', () => {
      const mixedResults = [
        result1, // Basic result
        { ...result2, topic_id: 0 }, // No topic ID
        { ...result3, post_number: 0 }, // Zero post number
      ];

      const result = formatter.formatCitations(mixedResults);
      const parts = result.split('\n\n');

      expect(parts).toHaveLength(3);
      expect(parts[0]).toContain('[First Topic]'); // With link
      expect(parts[1]).toContain('Second Topic'); // Without link (no topic_id)
      expect(parts[1]).not.toContain('[Second Topic]');
      expect(parts[2]).toContain('[Third Topic]'); // With link but no post link
      expect(parts[2]).not.toContain('View Post');
    });

    it('should handle large arrays efficiently', () => {
      const largeArray = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        title: `Topic ${i}`,
        content: `Content ${i}`,
        topic_id: i + 1000,
        forum_name: 'test-forum',
      }));

      const result = formatter.formatCitations(largeArray);
      const parts = result.split('\n\n');

      expect(parts).toHaveLength(100);
      expect(parts[0]).toContain('Topic 0');
      expect(parts[99]).toContain('Topic 99');
    });

    it('should maintain consistent formatting across all results', () => {
      const identicalResults = Array.from({ length: 3 }, () => ({ ...result1 }));

      const result = formatter.formatCitations(identicalResults);
      const parts = result.split('\n\n');

      expect(parts).toHaveLength(3);
      // All parts should be identical
      expect(parts[0]).toBe(parts[1]);
      expect(parts[1]).toBe(parts[2]);
    });
  });

  describe('integration with DiscourseUrlHelper', () => {
    it('should pass correct parameters to getTopicUrl', () => {
      const result = {
        id: 1,
        title: 'Test',
        content: 'Content',
        topic_id: 123,
        slug: 'test-slug',
        forum_name: 'test-forum',
      };

      formatter.formatCitation(result);

      expect(mockUrlHelper.getTopicUrl).toHaveBeenCalledWith(123, 'test-slug');
      expect(mockUrlHelper.getTopicUrl).toHaveBeenCalledTimes(1);
    });

    it('should pass correct parameters to getPostUrl', () => {
      const result = {
        id: 1,
        title: 'Test',
        content: 'Content',
        topic_id: 123,
        post_number: 5,
        slug: 'test-slug',
        forum_name: 'test-forum',
      };

      formatter.formatCitation(result);

      expect(mockUrlHelper.getPostUrl).toHaveBeenCalledWith(123, 5, 'test-slug');
      expect(mockUrlHelper.getPostUrl).toHaveBeenCalledTimes(1);
    });

    it('should pass correct parameters to getUserUrl', () => {
      const result = {
        id: 1,
        title: 'Test',
        content: 'Content',
        topic_id: 123,
        username: 'testuser',
        forum_name: 'test-forum',
      };

      formatter.formatCitation(result);

      expect(mockUrlHelper.getUserUrl).toHaveBeenCalledWith('testuser');
      expect(mockUrlHelper.getUserUrl).toHaveBeenCalledTimes(1);
    });

    it('should handle URL helper returning different URL formats', () => {
      mockUrlHelper.getTopicUrl.mockReturnValue('/relative/topic/url');
      mockUrlHelper.getUserUrl.mockReturnValue('/relative/user/url');

      const result = {
        id: 1,
        title: 'Test',
        content: 'Content',
        topic_id: 123,
        username: 'testuser',
        forum_name: 'test-forum',
      };

      const citation = formatter.formatCitation(result);

      expect(citation).toContain('[Test](/relative/topic/url)');
      expect(citation).toContain('[testuser](/relative/user/url)');
    });
  });
});
