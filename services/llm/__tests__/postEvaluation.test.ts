// Comprehensive tests for postEvaluation
import { describe, test, expect, beforeEach, mock } from 'bun:test';

// Mock OpenAI parse function with default implementation
const mockChatCompletionsParse = mock(() => {
  return Promise.resolve({
    choices: [{
      message: {
        parsed: {
          score: 8,
          reasoning: 'Test reasoning',
          tags: ['test'],
          summary: 'Test summary',
          relevance: 8,
        }
      }
    }],
    usage: {
      prompt_tokens: 100,
      completion_tokens: 50,
      total_tokens: 150,
    }
  });
});

// Mock the openaiClient module using resolved path
mock.module('/Users/dennisonbertram/Develop/DAO-helper-tool/services/llm/openaiClient.ts', () => ({
  openai: {
    beta: {
      chat: {
        completions: {
          parse: mockChatCompletionsParse,
        },
      },
    },
  },
  model: 'gpt-4-test-model',
}));

// Mock other required modules
mock.module('./schema', () => ({
  PostEvaluationSchema: {},
  BatchEvaluationSchema: {},
}));

mock.module('./prompt', () => ({
  systemPostPrompt: 'System prompt for testing',
}));

mock.module('openai/helpers/zod', () => ({
  zodResponseFormat: mock((schema: any, name: string) => ({ type: 'json_schema', name })),
}));

// Mock Logger
const mockLoggerInfo = mock();
const mockLoggerWarn = mock();
const mockLoggerError = mock();

mock.module('../../logging', () => ({
  Logger: mock(() => ({
    info: mockLoggerInfo,
    warn: mockLoggerWarn,
    error: mockLoggerError,
  })),
}));

// Mock LLM error handling
mock.module('../../errorHandling/llmErrors', () => ({
  withLLMErrorHandling: mock(async (operation: any) => await operation()),
  handleLLMError: mock((error: any) => { throw error; }),
  LLMError: mock(function(message: string, code: string, retryable: boolean = false) {
    const err = new Error(message);
    (err as any).code = code;
    (err as any).retryable = retryable;
    return err;
  }),
}));

// Mock other dependencies
mock.module('../../utils/numberUtils', () => ({
  roundNumericFields: mock((obj: any) => obj),
}));

mock.module('./contentProcessorService', () => ({
  sanitizeContent: mock((content: string) => content),
}));

mock.module('../../config/loggerConfig', () => ({
  loggerConfig: {},
}));

import { evaluatePost } from '../postEvaluation';

describe.skip('evaluatePost', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    mockChatCompletionsParse.mockClear();
    mockLoggerInfo.mockClear();
    mockLoggerWarn.mockClear();
    mockLoggerError.mockClear();
    
    // Set default mock response for successful calls
    mockChatCompletionsParse.mockResolvedValue({
      choices: [{
        message: {
          parsed: {
            score: 8,
            reasoning: 'Test reasoning',
            tags: ['test'],
            summary: 'Test summary',
            relevance: 8,
          }
        }
      }]
    });
  });

  describe.skip('basic functionality', () => {
    test('should evaluate a post successfully', async () => {
      const mockEvaluation = {
        parsed: {
          score: 8,
          reasoning: 'High-quality technical discussion',
          tags: ['technical', 'governance'],
          summary: 'Detailed proposal for protocol upgrade',
          relevance: 9,
        },
      };

      mockChatCompletionsParse.mockResolvedValue(mockEvaluation);

      const result = await evaluatePost(
        'This is a high-quality post about governance',
        'arbitrum'
      );

      expect(result).toEqual({
        score: 8,
        reasoning: 'High-quality technical discussion',
        tags: ['technical', 'governance'],
        summary: 'Detailed proposal for protocol upgrade',
        relevance: 9,
      });

      expect(mockChatCompletionsParse).toHaveBeenCalledWith({
        model: 'gpt-4-test-model',
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('This is a high-quality post about governance'),
          }),
        ]),
        response_format: expect.any(Object),
      });
    });

    test('should handle empty content', async () => {
      const mockEvaluation = {
        parsed: {
          score: 1,
          reasoning: 'Empty content provides no value',
          tags: [],
          summary: 'Empty post',
          relevance: 1,
        },
      };

      mockChatCompletionsParse.mockResolvedValue(mockEvaluation);

      const result = await evaluatePost('', 'arbitrum');

      expect(result).toEqual({
        score: 1,
        reasoning: 'Empty content provides no value',
        tags: [],
        summary: 'Empty post',
        relevance: 1,
      });
    });

    test('should handle very long content', async () => {
      const longContent = 'A'.repeat(10000);
      const mockEvaluation = {
        parsed: {
          score: 5,
          reasoning: 'Long but repetitive content',
          tags: ['verbose'],
          summary: 'Lengthy post with repetitive content',
          relevance: 4,
        },
      };

      mockChatCompletionsParse.mockResolvedValue(mockEvaluation);

      const result = await evaluatePost(longContent, 'arbitrum');

      expect(result).toBeDefined();
      expect(result.score).toBe(5);
    });
  });

  describe.skip('different forum contexts', () => {
    test('should evaluate for different forums', async () => {
      const mockEvaluation = {
        parsed: {
          score: 7,
          reasoning: 'Good proposal for Compound governance',
          tags: ['compound', 'governance'],
          summary: 'Proposal for Compound protocol',
          relevance: 8,
        },
      };

      mockChatCompletionsParse.mockResolvedValue(mockEvaluation);

      const result = await evaluatePost(
        'Proposal for Compound governance change',
        'compound'
      );

      expect(result).toEqual({
        score: 7,
        reasoning: 'Good proposal for Compound governance',
        tags: ['compound', 'governance'],
        summary: 'Proposal for Compound protocol',
        relevance: 8,
      });
    });
  });

  describe.skip('error handling', () => {
    test('should handle OpenAI API errors', async () => {
      mockChatCompletionsParse.mockRejectedValue(new Error('API Error'));

      await expect(
        evaluatePost('Test content', 'arbitrum')
      ).rejects.toThrow('API Error');

      expect(mockLoggerError).toHaveBeenCalled();
    });

    test('should handle malformed responses', async () => {
      mockChatCompletionsParse.mockResolvedValue({
        parsed: null, // Malformed response
      });

      await expect(
        evaluatePost('Test content', 'arbitrum')
      ).rejects.toThrow();
    });

    test('should handle missing parsed data', async () => {
      mockChatCompletionsParse.mockResolvedValue({
        // Missing parsed field
      });

      await expect(
        evaluatePost('Test content', 'arbitrum')
      ).rejects.toThrow();
    });
  });

  describe.skip('content analysis', () => {
    test('should evaluate technical content highly', async () => {
      const technicalContent = `
        This proposal outlines a new consensus mechanism that improves 
        transaction throughput by 300% while maintaining security guarantees.
        The implementation involves modifications to the block validation logic.
      `;

      const mockEvaluation = {
        parsed: {
          score: 9,
          reasoning: 'Excellent technical analysis with specific metrics',
          tags: ['technical', 'consensus', 'performance'],
          summary: 'Proposal for improved consensus mechanism',
          relevance: 9,
        },
      };

      mockChatCompletionsParse.mockResolvedValue(mockEvaluation);

      const result = await evaluatePost(technicalContent, 'arbitrum');

      expect(result.score).toBeGreaterThanOrEqual(8);
      expect(result.tags).toContain('technical');
    });

    test('should evaluate spam content lowly', async () => {
      const spamContent = 'Buy crypto now! Amazing returns! Click here!';

      const mockEvaluation = {
        parsed: {
          score: 1,
          reasoning: 'Clear spam content with no governance value',
          tags: ['spam'],
          summary: 'Spam post',
          relevance: 1,
        },
      };

      mockChatCompletionsParse.mockResolvedValue(mockEvaluation);

      const result = await evaluatePost(spamContent, 'arbitrum');

      expect(result.score).toBeLessThanOrEqual(2);
      expect(result.tags).toContain('spam');
    });
  });

  describe.skip('forum-specific evaluation', () => {
    test('should include forum context in evaluation', async () => {
      const content = 'Proposal to adjust interest rates';

      mockChatCompletionsParse.mockImplementation((params) => {
        expect(params.messages[0].content).toContain('arbitrum');
        return Promise.resolve({
          parsed: {
            score: 7,
            reasoning: 'Relevant to Arbitrum governance',
            tags: ['arbitrum', 'governance'],
            summary: 'Interest rate adjustment proposal',
            relevance: 8,
          },
        });
      });

      await evaluatePost(content, 'arbitrum');

      expect(mockChatCompletionsParse).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('arbitrum'),
            }),
          ]),
        })
      );
    });
  });

  describe.skip('edge cases', () => {
    test('should handle special characters in content', async () => {
      const specialContent = 'Content with émojis 🚀 and symbols @#$%^&*()';

      const mockEvaluation = {
        parsed: {
          score: 5,
          reasoning: 'Contains special characters but lacks substance',
          tags: ['informal'],
          summary: 'Post with special characters',
          relevance: 5,
        },
      };

      mockChatCompletionsParse.mockResolvedValue(mockEvaluation);

      const result = await evaluatePost(specialContent, 'arbitrum');

      expect(result).toBeDefined();
      expect(typeof result.score).toBe('number');
    });

    test('should handle code blocks in content', async () => {
      const codeContent = `
        Here's the implementation:
        \`\`\`solidity
        function transfer(address to, uint256 amount) public {
          require(balances[msg.sender] >= amount);
          balances[msg.sender] -= amount;
          balances[to] += amount;
        }
        \`\`\`
      `;

      const mockEvaluation = {
        parsed: {
          score: 8,
          reasoning: 'Contains technical implementation details',
          tags: ['technical', 'solidity', 'code'],
          summary: 'Code implementation discussion',
          relevance: 8,
        },
      };

      mockChatCompletionsParse.mockResolvedValue(mockEvaluation);

      const result = await evaluatePost(codeContent, 'arbitrum');

      expect(result.score).toBeGreaterThanOrEqual(7);
      expect(result.tags).toContain('technical');
    });
  });

  describe.skip('logging behavior', () => {
    test('should log evaluation attempts', async () => {
      const mockEvaluation = {
        parsed: {
          score: 6,
          reasoning: 'Standard evaluation',
          tags: ['general'],
          summary: 'General post',
          relevance: 6,
        },
      };

      mockChatCompletionsParse.mockResolvedValue(mockEvaluation);

      await evaluatePost('Test content', 'arbitrum');

      expect(mockLoggerInfo).toHaveBeenCalled();
    });

    test('should log errors appropriately', async () => {
      mockChatCompletionsParse.mockRejectedValue(new Error('Test error'));

      await expect(
        evaluatePost('Test content', 'arbitrum')
      ).rejects.toThrow();

      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.stringContaining('Error evaluating post'),
        expect.any(Object)
      );
    });
  });
});