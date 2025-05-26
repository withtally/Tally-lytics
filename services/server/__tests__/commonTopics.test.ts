// API route tests for common topics endpoints
import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';

// Create mock function references
const mockGetCommonTopics = mock(() => {});
const mockGetCommonTopicById = mock(() => {});
const mockGenerateCommonTopics = mock(() => {});
const mockGenerateCommonTopicsFromSearchLogs = mock(() => {});
const mockGenerateLLMChatResponse = mock(() => {});
const mockRecordJobStart = mock(() => {});
const mockRecordJobCompletion = mock(() => {});
const mockValidateParam = mock(() => {});
const mockValidateQueryArray = mock(() => {});
const mockCreateErrorResponse = mock(() => {});
const mockCreateSuccessResponse = mock(() => {});
const mockHandleValidationError = mock(() => {});

// Mock all dependencies before importing
mock.module('../../topics/commonTopicsService', () => ({
  commonTopicsService: {
    getCommonTopics: mockGetCommonTopics,
    getCommonTopicById: mockGetCommonTopicById,
    generateCommonTopics: mockGenerateCommonTopics,
    generateCommonTopicsFromSearchLogs: mockGenerateCommonTopicsFromSearchLogs,
  },
}));

mock.module('../../logging', () => ({
  Logger: mock(() => ({
    info: mock(() => {}),
    warn: mock(() => {}),
    error: mock(() => {}),
  })),
}));

mock.module('../../llm/llmService', () => ({
  generateLLMChatResponse: mockGenerateLLMChatResponse,
}));

mock.module('../../cron/jobTrackingService', () => ({
  jobTrackingService: {
    recordJobStart: mockRecordJobStart,
    recordJobCompletion: mockRecordJobCompletion,
  },
}));

mock.module('../../../config/forumConfig', () => ({
  forumConfigs: {
    ARBITRUM: { name: 'ARBITRUM' },
    COMPOUND: { name: 'COMPOUND' },
    UNISWAP: { name: 'UNISWAP' },
  },
}));

mock.module('../../validation/paramValidator', () => ({
  validateParam: mockValidateParam,
  validateQueryArray: mockValidateQueryArray,
}));

mock.module('../../utils/errorResponse', () => ({
  createErrorResponse: mockCreateErrorResponse,
  createSuccessResponse: mockCreateSuccessResponse,
  handleValidationError: mockHandleValidationError,
}));

import { Hono } from 'hono';
import { commonTopicsRoutes } from '../commonTopicsRoutes';

describe.skip('Common Topics API Routes', () => {
  let app: Hono;
  let dateSpy: any;

  // Helper function to make requests
  const makeRequest = async (
    path: string,
    method: string = 'GET',
    body?: any,
    headers?: Record<string, string>
  ) => {
    const options: RequestInit = { method };
    if (body) {
      options.body = JSON.stringify(body);
      options.headers = { 'Content-Type': 'application/json', ...headers };
    } else if (headers) {
      options.headers = headers;
    }
    const request = new Request(`http://localhost${path}`, options);
    const response = await app.fetch(request);
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: response.headers.get('content-type')?.includes('application/json')
        ? await response.json()
        : await response.text(),
    };
  };

  beforeEach(() => {
    app = new Hono();

    // Mount the common topics routes
    app.route('/', commonTopicsRoutes);

    // Clear all mocks
    mockGetCommonTopics.mock.clear();
    mockGetCommonTopicById.mock.clear();
    mockGenerateCommonTopics.mock.clear();
    mockGenerateCommonTopicsFromSearchLogs.mock.clear();
    mockGenerateLLMChatResponse.mock.clear();
    mockRecordJobStart.mock.clear();
    mockRecordJobCompletion.mock.clear();
    mockValidateParam.mock.clear();
    mockValidateQueryArray.mock.clear();
    mockCreateErrorResponse.mock.clear();
    mockCreateSuccessResponse.mock.clear();
    mockHandleValidationError.mock.clear();

    dateSpy = spyOn(Date.prototype, 'toISOString').mockReturnValue('2024-01-01T00:00:00.000Z');

    // Setup default mock implementations
    mockValidateParam.mockImplementation((value: any, type: any) => {
      if (type === 'number') {
        const num = parseInt(value, 10);
        if (isNaN(num)) throw { code: 'VALIDATION_ERROR', message: 'Invalid number' };
        return num;
      }
      return value;
    });

    mockValidateQueryArray.mockImplementation((value: any) => {
      if (!value) return undefined;
      return value.split(',');
    });

    mockCreateErrorResponse.mockImplementation((message: any, code: any) => ({
      error: message,
      code,
    }));
    mockCreateSuccessResponse.mockImplementation((data: any) => ({ success: true, data }));
    mockHandleValidationError.mockImplementation((error: any) => ({
      error: error.message,
      code: error.code,
    }));

    mockRecordJobStart.mockImplementation(() => Promise.resolve('job-123'));
    mockRecordJobCompletion.mockImplementation(() => Promise.resolve(undefined));
  });

  afterEach(() => {
    dateSpy?.mockRestore();
  });

  describe.skip('GET /api/common-topics', () => {
    const mockTopics = [
      {
        id: 1,
        name: 'Governance Proposals',
        base_metadata: { votes: 50, posts: 25 },
        forum_name: 'ARBITRUM',
        context: 'Full context here',
        citations: 'Citations here',
      },
      {
        id: 2,
        name: 'DeFi Protocols',
        base_metadata: { votes: 30, posts: 15 },
        forum_name: 'COMPOUND',
        context: 'Full context here',
        citations: 'Citations here',
      },
    ];

    it('should return minimal topic data successfully', async () => {
      // Given
      mockGetCommonTopics.mockImplementation(() => Promise.resolve(mockTopics));

      // When
      const response = await makeRequest('/api/common-topics');

      // Then
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: {
          topics: [
            {
              id: 1,
              name: 'Governance Proposals',
              base_metadata: { votes: 50, posts: 25 },
              forum_name: 'ARBITRUM',
            },
            {
              id: 2,
              name: 'DeFi Protocols',
              base_metadata: { votes: 30, posts: 15 },
              forum_name: 'COMPOUND',
            },
          ],
        },
      });

      expect(mockGetCommonTopics).toHaveBeenCalledWith(undefined);
    });

    it('should filter by forum names', async () => {
      // Given
      mockGetCommonTopics.mockImplementation(() => Promise.resolve([mockTopics[0]]));

      // When
      const response = await makeRequest('/api/common-topics?forums=ARBITRUM,COMPOUND');

      // Then
      expect(response.status).toBe(200);
      expect(mockValidateQueryArray).toHaveBeenCalledWith('ARBITRUM,COMPOUND');
      expect(mockGetCommonTopics).toHaveBeenCalledWith(['ARBITRUM', 'COMPOUND']);
    });

    it('should handle validation errors', async () => {
      // Given
      mockValidateQueryArray.mockImplementation(() => {
        throw { code: 'VALIDATION_ERROR', message: 'Invalid forum format' };
      });

      // When
      const response = await makeRequest('/api/common-topics?forums=invalid!forum');

      // Then
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Invalid forum format',
        code: 'VALIDATION_ERROR',
      });
    });

    it('should handle service errors', async () => {
      // Given
      mockGetCommonTopics.mockImplementation(() => Promise.reject(new Error('Database error')));

      // When
      const response = await makeRequest('/api/common-topics');

      // Then
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Failed to fetch common topics',
        code: 'INTERNAL_ERROR',
      });
    });

    it('should handle empty results', async () => {
      // Given
      mockGetCommonTopics.mockImplementation(() => Promise.resolve([]));

      // When
      const response = await makeRequest('/api/common-topics');

      // Then
      expect(response.status).toBe(200);
      expect((response.body as any).data.topics).toEqual([]);
    });
  });

  describe.skip('GET /api/common-topics/full', () => {
    const mockFullTopics = [
      {
        id: 1,
        name: 'Governance Proposals',
        base_metadata: { votes: 50, posts: 25 },
        forum_name: 'ARBITRUM',
        context: 'Full context with detailed information',
        citations: 'Detailed citations here',
      },
    ];

    it('should return full topic data successfully', async () => {
      // Given
      mockGetCommonTopics.mockImplementation(() => Promise.resolve(mockFullTopics));

      // When
      const response = await makeRequest('/api/common-topics/full');

      // Then
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: { topics: mockFullTopics },
      });
    });

    it('should handle errors similar to basic endpoint', async () => {
      // Given
      mockGetCommonTopics.mockImplementation(() => Promise.reject(new Error('Service unavailable')));

      // When
      const response = await makeRequest('/api/common-topics/full');

      // Then
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Failed to fetch common topics',
        code: 'INTERNAL_ERROR',
      });
    });
  });

  describe.skip('GET /api/common-topics/:id', () => {
    const mockTopic = {
      id: 1,
      name: 'Governance Proposals',
      base_metadata: { votes: 50, posts: 25 },
      forum_name: 'ARBITRUM',
      context: 'Full context here',
      citations: 'Citations here',
    };

    it('should return specific topic by ID', async () => {
      // Given
      mockGetCommonTopicById.mockImplementation(() => Promise.resolve(mockTopic));

      // When
      const response = await makeRequest('/api/common-topics/1');

      // Then
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: { topic: mockTopic },
      });

      expect(mockValidateParam).toHaveBeenCalledWith('1', 'number');
      expect(mockGetCommonTopicById).toHaveBeenCalledWith(1);
    });

    it('should return 404 when topic not found', async () => {
      // Given
      mockGetCommonTopicById.mockImplementation(() => Promise.resolve(null));

      // When
      const response = await makeRequest('/api/common-topics/999');

      // Then
      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: 'Topic not found',
        code: 'NOT_FOUND',
      });
    });

    it('should handle invalid ID parameter', async () => {
      // Given
      mockValidateParam.mockImplementation(() => {
        throw { code: 'VALIDATION_ERROR', message: 'Invalid ID format' };
      });

      // When
      const response = await makeRequest('/api/common-topics/invalid');

      // Then
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Invalid ID format',
        code: 'VALIDATION_ERROR',
      });
    });

    it('should handle service errors', async () => {
      // Given
      mockGetCommonTopicById.mockImplementation(() => Promise.reject(new Error('Database connection failed')));

      // When
      const response = await makeRequest('/api/common-topics/1');

      // Then
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Failed to fetch topic',
        code: 'INTERNAL_ERROR',
      });
    });
  });

  describe.skip('POST /api/common-topics/generate', () => {
    beforeEach(() => {
      // Clear any existing environment variable
      delete process.env.CRON_API_KEY;
    });

    it('should generate topics for a specific forum', async () => {
      // Given
      const requestBody = { forum: 'ARBITRUM', timeframe: '7d' };
      mockGenerateCommonTopics.mockImplementation(() => Promise.resolve(undefined));

      // When
      const response = await makeRequest('/api/common-topics/generate', 'POST', requestBody);

      // Then
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'Common topics generation completed',
        timestamp: '2024-01-01T00:00:00.000Z',
      });

      expect(mockRecordJobStart).toHaveBeenCalledWith('generate_topics_ARBITRUM');
      expect(mockGenerateCommonTopics).toHaveBeenCalledWith('ARBITRUM', '7d');
      expect(mockRecordJobCompletion).toHaveBeenCalledWith('job-123', 'success');
    });

    it('should use default timeframe when not provided', async () => {
      // Given
      const requestBody = { forum: 'COMPOUND' };
      mockGenerateCommonTopics.mockImplementation(() => Promise.resolve(undefined));

      // When
      const response = await makeRequest('/api/common-topics/generate', 'POST', requestBody);

      // Then
      expect(response.status).toBe(200);
      expect(mockGenerateCommonTopics).toHaveBeenCalledWith('COMPOUND', '14d');
    });

    it('should return 400 when forum is missing', async () => {
      // When
      const response = await makeRequest('/api/common-topics/generate', 'POST', {});

      // Then
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Forum parameter is required',
      });
    });

    it('should handle API key authentication', async () => {
      // Given
      process.env.CRON_API_KEY = 'test-api-key';
      const requestBody = { forum: 'ARBITRUM' };

      // When - missing API key
      const response1 = await makeRequest('/api/common-topics/generate', 'POST', requestBody);

      // Then
      expect(response1.status).toBe(401);
      expect(response1.body).toEqual({
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
      });

      // When - correct API key
      mockGenerateCommonTopics.mockImplementation(() => Promise.resolve(undefined));
      const response2 = await makeRequest('/api/common-topics/generate', 'POST', requestBody, {
        'X-API-Key': 'test-api-key',
      });

      // Then
      expect(response2.status).toBe(200);
    });

    it('should handle generation errors and record job failure', async () => {
      // Given
      const requestBody = { forum: 'ARBITRUM' };
      mockGenerateCommonTopics.mockImplementation(() => Promise.reject(new Error('Generation failed')));

      // When
      const response = await makeRequest('/api/common-topics/generate', 'POST', requestBody);

      // Then
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Failed to generate common topics',
      });

      expect(mockRecordJobCompletion).toHaveBeenCalledWith(
        'job-123',
        'failed',
        'Generation failed'
      );
    });

    it('should handle insufficient data error', async () => {
      // Given
      const requestBody = { forum: 'ARBITRUM' };
      const insufficientDataError = new Error('Not enough data available');
      insufficientDataError.name = 'InsufficientDataError';
      mockGenerateCommonTopics.mockImplementation(() => Promise.reject(insufficientDataError));

      // When
      const response = await makeRequest('/api/common-topics/generate', 'POST', requestBody);

      // Then
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Not enough data available',
        code: 'INSUFFICIENT_DATA',
      });
    });
  });

  describe.skip('POST /api/common-topics/generate-all', () => {
    beforeEach(() => {
      delete process.env.CRON_API_KEY;
    });

    it('should generate topics for all forums', async () => {
      // Given
      const requestBody = { timeframe: '7d' };
      mockGenerateCommonTopicsFromSearchLogs.mockImplementation(() => Promise.resolve(undefined));
      mockGenerateCommonTopics.mockImplementation(() => Promise.resolve(undefined));

      // When
      const response = await makeRequest('/api/common-topics/generate-all', 'POST', requestBody);

      // Then
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'Common topics generation completed for all forums',
        results: {
          ARBITRUM: 'success',
          COMPOUND: 'success',
          UNISWAP: 'success',
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      });

      expect(mockGenerateCommonTopicsFromSearchLogs).toHaveBeenCalledWith('7d');
      expect(mockGenerateCommonTopics).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures in forum processing', async () => {
      // Given
      const requestBody = { timeframe: '14d' };
      mockGenerateCommonTopicsFromSearchLogs.mockImplementation(() => Promise.resolve(undefined));
      mockGenerateCommonTopics
        .mockImplementationOnce(() => Promise.resolve(undefined)) // ARBITRUM succeeds
        .mockImplementationOnce(() => Promise.reject(new Error('COMPOUND failed'))) // COMPOUND fails
        .mockImplementationOnce(() => Promise.resolve(undefined)); // UNISWAP succeeds

      // When
      const response = await makeRequest('/api/common-topics/generate-all', 'POST', requestBody);

      // Then
      expect(response.status).toBe(200);
      expect((response.body as any).results.ARBITRUM).toBe('success');
      expect((response.body as any).results.COMPOUND).toBe('error: COMPOUND failed');
      expect((response.body as any).results.UNISWAP).toBe('success');
    });

    it('should continue processing forums even if search logs fail', async () => {
      // Given
      const requestBody = {};
      mockGenerateCommonTopicsFromSearchLogs.mockImplementation(() => Promise.reject(new Error('Search logs failed')));
      mockGenerateCommonTopics.mockImplementation(() => Promise.resolve(undefined));

      // When
      const response = await makeRequest('/api/common-topics/generate-all', 'POST', requestBody);

      // Then
      expect(response.status).toBe(200);
      expect((response.body as any).results.ARBITRUM).toBe('success');
      expect(mockGenerateCommonTopics).toHaveBeenCalledTimes(3);
    });

    it('should handle API key authentication', async () => {
      // Given
      process.env.CRON_API_KEY = 'test-api-key';

      // When - incorrect API key
      const response1 = await makeRequest(
        '/api/common-topics/generate-all',
        'POST',
        {},
        {
          'X-API-Key': 'wrong-key',
        }
      );

      // Then
      expect(response1.status).toBe(401);
    });
  });

  describe.skip('POST /api/common-topics/:id/chat', () => {
    const mockTopic = {
      id: 1,
      name: 'Governance Proposals',
      context: 'Detailed context about governance',
      citations: 'Citation sources',
    };

    it('should generate chat response using topic context', async () => {
      // Given
      mockGetCommonTopicById.mockImplementation(() => Promise.resolve(mockTopic));
      mockGenerateLLMChatResponse.mockImplementation(() => Promise.resolve('AI response based on topic context'));
      const requestBody = { message: 'What are the main points?' };

      // When
      const response = await makeRequest('/api/common-topics/1/chat', 'POST', requestBody);

      // Then
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        response: 'AI response based on topic context',
      });

      expect(mockGetCommonTopicById).toHaveBeenCalledWith(1);
      expect(mockGenerateLLMChatResponse).toHaveBeenCalledWith(
        expect.stringContaining('Detailed context about governance')
      );
    });

    it('should return 400 for invalid topic ID', async () => {
      // When
      const response = await makeRequest('/api/common-topics/invalid/chat', 'POST', {
        message: 'test',
      });

      // Then
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Invalid topic ID',
      });
    });

    it('should return 400 when message is missing', async () => {
      // When
      const response = await makeRequest('/api/common-topics/1/chat', 'POST', {});

      // Then
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Message is required',
      });
    });

    it('should return 404 when topic not found', async () => {
      // Given
      mockGetCommonTopicById.mockImplementation(() => Promise.resolve(null));

      // When
      const response = await makeRequest('/api/common-topics/1/chat', 'POST', {
        message: 'test question',
      });

      // Then
      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: 'Topic not found',
      });
    });

    it('should handle LLM service errors', async () => {
      // Given
      mockGetCommonTopicById.mockImplementation(() => Promise.resolve(mockTopic));
      mockGenerateLLMChatResponse.mockImplementation(() => Promise.reject(new Error('LLM service unavailable')));

      // When
      const response = await makeRequest('/api/common-topics/1/chat', 'POST', {
        message: 'test question',
      });

      // Then
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Failed to process chat',
      });
    });
  });
});