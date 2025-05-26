// services/newsAPICrawler/__tests__/newsArticleEvaluationCrawler.test.ts
import { describe, it, expect, beforeEach, mock, spyOn } from 'bun:test';

// Mock dependencies
const mockLogger = {
  debug: mock(() => {}),
  info: mock(() => {}),
  warn: mock(() => {}),
  error: mock(() => {}),
};

const mockRateLimiter = {
  removeTokens: mock(() => Promise.resolve(undefined)),
};

const mockDb = mock(() => mockQueryBuilder);
const mockQueryBuilder = {
  select: mock(() => mockQueryBuilder),
  leftJoin: mock(() => mockQueryBuilder),
  whereNull: mock(() => mockQueryBuilder),
  limit: mock(() => mockQueryBuilder),
  insert: mock(() => mockQueryBuilder),
  onConflict: mock(() => mockQueryBuilder),
  merge: mock(() => Promise.resolve(undefined)),
  on: mock(() => mockQueryBuilder),
  andOn: mock(() => mockQueryBuilder),
};

const mockCallLLMWithRetry = mock(() => {});
const mockCountTokens = mock(() => {});

// Set up mocks
mock.module('../../logging', () => ({
  Logger: mock(() => mockLogger),
}));

mock.module('../../../config/loggerConfig', () => ({
  loggerConfig: { level: 'info' },
}));

mock.module('limiter', () => ({
  RateLimiter: mock(() => mockRateLimiter),
}));

mock.module('../../../db/db', () => ({
  default: mockDb,
}));

mock.module('../../llm/callLLMWithRetry', () => ({
  callLLMWithRetry: mockCallLLMWithRetry,
}));

mock.module('../../llm/tokenCounter', () => ({
  countTokens: mockCountTokens,
}));

import { crawlNewsArticleEvaluations } from '../newsArticleEvaluationCrawler';

describe.skip('newsArticleEvaluationCrawler', () => {
  beforeEach(() => {
    // Reset all mocks
    mockLogger.debug.mock.clear();
    mockLogger.info.mock.clear();
    mockLogger.warn.mock.clear();
    mockLogger.error.mock.clear();
    mockRateLimiter.removeTokens.mock.clear();
    mockDb.mock.clear();
    mockCallLLMWithRetry.mock.clear();
    mockCountTokens.mock.clear();
    
    // Reset query builder mocks
    Object.values(mockQueryBuilder).forEach(fn => {
      if (fn && typeof fn.mock === 'object') {
        fn.mock.clear();
      }
    });

    // Setup database mock
    mockQueryBuilder.select.mockImplementation(() => mockQueryBuilder);
    mockQueryBuilder.leftJoin.mockImplementation(() => mockQueryBuilder);
    mockQueryBuilder.whereNull.mockImplementation(() => mockQueryBuilder);
    mockQueryBuilder.limit.mockImplementation(() => mockQueryBuilder);
    mockQueryBuilder.insert.mockImplementation(() => mockQueryBuilder);
    mockQueryBuilder.onConflict.mockImplementation(() => mockQueryBuilder);
    mockQueryBuilder.merge.mockImplementation(() => Promise.resolve(undefined));
    mockQueryBuilder.on.mockImplementation(() => mockQueryBuilder);
    mockQueryBuilder.andOn.mockImplementation(() => mockQueryBuilder);

    mockDb.mockImplementation(() => mockQueryBuilder);

    // Default token count (under limit)
    mockCountTokens.mockImplementation(() => Promise.resolve(1000));
  });

  describe.skip('crawlNewsArticleEvaluations', () => {
    it('should process articles successfully', async () => {
      // Given
      const mockArticles = [
        {
          id: 1,
          title: 'Test Article 1',
          source_name: 'Test Source',
          source_id: 'test-source',
          published_at: '2023-01-01T00:00:00Z',
          author: 'Test Author',
          description: 'Test description',
          content: 'Test content',
          forum_name: 'arbitrum',
        },
        {
          id: 2,
          title: 'Test Article 2',
          source_name: 'Another Source',
          source_id: 'another-source',
          published_at: '2023-01-02T00:00:00Z',
          author: 'Another Author',
          description: 'Another description',
          content: 'Another content',
          forum_name: 'optimism',
        },
      ];

      const mockLLMResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                evaluation_summary: 'Good article about crypto governance',
                key_points: ['Point 1', 'Point 2', 'Point 3'],
                tags: ['governance', 'crypto', 'DAO'],
                suggested_improvements: 'Could include more data',
              }),
            },
          },
        ],
      };

      // First call returns articles, second call returns empty array
      mockQueryBuilder.limit
        .mockImplementationOnce(() => Promise.resolve(mockArticles))
        .mockImplementationOnce(() => Promise.resolve([]));

      mockCallLLMWithRetry.mockImplementation(() => Promise.resolve(mockLLMResponse));

      // When
      await crawlNewsArticleEvaluations();

      // Then
      expect(mockLogger.info).toHaveBeenCalledWith('Starting news article evaluations...');
      expect(mockLogger.info).toHaveBeenCalledWith('No more unevaluated articles found.');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Completed news article evaluations. Processed: 2 articles.'
      );

      // Verify database operations
      expect(mockDb).toHaveBeenCalledWith('news_articles');
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('news_articles.*');
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith(
        'news_article_evaluations',
        expect.any(Function)
      );
      expect(mockQueryBuilder.whereNull).toHaveBeenCalledWith('news_article_evaluations.id');
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(50);

      // Verify LLM calls
      expect(mockCallLLMWithRetry).toHaveBeenCalledTimes(2);
      expect(mockRateLimiter.removeTokens).toHaveBeenCalledTimes(2);

      // Verify evaluation insertions
      expect(mockDb).toHaveBeenCalledWith('news_article_evaluations');
      expect(mockQueryBuilder.insert).toHaveBeenCalledTimes(2);
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith({
        news_article_id: 1,
        forum_name: 'arbitrum',
        evaluation: 'Good article about crypto governance',
        metadata: {
          key_points: ['Point 1', 'Point 2', 'Point 3'],
          tags: ['governance', 'crypto', 'DAO'],
          suggested_improvements: 'Could include more data',
          raw_response: expect.any(String),
          llm_model: 'gpt-4',
        },
        relevance_score: 0,
        sentiment_score: 0,
      });
    });

    it('should handle no unevaluated articles', async () => {
      // Given
      mockQueryBuilder.limit.mockImplementation(() => Promise.resolve([]));

      // When
      await crawlNewsArticleEvaluations();

      // Then
      expect(mockLogger.info).toHaveBeenCalledWith('Starting news article evaluations...');
      expect(mockLogger.info).toHaveBeenCalledWith('No more unevaluated articles found.');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Completed news article evaluations. Processed: 0 articles.'
      );
      expect(mockCallLLMWithRetry).not.toHaveBeenCalled();
    });

    it('should handle LLM evaluation errors', async () => {
      // Given
      const mockArticle = {
        id: 1,
        title: 'Test Article',
        forum_name: 'arbitrum',
      };

      mockQueryBuilder.limit
        .mockImplementationOnce(() => Promise.resolve([mockArticle]))
        .mockImplementationOnce(() => Promise.resolve([]));

      const llmError = new Error('LLM service unavailable');
      mockCallLLMWithRetry.mockImplementation(() => Promise.reject(llmError));

      // When
      await crawlNewsArticleEvaluations();

      // Then
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error evaluating article ID 1: LLM service unavailable'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Completed news article evaluations. Processed: 0 articles.'
      );
    });

    it('should handle invalid JSON response from LLM', async () => {
      // Given
      const mockArticle = {
        id: 1,
        title: 'Test Article',
        source_name: 'Test Source',
        source_id: 'test-source',
        published_at: '2023-01-01T00:00:00Z',
        author: 'Test Author',
        description: 'Test description',
        content: 'Test content',
        forum_name: 'arbitrum',
      };

      mockQueryBuilder.limit
        .mockImplementationOnce(() => Promise.resolve([mockArticle]))
        .mockImplementationOnce(() => Promise.resolve([]));

      const invalidLLMResponse = {
        choices: [
          {
            message: {
              content: 'This is not valid JSON',
            },
          },
        ],
      };

      mockCallLLMWithRetry.mockImplementation(() => Promise.resolve(invalidLLMResponse));

      // When
      await crawlNewsArticleEvaluations();

      // Then
      expect(mockLogger.warn.mock.calls[0][0]).toContain('Failed to parse LLM response as JSON for article ID 1');

      // Should still insert evaluation with null values
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith({
        news_article_id: 1,
        forum_name: 'arbitrum',
        evaluation: '',
        metadata: {
          key_points: [],
          tags: [],
          suggested_improvements: null,
          raw_response: 'This is not valid JSON',
          llm_model: 'gpt-4',
        },
        relevance_score: 0,
        sentiment_score: 0,
      });
    });

    it('should handle empty LLM response', async () => {
      // Given
      const mockArticle = {
        id: 1,
        title: 'Test Article',
        forum_name: 'arbitrum',
      };

      mockQueryBuilder.limit
        .mockImplementationOnce(() => Promise.resolve([mockArticle]))
        .mockImplementationOnce(() => Promise.resolve([]));

      const emptyLLMResponse = {
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
      };

      mockCallLLMWithRetry.mockImplementation(() => Promise.resolve(emptyLLMResponse));

      // When
      await crawlNewsArticleEvaluations();

      // Then
      expect(mockLogger.warn).toHaveBeenCalledWith('Empty response from LLM for article ID 1');

      // Should still insert evaluation with default values
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith({
        news_article_id: 1,
        forum_name: 'arbitrum',
        evaluation: '',
        metadata: {
          key_points: [],
          tags: [],
          suggested_improvements: null,
          raw_response: null,
          llm_model: 'gpt-4',
        },
        relevance_score: 0,
        sentiment_score: 0,
      });
    });

    it('should handle long articles with summarization', async () => {
      // Given
      const mockArticle = {
        id: 1,
        title: 'Very Long Test Article',
        source_name: 'Test Source',
        source_id: 'test-source',
        published_at: '2023-01-01T00:00:00Z',
        author: 'Test Author',
        description: 'Test description',
        content: 'Very long content that exceeds token limit...',
        forum_name: 'arbitrum',
      };

      mockQueryBuilder.limit
        .mockImplementationOnce(() => Promise.resolve([mockArticle]))
        .mockImplementationOnce(() => Promise.resolve([]));

      // Mock token counting to exceed limit
      mockCountTokens
        .mockImplementationOnce(() => Promise.resolve(5000)) // Base content tokens
        .mockImplementationOnce(() => Promise.resolve(3500)) // Prompt tokens
        .mockImplementationOnce(() => Promise.resolve(7000)); // Summary + prompt tokens (under limit)

      const summaryResponse = 'This is a summarized version of the long article.';

      const evaluationResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                evaluation_summary: 'Good summarized article',
                key_points: ['Point 1', 'Point 2'],
                tags: ['governance'],
                suggested_improvements: 'Original was too long',
              }),
            },
          },
        ],
      };

      mockCallLLMWithRetry
        .mockImplementationOnce(() => Promise.resolve(summaryResponse)) // Summarization call returns string
        .mockImplementationOnce(() => Promise.resolve(evaluationResponse)); // Evaluation call

      // When
      await crawlNewsArticleEvaluations();

      // Then
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Article ID 1 is too long (8500 tokens). Summarizing...'
      );
      expect(mockCallLLMWithRetry).toHaveBeenCalledTimes(2); // Summary + evaluation
      const firstCall = mockCallLLMWithRetry.mock.calls[0];
      expect(firstCall[0]).toBe('gpt-4');
      expect(firstCall[1]).toContain('Please summarize it into a concise summary');
      expect(firstCall[2]).toBe(3);
      expect(firstCall[3]).toBe(2000);
      expect(firstCall[4]).toEqual({ max_tokens: 1024 });
    });

    it('should handle articles with missing fields', async () => {
      // Given
      const mockArticle = {
        id: 1,
        title: 'Test Article',
        forum_name: 'arbitrum',
        // Missing optional fields
      };

      mockQueryBuilder.limit
        .mockImplementationOnce(() => Promise.resolve([mockArticle]))
        .mockImplementationOnce(() => Promise.resolve([]));

      const mockLLMResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                evaluation_summary: 'Article with missing fields',
                key_points: ['Point 1'],
                tags: ['test'],
                suggested_improvements: 'Add more details',
              }),
            },
          },
        ],
      };

      mockCallLLMWithRetry.mockImplementation(() => Promise.resolve(mockLLMResponse));

      // When
      await crawlNewsArticleEvaluations();

      // Then
      const calls = mockCallLLMWithRetry.mock.calls;
      expect(calls[0][1]).toContain('Author: Unknown');
      expect(calls[0][1]).toContain('Description: N/A');
    });

    it('should handle database insertion errors', async () => {
      // Given
      const mockArticle = {
        id: 1,
        title: 'Test Article',
        forum_name: 'arbitrum',
      };

      mockQueryBuilder.limit
        .mockImplementationOnce(() => Promise.resolve([mockArticle]))
        .mockImplementationOnce(() => Promise.resolve([]));

      const mockLLMResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                evaluation_summary: 'Test evaluation',
                key_points: ['Point 1'],
                tags: ['test'],
                suggested_improvements: 'Test improvement',
              }),
            },
          },
        ],
      };

      mockCallLLMWithRetry.mockImplementation(() => Promise.resolve(mockLLMResponse));
      mockQueryBuilder.merge.mockImplementation(() => Promise.reject(new Error('Database connection failed')));

      // When
      await crawlNewsArticleEvaluations();

      // Then
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error evaluating article ID 1: Database connection failed'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Completed news article evaluations. Processed: 0 articles.'
      );
    });

    it('should handle malformed LLM response with non-array fields', async () => {
      // Given
      const mockArticle = {
        id: 1,
        title: 'Test Article',
        forum_name: 'arbitrum',
      };

      mockQueryBuilder.limit
        .mockImplementationOnce(() => Promise.resolve([mockArticle]))
        .mockImplementationOnce(() => Promise.resolve([]));

      const malformedLLMResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                evaluation_summary: 'Test evaluation',
                key_points: 'This should be an array but is a string',
                tags: 'This should also be an array',
                suggested_improvements: 'Test improvement',
              }),
            },
          },
        ],
      };

      mockCallLLMWithRetry.mockImplementation(() => Promise.resolve(malformedLLMResponse));

      // When
      await crawlNewsArticleEvaluations();

      // Then
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith({
        news_article_id: 1,
        forum_name: 'arbitrum',
        evaluation: 'Test evaluation',
        metadata: {
          key_points: [], // Should be converted to empty array
          tags: [], // Should be converted to empty array
          suggested_improvements: 'Test improvement',
          raw_response: expect.any(String),
          llm_model: 'gpt-4',
        },
        relevance_score: 0,
        sentiment_score: 0,
      });
    });

    it('should handle very long articles requiring truncation', async () => {
      // Given
      const mockArticle = {
        id: 1,
        title: 'Extremely Long Test Article',
        content: 'Very long content...',
        forum_name: 'arbitrum',
      };

      mockQueryBuilder.limit
        .mockImplementationOnce(() => Promise.resolve([mockArticle]))
        .mockImplementationOnce(() => Promise.resolve([]));

      // Mock token counting to still exceed limit after summarization
      mockCountTokens
        .mockImplementationOnce(() => Promise.resolve(5000)) // Base content tokens
        .mockImplementationOnce(() => Promise.resolve(3500)) // Prompt tokens
        .mockImplementationOnce(() => Promise.resolve(9000)); // Summary + prompt still over limit

      const summaryResponse = 'Very long summary that still exceeds limits...';
      const mockLLMResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                evaluation_summary: 'Truncated article evaluation',
                key_points: ['Point 1'],
                tags: ['governance'],
                suggested_improvements: 'Article was too long and truncated',
              }),
            },
          },
        ],
      };

      mockCallLLMWithRetry
        .mockImplementationOnce(() => Promise.resolve(summaryResponse)) // Summarization call returns string
        .mockImplementationOnce(() => Promise.resolve(mockLLMResponse)); // Evaluation call

      // When
      await crawlNewsArticleEvaluations();

      // Then
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Article ID 1 is too long (8500 tokens). Summarizing...'
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Even summarized article ID 1 is too long. Truncating further...'
      );
      expect(mockCallLLMWithRetry).toHaveBeenCalledTimes(2);
    });
  });
});