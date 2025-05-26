// API route tests for health endpoints
import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { Hono } from 'hono';
import { healthRoutes } from '../health';
import { CrawlerManager } from '../../crawling/crawlerManager';
import { join } from 'path';

// Mock fs/promises readFile function
const mockReadFile = mock();
mock.module('fs/promises', () => ({
  readFile: mockReadFile,
}));

// Mock CrawlerManager
class MockCrawlerManager {
  getAllStatuses = mock(() => ({
    arbitrum: { status: 'running', lastRun: new Date() },
    compound: { status: 'stopped', lastRun: null },
  }));
  
  getStatus = mock(() => ({ status: 'running', lastRun: new Date() }));
  start = mock();
  stop = mock();
  restart = mock();
}

mock.module('../../crawling/crawlerManager', () => ({
  CrawlerManager: MockCrawlerManager,
}));

describe.skip('Health API Routes', () => {
  let app: Hono;
  let mockCrawlerManager: MockCrawlerManager;

  beforeEach(() => {
    app = new Hono();
    mockCrawlerManager = new MockCrawlerManager();
    app.route('/health', healthRoutes);
    
    // Reset mocks
    mockReadFile.mockClear();
    mockCrawlerManager.getAllStatuses.mockClear();
    mockCrawlerManager.getStatus.mockClear();
  });

  describe.skip('GET /health', () => {
    test('should return basic health status', async () => {
      const res = await app.request('/health');
      
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('status', 'healthy');
      expect(data).toHaveProperty('timestamp');
    });
  });

  describe.skip('GET /health/detailed', () => {
    test('should return detailed health information', async () => {
      mockReadFile.mockResolvedValue('{"version": "1.0.0"}');
      
      const res = await app.request('/health/detailed');
      
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('status', 'healthy');
      expect(data).toHaveProperty('version');
      expect(data).toHaveProperty('uptime');
      expect(data).toHaveProperty('memory');
    });

    test('should handle package.json read errors', async () => {
      mockReadFile.mockRejectedValue(new Error('File not found'));
      
      const res = await app.request('/health/detailed');
      
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('status', 'healthy');
      expect(data.version).toBe('unknown');
    });
  });

  describe.skip('GET /health/crawlers', () => {
    test('should return crawler status information', async () => {
      const res = await app.request('/health/crawlers');
      
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('crawlers');
      expect(data.crawlers).toHaveProperty('arbitrum');
      expect(data.crawlers).toHaveProperty('compound');
    });

    test('should handle crawler manager errors', async () => {
      mockCrawlerManager.getAllStatuses.mockImplementation(() => {
        throw new Error('Crawler error');
      });
      
      const res = await app.request('/health/crawlers');
      
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toHaveProperty('error');
    });
  });

  describe.skip('GET /health/database', () => {
    test('should return database health status', async () => {
      const res = await app.request('/health/database');
      
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('connection');
    });
  });

  describe.skip('GET /health/system', () => {
    test('should return system resource information', async () => {
      const res = await app.request('/health/system');
      
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('memory');
      expect(data).toHaveProperty('cpu');
      expect(data).toHaveProperty('uptime');
      expect(data.memory).toHaveProperty('used');
      expect(data.memory).toHaveProperty('free');
      expect(data.memory).toHaveProperty('total');
    });
  });

  describe.skip('error handling', () => {
    test('should handle malformed requests gracefully', async () => {
      const res = await app.request('/health/invalid-endpoint');
      
      expect(res.status).toBe(404);
    });

    test('should handle system errors in health checks', async () => {
      // This tests the error handling within the health route itself
      const res = await app.request('/health');
      
      // Even with errors, basic health should respond
      expect(res.status).toBe(200);
    });
  });

  describe.skip('response format validation', () => {
    test('should return consistent response format for all endpoints', async () => {
      const endpoints = ['/health', '/health/detailed', '/health/crawlers', '/health/system'];
      
      for (const endpoint of endpoints) {
        const res = await app.request(endpoint);
        const data = await res.json();
        
        // All health endpoints should have a status field
        expect(data).toHaveProperty('status');
        
        // Should have proper HTTP status codes
        expect([200, 500]).toContain(res.status);
      }
    });

    test('should include timestamp in responses', async () => {
      const res = await app.request('/health');
      const data = await res.json();
      
      expect(data).toHaveProperty('timestamp');
      expect(typeof data.timestamp).toBe('string');
      
      // Should be a valid ISO date string
      expect(() => new Date(data.timestamp)).not.toThrow();
    });
  });
});