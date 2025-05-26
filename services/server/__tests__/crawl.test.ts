// API route tests for crawl endpoints
import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';

// Create mock function references
const mockValidateParam = mock(() => {});
const mockCreateErrorResponse = mock(() => {});
const mockCreateSuccessResponse = mock(() => {});
const mockHandleValidationError = mock(() => {});

// Mock CrawlerManager
class MockCrawlerManager {
  getAllStatuses = mock(() => {});
  getStatus = mock(() => {});
  startCrawl = mock(() => {});
  stopCrawl = mock(() => {});
}

// Mock Logger
class MockLogger {
  info = mock(() => {});
  warn = mock(() => {});
  error = mock(() => {});
}

// Mock all dependencies before importing
mock.module('../../crawling/crawlerManager', () => ({
  CrawlerManager: MockCrawlerManager,
}));
mock.module('../../logging', () => ({
  Logger: MockLogger,
}));
mock.module('../../validation/paramValidator', () => ({
  validateParam: mockValidateParam,
}));
mock.module('../../utils/errorResponse', () => ({
  createErrorResponse: mockCreateErrorResponse,
  createSuccessResponse: mockCreateSuccessResponse,
  handleValidationError: mockHandleValidationError,
}));
mock.module('../../../config/forumConfig', () => ({
  forumConfigs: [{ name: 'ARBITRUM' }, { name: 'COMPOUND' }, { name: 'UNISWAP' }],
}));

import { Hono } from 'hono';
import { crawlRoutes } from '../crawl';
import { CrawlerManager } from '../../crawling/crawlerManager';
import { Logger } from '../../logging';

describe('Crawl API Routes', () => {
  let app: Hono;
  let mockCrawlerManager: MockCrawlerManager;
  let mockLogger: MockLogger;
  let dateSpy: any;

  // Helper function to make requests
  const makeRequest = async (
    path: string,
    method: string = 'GET',
    headers: Record<string, string> = {}
  ) => {
    const request = new Request(`http://localhost${path}`, { method, headers });
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
    mockCrawlerManager = new MockCrawlerManager();
    mockLogger = new MockLogger();

    // Setup crawl routes with mocked dependencies
    crawlRoutes(app, mockCrawlerManager as any, mockLogger as any);

    // Reset mock implementations

    dateSpy = spyOn(Date.prototype, 'toISOString').mockReturnValue('2024-01-01T00:00:00.000Z');
    mockValidateParam.mockImplementation((value: any, type: any) => {
      if (!value) throw { code: 'VALIDATION_ERROR', message: `${type} parameter is required` };
      return value;
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
  });

  afterEach(() => {
    dateSpy?.mockRestore();
  });

  describe('GET /api/crawl/status', () => {
    it('should return all crawler statuses successfully', async () => {
      // Given
      const mockStatuses = [
        { forumName: 'ARBITRUM', status: 'idle', lastRun: '2024-01-01T00:00:00.000Z' },
        { forumName: 'COMPOUND', status: 'running', lastRun: '2024-01-01T00:00:00.000Z' },
      ];
      mockCrawlerManager.getAllStatuses.mockImplementation(() => mockStatuses);

      // When
      const response = await makeRequest('/api/crawl/status');

      // Then
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        statuses: mockStatuses,
        timestamp: '2024-01-01T00:00:00.000Z',
      });
      expect(mockCrawlerManager.getAllStatuses).toHaveBeenCalledTimes(1);
    });

    it('should handle crawler manager errors', async () => {
      // Given
      mockCrawlerManager.getAllStatuses.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      // When
      const response = await makeRequest('/api/crawl/status');

      // Then
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Failed to get crawler statuses',
        code: 'INTERNAL_ERROR',
      });
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to get crawler statuses', {
        error: expect.any(Error),
      });
    });

    it('should handle empty statuses', async () => {
      // Given
      mockCrawlerManager.getAllStatuses.mockImplementation(() => []);

      // When
      const response = await makeRequest('/api/crawl/status');

      // Then
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        statuses: [],
        timestamp: '2024-01-01T00:00:00.000Z',
      });
    });
  });

  describe('GET /api/crawl/status/:forumName', () => {
    it('should return specific forum status', async () => {
      // Given
      const mockStatus = {
        forumName: 'ARBITRUM',
        status: 'idle',
        lastRun: '2024-01-01T00:00:00.000Z',
      };
      mockCrawlerManager.getStatus.mockImplementation(() => mockStatus);

      // When
      const response = await makeRequest('/api/crawl/status/arbitrum');

      // Then
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: { status: mockStatus },
      });
      expect(mockValidateParam).toHaveBeenCalledWith('arbitrum', 'forum');
      expect(mockCrawlerManager.getStatus).toHaveBeenCalledWith('arbitrum');
    });

    it('should return 404 when forum not found', async () => {
      // Given
      mockCrawlerManager.getStatus.mockImplementation(() => null);

      // When
      const response = await makeRequest('/api/crawl/status/nonexistent');

      // Then
      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: 'Forum nonexistent not found',
        code: 'NOT_FOUND',
      });
    });

    it('should handle validation errors', async () => {
      // Given
      mockValidateParam.mockImplementation(() => {
        throw { code: 'VALIDATION_ERROR', message: 'Invalid forum parameter' };
      });

      // When
      const response = await makeRequest('/api/crawl/status/invalid!forum');

      // Then
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Invalid forum parameter',
        code: 'VALIDATION_ERROR',
      });
      expect(mockHandleValidationError).toHaveBeenCalled();
    });

    it('should handle internal errors', async () => {
      // Given
      mockCrawlerManager.getStatus.mockImplementation(() => {
        throw new Error('Database error');
      });

      // When
      const response = await makeRequest('/api/crawl/status/arbitrum');

      // Then
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Failed to get crawler status',
        code: 'INTERNAL_ERROR',
      });
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to get status for forum', {
        error: expect.any(Error),
      });
    });
  });

  describe('POST /api/crawl/start/all', () => {
    it('should start crawls for all forums successfully', async () => {
      // Given
      mockCrawlerManager.getAllStatuses.mockImplementation(() => []);
      mockCrawlerManager.startCrawl.mockImplementation(() => Promise.resolve(undefined));

      // When
      const response = await makeRequest('/api/crawl/start/all', 'POST', {
        'user-agent': 'Test Agent',
        'x-forwarded-for': '127.0.0.1',
      });

      // Then
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Crawls initiated for all forums',
        forums: ['ARBITRUM', 'COMPOUND', 'UNISWAP'],
        timestamp: '2024-01-01T00:00:00.000Z',
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        '[CRON SERVICE] Received request to start all crawls',
        {
          source: 'Test Agent',
          ip: '127.0.0.1',
          timestamp: '2024-01-01T00:00:00.000Z',
        }
      );
    });

    it('should return 409 when crawls are already running', async () => {
      // Given
      mockCrawlerManager.getAllStatuses.mockImplementation(() => [
        { forumName: 'ARBITRUM', status: 'running' },
        { forumName: 'COMPOUND', status: 'idle' },
      ]);

      // When
      const response = await makeRequest('/api/crawl/start/all', 'POST');

      // Then
      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        success: false,
        error: 'Indexing already in progress',
        runningForums: ['ARBITRUM'],
        timestamp: '2024-01-01T00:00:00.000Z',
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        '[CRON SERVICE] Indexing already in progress for forums: ARBITRUM'
      );
    });

    it('should handle missing user agent and IP headers', async () => {
      // Given
      mockCrawlerManager.getAllStatuses.mockImplementation(() => []);

      // When
      const response = await makeRequest('/api/crawl/start/all', 'POST');

      // Then
      expect(response.status).toBe(200);
      expect(mockLogger.info).toHaveBeenCalledWith(
        '[CRON SERVICE] Received request to start all crawls',
        {
          source: 'Unknown source',
          ip: 'Unknown IP',
          timestamp: '2024-01-01T00:00:00.000Z',
        }
      );
    });

    it('should handle internal errors during startup', async () => {
      // Given
      mockCrawlerManager.getAllStatuses.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      // When
      const response = await makeRequest('/api/crawl/start/all', 'POST');

      // Then
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to start indexing',
        details: 'Database connection failed',
        timestamp: '2024-01-01T00:00:00.000Z',
      });
    });
  });

  describe('POST /api/crawl/start/:forumName', () => {
    it('should start crawl for specific forum successfully', async () => {
      // Given
      const mockStatus = { forumName: 'ARBITRUM', status: 'starting' };
      mockCrawlerManager.getStatus.mockImplementation(() => mockStatus);
      mockCrawlerManager.startCrawl.mockImplementation(() => Promise.resolve(undefined));

      // When
      const response = await makeRequest('/api/crawl/start/arbitrum', 'POST');

      // Then
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'Crawl started successfully',
        status: mockStatus,
        timestamp: '2024-01-01T00:00:00.000Z',
      });

      expect(mockLogger.info).toHaveBeenCalledWith('Starting crawl request received for arbitrum');
    });

    it('should handle invalid forum names', async () => {
      // When
      const response = await makeRequest('/api/crawl/start/invalid-forum', 'POST');

      // Then
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Invalid forum name',
        validForums: ['ARBITRUM', 'COMPOUND', 'UNISWAP'],
        timestamp: '2024-01-01T00:00:00.000Z',
      });
    });

    it('should handle case-insensitive forum names', async () => {
      // Given
      const mockStatus = { forumName: 'ARBITRUM', status: 'starting' };
      mockCrawlerManager.getStatus.mockImplementation(() => mockStatus);

      // When
      const response = await makeRequest('/api/crawl/start/ArBiTrUm', 'POST');

      // Then
      expect(response.status).toBe(200);
      expect((response.body as any).message).toBe('Crawl started successfully');
    });

    it('should handle crawler start errors', async () => {
      // Given - Mock implementation will fail but we return success immediately
      mockCrawlerManager.startCrawl.mockImplementation(() => Promise.reject(new Error('Crawl initialization failed')));
      const mockStatus = { forumName: 'ARBITRUM', status: 'idle' };
      mockCrawlerManager.getStatus.mockImplementation(() => mockStatus);

      // When
      const response = await makeRequest('/api/crawl/start/arbitrum', 'POST');

      // Then - Should still return success since it's fire-and-forget
      expect(response.status).toBe(200);
      expect((response.body as any).message).toBe('Crawl started successfully');
    });

    it('should handle synchronous errors', async () => {
      // Given
      mockCrawlerManager.getStatus.mockImplementation(() => {
        throw new Error('Synchronous error');
      });

      // When
      const response = await makeRequest('/api/crawl/start/arbitrum', 'POST');

      // Then
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Failed to start crawl',
        details: 'Synchronous error',
        timestamp: '2024-01-01T00:00:00.000Z',
      });
    });
  });

  describe('POST /api/crawl/stop/:forumName', () => {
    it('should stop crawl for specific forum successfully', async () => {
      // Given
      const mockStatus = { forumName: 'ARBITRUM', status: 'stopped' };
      mockCrawlerManager.stopCrawl.mockImplementation(() => Promise.resolve(undefined));
      mockCrawlerManager.getStatus.mockImplementation(() => mockStatus);

      // When
      const response = await makeRequest('/api/crawl/stop/arbitrum', 'POST');

      // Then
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'Crawl stopped successfully',
        status: mockStatus,
        timestamp: '2024-01-01T00:00:00.000Z',
      });

      expect(mockLogger.info).toHaveBeenCalledWith('Stopping crawl for arbitrum');
      expect(mockCrawlerManager.stopCrawl).toHaveBeenCalledWith('arbitrum');
    });

    it('should handle errors during crawl stop', async () => {
      // Given
      mockCrawlerManager.stopCrawl.mockImplementation(() => Promise.reject(new Error('Failed to stop crawler')));

      // When
      const response = await makeRequest('/api/crawl/stop/arbitrum', 'POST');

      // Then
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Failed to stop crawl',
        details: 'Failed to stop crawler',
        timestamp: '2024-01-01T00:00:00.000Z',
      });

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to stop crawl for arbitrum', {
        error: 'Failed to stop crawler',
      });
    });

    it('should handle non-Error exceptions', async () => {
      // Given
      mockCrawlerManager.stopCrawl.mockImplementation(() => Promise.reject('String error'));

      // When
      const response = await makeRequest('/api/crawl/stop/arbitrum', 'POST');

      // Then
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Failed to stop crawl',
        details: 'Unknown error',
        timestamp: '2024-01-01T00:00:00.000Z',
      });
    });

    it('should handle empty forum name', async () => {
      // When
      const response = await makeRequest('/api/crawl/stop/', 'POST');

      // Then
      expect(response.status).toBe(404); // Should be 404 for route not found
    });
  });
});