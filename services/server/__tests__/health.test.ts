// API route tests for health endpoints
import { describe, test, expect, beforeEach } from '@jest/globals';
import { Hono } from 'hono';
import { healthRoutes } from '../health';
import { CrawlerManager } from '../../crawling/crawlerManager';
import { join } from 'path';

// Mock fs/promises readFile function
const mockReadFile = jest.fn();
jest.mock('fs/promises', () => ({
  readFile: mockReadFile,
}));

// Mock CrawlerManager
class MockCrawlerManager {
  getAllStatuses = jest.fn(() => ({
    arbitrum: { status: 'running', lastRun: new Date() },
    compound: { status: 'stopped', lastRun: null },
  }));
  
  getStatus = jest.fn(() => ({ status: 'running', lastRun: new Date() }));
  start = jest.fn();
  stop = jest.fn();
  restart = jest.fn();
}

jest.mock('../../crawling/crawlerManager', () => ({
  CrawlerManager: MockCrawlerManager,
}));

describe('Health API Routes', () => {
  let app: Hono;
  let mockCrawlerManager: MockCrawlerManager;

  beforeEach(() => {
    app = new Hono();
    mockCrawlerManager = new MockCrawlerManager();
    healthRoutes(app, mockCrawlerManager as any);
    
    // Reset mocks
    mockReadFile.mockClear();
    mockCrawlerManager.getAllStatuses.mockClear();
    mockCrawlerManager.getStatus.mockClear();
  });

  describe('GET /api/health', () => {
    test('should return basic health status', async () => {
      const res = await app.request('/api/health');
      
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('status', 'ok');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('services');
      expect(data.services).toHaveProperty('crawler');
      expect(data.services).toHaveProperty('search', 'running');
    });

    test('should include crawler status from manager', async () => {
      mockCrawlerManager.getAllStatuses.mockImplementation(() => ({
        arbitrum: { status: 'running', lastRun: new Date() }
      }));

      const res = await app.request('/api/health');
      
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(mockCrawlerManager.getAllStatuses).toHaveBeenCalled();
      expect(data.services.crawler).toHaveProperty('status', 'running');
      expect(data.services.crawler).toHaveProperty('activeJobs');
    });
  });

  describe('GET /api/logs/:forum', () => {
    test('should return log content when file exists', async () => {
      const mockLogContent = 'Sample log content';
      mockReadFile.mockResolvedValue(mockLogContent);

      const res = await app.request('/api/logs/arbitrum');
      
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('text/plain');
      const content = await res.text();
      expect(content).toBe(mockLogContent);
      
      expect(mockReadFile).toHaveBeenCalledWith(
        join(process.cwd(), 'logs', 'arbitrum-crawler.log'),
        'utf-8'
      );
    });

    test('should return 404 when log file not found', async () => {
      const notFoundError = new Error('ENOENT: no such file or directory');
      mockReadFile.mockRejectedValue(notFoundError);

      const res = await app.request('/api/logs/nonexistent');
      
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data).toHaveProperty('error', 'Log file not found');
      expect(data).toHaveProperty('details', 'No logs available for nonexistent');
    });

    test('should return 500 for other file system errors', async () => {
      const systemError = new Error('Permission denied');
      mockReadFile.mockRejectedValue(systemError);

      const res = await app.request('/api/logs/arbitrum');
      
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toHaveProperty('error', 'Failed to read logs');
      expect(data).toHaveProperty('details', 'Permission denied');
    });

    test('should handle non-Error exceptions', async () => {
      mockReadFile.mockRejectedValue('String error');

      const res = await app.request('/api/logs/arbitrum');
      
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toHaveProperty('error', 'Failed to read logs');
      expect(data).toHaveProperty('details', 'Unknown error');
    });
  });
});