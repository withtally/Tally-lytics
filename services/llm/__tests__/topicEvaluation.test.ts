// services/llm/__tests__/topicEvaluation.test.ts

import { expect, test, describe, beforeEach } from '@jest/globals';
import { TopicEvaluationSchema, TopicSummarySchema } from '../schema';

// Mock the dependencies
const mockChatCompletionsParse = jest.fn();
const mockOpenAI = {
  beta: {
    chat: {
      completions: {
        parse: mockChatCompletionsParse,
      },
    },
  },
};

const mockZodResponseFormat = jest.fn();
const mockSanitizeContent = jest.fn();
const mockWithLLMErrorHandling = jest.fn();

jest.mock('openai', () => ({
  OpenAI: jest.fn(() => mockOpenAI),
}));

jest.mock('openai/helpers/zod', () => ({
  zodResponseFormat: mockZodResponseFormat,
}));

jest.mock('../openaiClient', () => ({
  openai: mockOpenAI,
  model: 'gpt-4o-mini',
}));

jest.mock('../contentProcessorService', () => ({
  sanitizeContent: mockSanitizeContent,
}));

jest.mock('../../errorHandling/llmErrors', () => ({
  withLLMErrorHandling: mockWithLLMErrorHandling,
}));

jest.mock('../../../config/loggerConfig', () => ({
  loggerConfig: {
    level: 'info',
  },
}));

jest.mock('../../logging', () => ({
  Logger: mock().mockImplementation(() => ({
    info: mock(),
    error: mock(),
  })),
}));

import { summarizeTopicContent, evaluateTopicChunk } from '../topicEvaluation';

describe('topicEvaluation', () => {
  beforeEach(() => {
    mockChatCompletionsParse.mockClear();
    mockZodResponseFormat.mockClear();
    mockSanitizeContent.mockClear();
    mockWithLLMErrorHandling.mockClear();

    // Default implementations
    mockSanitizeContent.mockImplementation((content: string) => content);
    mockWithLLMErrorHandling.mockImplementation(async (fn: () => Promise<any>) => {
      return await fn();
    });
    mockZodResponseFormat.mockReturnValue({ type: 'json_object' });
  });

  describe('summarizeTopicContent', () => {
    const mockTopicSummary = {
      summary: 'This topic discusses governance proposals and voting mechanisms',
      tags: ['governance', 'voting', 'proposals'],
    };

    const mockCompletion = {
      choices: [
        {
          message: {
            parsed: mockTopicSummary,
          },
        },
      ],
    };

    test('should generate topic summary successfully', async () => {
      // Given
      const content = 'Topic content about governance voting and proposals';
      mockChatCompletionsParse.mockResolvedValue(mockCompletion);

      // When
      const result = await summarizeTopicContent(content);

      // Then
      expect(result).toEqual({
        summary: mockTopicSummary.summary,
        tags: mockTopicSummary.tags,
      });

      expect(mockWithLLMErrorHandling).toHaveBeenCalledWith(
        expect.any(Function),
        'Summarizing Topic Content'
      );

      expect(mockSanitizeContent).toHaveBeenCalledWith(content);
      expect(mockZodResponseFormat).toHaveBeenCalledWith(TopicSummarySchema, 'topic_summary');
      expect(mockChatCompletionsParse).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: expect.any(String),
          },
          {
            role: 'user',
            content: expect.stringContaining(content),
          },
        ],
        response_format: { type: 'json_object' },
      });
    });

    test('should handle null LLM response due to insufficient credits for summary', async () => {
      // Given
      const content = 'Topic content';
      mockWithLLMErrorHandling.mockResolvedValue(null);

      // When/Then
      await expect(summarizeTopicContent(content)).rejects.toThrow(
        'Topic summary skipped due to insufficient LLM credits'
      );
    });

    test('should handle parsed data with missing fields gracefully', async () => {
      // Given
      const content = 'Topic content';
      const incompleteCompletion = {
        choices: [
          {
            message: {
              parsed: {
                summary: undefined,
                tags: undefined,
              },
            },
          },
        ],
      };
      mockChatCompletionsParse.mockResolvedValue(incompleteCompletion);

      // When
      const result = await summarizeTopicContent(content);

      // Then
      expect(result).toEqual({
        summary: 'No summary provided',
        tags: [],
      });
    });

    test('should handle parsed data with null values gracefully', async () => {
      // Given
      const content = 'Topic content';
      const nullCompletion = {
        choices: [
          {
            message: {
              parsed: null,
            },
          },
        ],
      };
      mockChatCompletionsParse.mockResolvedValue(nullCompletion);

      // When
      const result = await summarizeTopicContent(content);

      // Then
      expect(result).toEqual({
        summary: 'No summary provided',
        tags: [],
      });
    });

    test('should propagate OpenAI API errors', async () => {
      // Given
      const content = 'Topic content';
      const apiError = new Error('OpenAI API error');
      mockChatCompletionsParse.mockRejectedValue(apiError);

      // When/Then
      await expect(summarizeTopicContent(content)).rejects.toThrow('OpenAI API error');
    });

    test('should sanitize content before sending to LLM', async () => {
      // Given
      const content = 'Topic content with <script>alert("xss")</script>';
      const sanitizedContent = 'Topic content with [sanitized]';
      mockSanitizeContent.mockReturnValue(sanitizedContent);
      mockChatCompletionsParse.mockResolvedValue(mockCompletion);

      // When
      await summarizeTopicContent(content);

      // Then
      expect(mockSanitizeContent).toHaveBeenCalledWith(content);
      expect(mockChatCompletionsParse).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining(sanitizedContent),
            }),
          ]),
        })
      );
    });

    test('should handle empty content', async () => {
      // Given
      const content = '';
      mockChatCompletionsParse.mockResolvedValue(mockCompletion);

      // When
      const result = await summarizeTopicContent(content);

      // Then
      expect(result).toEqual({
        summary: mockTopicSummary.summary,
        tags: mockTopicSummary.tags,
      });
    });

    test('should handle long content', async () => {
      // Given
      const content = 'x'.repeat(10000);
      mockChatCompletionsParse.mockResolvedValue(mockCompletion);

      // When
      const result = await summarizeTopicContent(content);

      // Then
      expect(result).toEqual({
        summary: mockTopicSummary.summary,
        tags: mockTopicSummary.tags,
      });
      expect(mockSanitizeContent).toHaveBeenCalledWith(content);
    });
  });

  describe('evaluateTopicChunk', () => {
    const mockTopicEvaluation = {
      overall_quality: 8.5,
      helpfulness: 8.0,
      relevance: 9.2,
      unique_perspective: 7.5,
      logical_reasoning: 8.8,
      fact_based: 8.2,
      clarity: 9.0,
      constructiveness: 8.5,
      hostility: 2.0,
      emotional_tone: 6.5,
      engagement_potential: 8.7,
      persuasiveness: 8.3,
      dominant_topic: 'governance proposals',
      key_points: ['proposal implementation', 'community voting', 'token allocation'],
      suggested_improvements: 'Consider adding more specific timelines',
      tags: ['governance', 'proposals', 'community'],
    };

    const mockCompletion = {
      choices: [
        {
          message: {
            parsed: mockTopicEvaluation,
          },
        },
      ],
    };

    test('should evaluate topic chunk successfully', async () => {
      // Given
      const chunkText = 'Topic chunk about governance proposals';
      const forumName = 'arbitrum';
      mockChatCompletionsParse.mockResolvedValue(mockCompletion);

      // When
      const result = await evaluateTopicChunk(chunkText, forumName);

      // Then
      expect(result).toEqual({
        llm_model: 'gpt-4o-mini',
        forum_name: forumName,
        ...mockTopicEvaluation,
      });

      expect(mockWithLLMErrorHandling).toHaveBeenCalledWith(
        expect.any(Function),
        'Evaluating Topic Chunk error'
      );

      expect(mockSanitizeContent).toHaveBeenCalledWith(chunkText);
      expect(mockZodResponseFormat).toHaveBeenCalledWith(TopicEvaluationSchema, 'topic_evaluation');
      expect(mockChatCompletionsParse).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: expect.any(String),
          },
          {
            role: 'user',
            content: chunkText,
          },
        ],
        response_format: { type: 'json_object' },
      });
    });

    test('should handle null LLM response due to insufficient credits for evaluation', async () => {
      // Given
      const chunkText = 'Topic chunk';
      const forumName = 'arbitrum';
      mockWithLLMErrorHandling.mockResolvedValue(null);

      // When/Then
      await expect(evaluateTopicChunk(chunkText, forumName)).rejects.toThrow(
        'Topic chunk summary skipped due to insufficient LLM credits'
      );
    });

    test('should handle different forum names', async () => {
      // Given
      const chunkText = 'Topic chunk';
      const forumName = 'uniswap';
      mockChatCompletionsParse.mockResolvedValue(mockCompletion);

      // When
      const result = await evaluateTopicChunk(chunkText, forumName);

      // Then
      expect(result.forum_name).toBe(forumName);
      expect(result.llm_model).toBe('gpt-4o-mini');
    });

    test('should sanitize chunk text before evaluation', async () => {
      // Given
      const chunkText = 'Chunk with <script>malicious code</script>';
      const sanitizedText = 'Chunk with [sanitized]';
      const forumName = 'arbitrum';
      mockSanitizeContent.mockReturnValue(sanitizedText);
      mockChatCompletionsParse.mockResolvedValue(mockCompletion);

      // When
      await evaluateTopicChunk(chunkText, forumName);

      // Then
      expect(mockSanitizeContent).toHaveBeenCalledWith(chunkText);
      expect(mockChatCompletionsParse).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: sanitizedText,
            }),
          ]),
        })
      );
    });

    test('should propagate OpenAI API errors during evaluation', async () => {
      // Given
      const chunkText = 'Topic chunk';
      const forumName = 'arbitrum';
      const apiError = new Error('OpenAI API evaluation error');
      mockChatCompletionsParse.mockRejectedValue(apiError);

      // When/Then
      await expect(evaluateTopicChunk(chunkText, forumName)).rejects.toThrow(
        'OpenAI API evaluation error'
      );
    });

    test('should handle empty chunk text', async () => {
      // Given
      const chunkText = '';
      const forumName = 'arbitrum';
      mockChatCompletionsParse.mockResolvedValue(mockCompletion);

      // When
      const result = await evaluateTopicChunk(chunkText, forumName);

      // Then
      expect(result).toEqual({
        llm_model: 'gpt-4o-mini',
        forum_name: forumName,
        ...mockTopicEvaluation,
      });
    });

    test('should handle very long chunk text', async () => {
      // Given
      const chunkText = 'Long chunk text. '.repeat(1000);
      const forumName = 'arbitrum';
      mockChatCompletionsParse.mockResolvedValue(mockCompletion);

      // When
      const result = await evaluateTopicChunk(chunkText, forumName);

      // Then
      expect(result.forum_name).toBe(forumName);
      expect(mockSanitizeContent).toHaveBeenCalledWith(chunkText);
    });

    test('should include all required fields in evaluation result', async () => {
      // Given
      const chunkText = 'Topic chunk';
      const forumName = 'arbitrum';
      mockChatCompletionsParse.mockResolvedValue(mockCompletion);

      // When
      const result = await evaluateTopicChunk(chunkText, forumName);

      // Then
      expect(result).toHaveProperty('llm_model');
      expect(result).toHaveProperty('forum_name');
      expect(result).toHaveProperty('overall_quality');
      expect(result).toHaveProperty('helpfulness');
      expect(result).toHaveProperty('relevance');
      expect(result).toHaveProperty('unique_perspective');
      expect(result).toHaveProperty('logical_reasoning');
      expect(result).toHaveProperty('fact_based');
      expect(result).toHaveProperty('clarity');
      expect(result).toHaveProperty('constructiveness');
      expect(result).toHaveProperty('hostility');
      expect(result).toHaveProperty('emotional_tone');
      expect(result).toHaveProperty('engagement_potential');
      expect(result).toHaveProperty('persuasiveness');
      expect(result).toHaveProperty('dominant_topic');
      expect(result).toHaveProperty('key_points');
      expect(result).toHaveProperty('suggested_improvements');
      expect(result).toHaveProperty('tags');
    });

    test('should handle malformed evaluation data gracefully', async () => {
      // Given
      const chunkText = 'Topic chunk';
      const forumName = 'arbitrum';
      const malformedCompletion = {
        choices: [
          {
            message: {
              parsed: {
                overall_quality: null,
                relevance: undefined,
                dominant_topic: '',
                tags: null,
              },
            },
          },
        ],
      };
      mockChatCompletionsParse.mockResolvedValue(malformedCompletion);

      // When
      const result = await evaluateTopicChunk(chunkText, forumName);

      // Then
      expect(result.llm_model).toBe('gpt-4o-mini');
      expect(result.forum_name).toBe(forumName);
      expect(result.overall_quality).toBeNull();
      expect(result.relevance).toBeUndefined();
      expect(result.dominant_topic).toBe('');
      expect(result.tags).toBeNull();
    });
  });
});
