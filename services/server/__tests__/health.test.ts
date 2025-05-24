// API route tests for health endpoints

import { Hono } from 'hono';
import { healthRoutes } from '../health';
import { CrawlerManager } from '../../crawling/crawlerManager';
import { join } from 'path';

// Mock fs/promises readFile function
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));
jest.mock('../../crawling/crawlerManager');

// Import the mocked readFile
import { readFile } from 'fs/promises';
const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;

// Mock CrawlerManager
class MockCrawlerManager {
  getAllStatuses = jest.fn().mockReturnValue({
    ARBITRUM: { status: 'idle', lastRun: '2024-01-01T00:00:00.000Z' },
    COMPOUND: { status: 'running', lastRun: '2024-01-01T00:00:00.000Z' }
  });
}

describe('Health API Routes', () => {
  let app: Hono;
  let mockCrawlerManager: MockCrawlerManager;

  // Helper function to make requests
  const makeRequest = async (path: string, method: string = 'GET') => {
    const request = new Request(`http://localhost${path}`, { method });
    const response = await app.fetch(request);
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: response.headers.get('content-type')?.includes('application/json') 
        ? await response.json() 
        : await response.text()
    };
  };

  beforeEach(() => {
    app = new Hono();
    mockCrawlerManager = new MockCrawlerManager();
    
    // Setup health routes with mocked dependencies
    healthRoutes(app, mockCrawlerManager as any);
    
    jest.clearAllMocks();
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2024-01-01T00:00:00.000Z');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/health', () => {
    it('should return healthy status with service information', async () => {
      // When
      const response = await makeRequest('/api/health');

      // Then
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'ok',
        timestamp: '2024-01-01T00:00:00.000Z',
        services: {
          crawler: {
            status: 'running',
            activeJobs: {
              ARBITRUM: { status: 'idle', lastRun: '2024-01-01T00:00:00.000Z' },
              COMPOUND: { status: 'running', lastRun: '2024-01-01T00:00:00.000Z' }
            }
          },
          search: 'running'
        }
      });
      
      // Verify crawler manager was called
      expect(mockCrawlerManager.getAllStatuses).toHaveBeenCalledTimes(1);
    });

    it('should handle empty crawler statuses', async () => {
      // Given
      mockCrawlerManager.getAllStatuses.mockReturnValue({});

      // When
      const response = await makeRequest('/api/health');

      // Then
      expect(response.status).toBe(200);
      expect((response.body as any).services.crawler.activeJobs).toEqual({});
    });

    it('should include current timestamp', async () => {
      // Given
      const mockDate = '2024-12-25T10:30:00.000Z';
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate);

      // When
      const response = await makeRequest('/api/health');

      // Then
      expect(response.status).toBe(200);
      expect((response.body as any).timestamp).toBe(mockDate);
    });
  });

  describe('GET /api/logs/:forum', () => {
    const mockLogContent = `[2024-01-01 10:00:00] INFO: Starting crawler for ARBITRUM
[2024-01-01 10:01:00] INFO: Processing 25 posts
[2024-01-01 10:02:00] INFO: Crawler completed successfully`;

    it('should return log content for valid forum', async () => {
      // Given
      mockReadFile.mockResolvedValue(mockLogContent);

      // When
      const response = await makeRequest('/api/logs/arbitrum');

      // Then
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.body).toBe(mockLogContent);
      
      // Verify correct file path was requested
      expect(mockReadFile).toHaveBeenCalledWith(
        join(process.cwd(), 'logs', 'arbitrum-crawler.log'),
        'utf-8'
      );
    });

    it('should return 404 when log file does not exist', async () => {
      // Given
      mockReadFile.mockRejectedValue(new Error('ENOENT: no such file'));

      // When
      const response = await makeRequest('/api/logs/compound');

      // Then
      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: 'Log file not found',
        details: 'No logs available for compound'
      });
    });

    it('should return 500 on file system errors', async () => {
      // Given
      mockReadFile.mockRejectedValue(new Error('Permission denied'));

      // When
      const response = await makeRequest('/api/logs/gitcoin');

      // Then
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Failed to read logs',
        details: 'Permission denied'
      });
    });

    it('should handle different forum names correctly', async () => {
      // Given
      mockReadFile.mockResolvedValue('test log content');

      // When
      await makeRequest('/api/logs/uniswap');

      // Then
      expect(mockReadFile).toHaveBeenCalledWith(
        join(process.cwd(), 'logs', 'uniswap-crawler.log'),
        'utf-8'
      );
    });

    it('should handle special characters in forum names', async () => {
      // Given
      mockReadFile.mockResolvedValue('log content');

      // When
      await makeRequest('/api/logs/forum-name-with-dashes');

      // Then
      expect(mockReadFile).toHaveBeenCalledWith(
        join(process.cwd(), 'logs', 'forum-name-with-dashes-crawler.log'),
        'utf-8'
      );
    });

    it('should handle empty log files', async () => {
      // Given
      mockReadFile.mockResolvedValue('');

      // When
      const response = await makeRequest('/api/logs/empty-forum');

      // Then
      expect(response.status).toBe(200);
      expect(response.body).toBe('');
    });

    it('should handle non-Error exceptions', async () => {
      // Given
      mockReadFile.mockRejectedValue('String error');

      // When
      const response = await makeRequest('/api/logs/error-forum');

      // Then
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Failed to read logs',
        details: 'Unknown error'
      });
    });

    it('should preserve content-type for plain text response', async () => {
      // Given
      mockReadFile.mockResolvedValue('Log content with special chars: åäö');

      // When
      const response = await makeRequest('/api/logs/international');

      // Then
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.body).toBe('Log content with special chars: åäö');
    });
  });
});