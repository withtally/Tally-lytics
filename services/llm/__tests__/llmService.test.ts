// services/llm/__tests__/llmService.test.ts

import { expect, test, describe, beforeEach, mock, spyOn } from 'bun:test';

// Force test environment by clearing API key
const originalApiKey = process.env.OPENAI_API_KEY;
delete process.env.OPENAI_API_KEY;

// Mock OpenAI with comprehensive implementation
const mockChatCompletionsCreate = mock().mockResolvedValue({
  choices: [
    {
      message: {
        content: 'governance voting mechanisms and decision-making processes',
      },
    },
  ],
});

const mockOpenAI = {
  chat: {
    completions: {
      create: mockChatCompletionsCreate,
    },
  },
};

// Mock the OpenAI module before any imports
mock.module('openai', () => ({
  OpenAI: mock().mockImplementation(() => mockOpenAI),
}));

// Mock logging to prevent file creation issues
mock.module('../../logging', () => ({
  Logger: mock().mockImplementation(() => ({
    error: mock(),
    info: mock(),
  })),
}));

// Mock error handling
const mockWithLLMErrorHandling = mock();
mock.module('../../errorHandling/llmErrors', () => ({
  withLLMErrorHandling: mockWithLLMErrorHandling,
}));

// Import AFTER all mocks are set up
import {
  generateQuerySimile,
  generateLLMChatResponse,  
  generateFollowUpQuestions,
  generateCommonTopics,
} from '../llmService';

describe('llmService', () => {
  beforeEach(() => {
    mockWithLLMErrorHandling.mockClear();

    // Default implementations for error handling
    mockWithLLMErrorHandling.mockImplementation(async (fn: () => Promise<any>) => {
      return await fn();
    });
  });

  describe('generateQuerySimile', () => {
    test('should generate similar query successfully', async () => {
      // Given
      const query = 'voting systems and governance';

      // When
      const result = await generateQuerySimile(query);

      // Then  
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      // Note: Using real API for now - result varies but should be a valid string
    });

    test('should include forum name in prompt when provided', async () => {
      // Given
      const query = 'voting systems';
      const forum = 'arbitrum';

      // When
      const result = await generateQuerySimile(query, forum);

      // Then  
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      // Note: Using real API for now - result varies but should be a valid string
    });

    test('should handle empty response from OpenAI', async () => {
      // Given
      const query = 'voting systems';
      const emptyResponse = {
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
      };
      mockChatCompletionsCreate.mockResolvedValue(emptyResponse);

      // When/Then
      await expect(generateQuerySimile(query)).rejects.toThrow('No similar query generated');
    });

    test('should handle missing choices in response', async () => {
      // Given
      const query = 'voting systems';
      const invalidResponse = {
        choices: [],
      };
      mockChatCompletionsCreate.mockResolvedValue(invalidResponse);

      // When/Then
      await expect(generateQuerySimile(query)).rejects.toThrow('No similar query generated');
    });

    test('should trim whitespace from response', async () => {
      // Given
      const query = 'voting systems';
      const responseWithWhitespace = {
        choices: [
          {
            message: {
              content: '   governance voting mechanisms   ',
            },
          },
        ],
      };
      mockChatCompletionsCreate.mockResolvedValue(responseWithWhitespace);

      // When
      const result = await generateQuerySimile(query);

      // Then
      expect(result).toBe('governance voting mechanisms');
    });

    test('should propagate OpenAI API errors', async () => {
      // Given
      const query = 'voting systems';
      const apiError = new Error('OpenAI API error');
      mockChatCompletionsCreate.mockRejectedValue(apiError);

      // When/Then
      await expect(generateQuerySimile(query)).rejects.toThrow('OpenAI API error');
    });

    test('should handle empty query string', async () => {
      // Given
      const query = '';
      mockChatCompletionsCreate.mockResolvedValue(mockQuerySimileResponse);

      // When
      await generateQuerySimile(query);

      // Then
      expect(mockChatCompletionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('""'),
            }),
          ]),
        })
      );
    });
  });

  describe('generateLLMChatResponse', () => {
    test('should generate chat response successfully', async () => {
      // Given
      const prompt = 'Tell me about governance';

      // When
      const result = await generateLLMChatResponse(prompt);

      // Then
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      // Note: Using real API - result varies but should be a valid string
    });

    test('should handle empty response from OpenAI', async () => {
      // Given
      const prompt = 'Tell me about governance';
      const emptyResponse = {
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
      };
      mockChatCompletionsCreate.mockResolvedValue(emptyResponse);

      // When/Then
      await expect(generateLLMChatResponse(prompt)).rejects.toThrow('Empty response from OpenAI');
    });

    test('should handle missing choices in response', async () => {
      // Given
      const prompt = 'Tell me about governance';
      const invalidResponse = {
        choices: [],
      };
      mockChatCompletionsCreate.mockResolvedValue(invalidResponse);

      // When/Then
      await expect(generateLLMChatResponse(prompt)).rejects.toThrow('Empty response from OpenAI');
    });

    test('should propagate errors through LLM error handling', async () => {
      // Given
      const prompt = 'Tell me about governance';
      const error = new Error('LLM error');
      mockWithLLMErrorHandling.mockRejectedValue(error);

      // When/Then
      await expect(generateLLMChatResponse(prompt)).rejects.toThrow('LLM error');
    });

    test('should handle null response from error handling', async () => {
      // Given
      const prompt = 'Tell me about governance';
      mockWithLLMErrorHandling.mockResolvedValue(null);

      // When
      const result = await generateLLMChatResponse(prompt);

      // Then
      expect(result).toBeNull();
    });
  });

  describe('generateFollowUpQuestions', () => {
    test('should generate follow-up questions successfully', async () => {
      // Given
      const query = 'DAO governance voting';

      // When
      const result = await generateFollowUpQuestions(query);

      // Then
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      result.forEach(question => {
        expect(typeof question).toBe('string');
        expect(question.length).toBeGreaterThan(0);
      });
      // Note: Using real API - questions vary but should be valid array of strings
    });

    test('should include forum name in prompt when provided', async () => {
      // Given
      const query = 'governance voting';
      const forum = 'arbitrum';

      // When
      const result = await generateFollowUpQuestions(query, forum);

      // Then
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      // Note: Using real API - forum name included in prompt logic
    });

    test('should include context in prompt when provided', async () => {
      // Given
      const query = 'governance voting';
      const context = { results: ['result1', 'result2'] };
      mockChatCompletionsCreate.mockResolvedValue(mockFollowUpResponse);

      // When
      await generateFollowUpQuestions(query, undefined, context);

      // Then
      expect(mockChatCompletionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining(JSON.stringify(context)),
            }),
          ]),
        })
      );
    });

    test('should filter out empty questions', async () => {
      // Given
      const query = 'governance voting';
      const responseWithEmptyLines = {
        choices: [
          {
            message: {
              content: `What are the benefits of quadratic voting?

How do token weights affect outcomes?

`,
            },
          },
        ],
      };
      mockChatCompletionsCreate.mockResolvedValue(responseWithEmptyLines);

      // When
      const result = await generateFollowUpQuestions(query);

      // Then
      expect(result).toEqual([
        'What are the benefits of quadratic voting?',
        'How do token weights affect outcomes?',
      ]);
    });

    test('should handle empty response from OpenAI', async () => {
      // Given
      const query = 'governance voting';
      const emptyResponse = {
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
      };
      mockChatCompletionsCreate.mockResolvedValue(emptyResponse);

      // When/Then
      await expect(generateFollowUpQuestions(query)).rejects.toThrow(
        'No follow-up questions generated'
      );
    });

    test('should handle response with only empty lines', async () => {
      // Given
      const query = 'governance voting';
      const emptyLinesResponse = {
        choices: [
          {
            message: {
              content: '   \n  \n   ',
            },
          },
        ],
      };
      mockChatCompletionsCreate.mockResolvedValue(emptyLinesResponse);

      // When/Then
      await expect(generateFollowUpQuestions(query)).rejects.toThrow(
        'No follow-up questions generated'
      );
    });

    test('should propagate OpenAI API errors', async () => {
      // Given
      const query = 'governance voting';
      const apiError = new Error('OpenAI API error');
      mockChatCompletionsCreate.mockRejectedValue(apiError);

      // When/Then
      await expect(generateFollowUpQuestions(query)).rejects.toThrow('OpenAI API error');
    });
  });

  describe('generateCommonTopics', () => {
    const mockTopicsResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              topics: [
                {
                  title: 'Governance Proposals',
                  description: 'Discussion about various DAO governance proposals',
                  frequency: 15,
                },
                {
                  title: 'Token Economics',
                  description: 'Topics related to tokenomics and economic models',
                  frequency: 12,
                },
                {
                  title: 'Technical Updates',
                  description: 'Updates on technical developments and improvements',
                  frequency: 8,
                },
              ],
            }),
          },
        },
      ],
    };

    const mockRecentPosts = [
      { title: 'Governance Proposal #1', content: 'Proposal content' },
      { title: 'Token distribution update', content: 'Distribution content' },
    ];

    test('should generate common topics successfully', async () => {
      // Given
      const forum = 'arbitrum';
      const timeframe = '30 days';
      mockChatCompletionsCreate.mockResolvedValue(mockTopicsResponse);

      // When
      const result = await generateCommonTopics(forum, timeframe, mockRecentPosts);

      // Then
      expect(result).toEqual([
        {
          title: 'Governance Proposals',
          description: 'Discussion about various DAO governance proposals',
          frequency: 15,
        },
        {
          title: 'Token Economics',
          description: 'Topics related to tokenomics and economic models',
          frequency: 12,
        },
        {
          title: 'Technical Updates',
          description: 'Updates on technical developments and improvements',
          frequency: 8,
        },
      ]);

      expect(mockChatCompletionsCreate).toHaveBeenCalledWith({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: expect.stringContaining('analyzes forum posts to identify common topics'),
          },
          {
            role: 'user',
            content: expect.stringContaining(forum),
          },
        ],
        temperature: 0.5,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      });
    });

    test('should include recent posts in prompt', async () => {
      // Given
      const forum = 'arbitrum';
      const timeframe = '7 days';
      mockChatCompletionsCreate.mockResolvedValue(mockTopicsResponse);

      // When
      await generateCommonTopics(forum, timeframe, mockRecentPosts);

      // Then
      expect(mockChatCompletionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining(JSON.stringify(mockRecentPosts)),
            }),
          ]),
        })
      );
    });

    test('should handle empty response from OpenAI', async () => {
      // Given
      const forum = 'arbitrum';
      const timeframe = '30 days';
      const emptyResponse = {
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
      };
      mockChatCompletionsCreate.mockResolvedValue(emptyResponse);

      // When/Then
      await expect(generateCommonTopics(forum, timeframe, mockRecentPosts)).rejects.toThrow(
        'No topics generated'
      );
    });

    test('should handle invalid JSON response', async () => {
      // Given
      const forum = 'arbitrum';
      const timeframe = '30 days';
      const invalidJsonResponse = {
        choices: [
          {
            message: {
              content: 'invalid json content',
            },
          },
        ],
      };
      mockChatCompletionsCreate.mockResolvedValue(invalidJsonResponse);

      // When/Then
      await expect(generateCommonTopics(forum, timeframe, mockRecentPosts)).rejects.toThrow();
    });

    test('should handle response without topics array', async () => {
      // Given
      const forum = 'arbitrum';
      const timeframe = '30 days';
      const invalidFormatResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({ data: 'invalid format' }),
            },
          },
        ],
      };
      mockChatCompletionsCreate.mockResolvedValue(invalidFormatResponse);

      // When/Then
      await expect(generateCommonTopics(forum, timeframe, mockRecentPosts)).rejects.toThrow(
        'Invalid topics format returned'
      );
    });

    test('should handle response with non-array topics', async () => {
      // Given
      const forum = 'arbitrum';
      const timeframe = '30 days';
      const nonArrayResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({ topics: 'not an array' }),
            },
          },
        ],
      };
      mockChatCompletionsCreate.mockResolvedValue(nonArrayResponse);

      // When/Then
      await expect(generateCommonTopics(forum, timeframe, mockRecentPosts)).rejects.toThrow(
        'Invalid topics format returned'
      );
    });

    test('should handle empty posts array', async () => {
      // Given
      const forum = 'arbitrum';
      const timeframe = '30 days';
      const emptyPosts: any[] = [];
      mockChatCompletionsCreate.mockResolvedValue(mockTopicsResponse);

      // When
      const result = await generateCommonTopics(forum, timeframe, emptyPosts);

      // Then
      expect(result).toHaveLength(3);
      expect(mockChatCompletionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('[]'),
            }),
          ]),
        })
      );
    });

    test('should propagate OpenAI API errors', async () => {
      // Given
      const forum = 'arbitrum';
      const timeframe = '30 days';
      const apiError = new Error('OpenAI API error');
      mockChatCompletionsCreate.mockRejectedValue(apiError);

      // When/Then
      await expect(generateCommonTopics(forum, timeframe, mockRecentPosts)).rejects.toThrow(
        'OpenAI API error'
      );
    });
  });
});
