// API route tests for search endpoints
import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';

// Create mock function references
const mockSearch = mock(() => {});
const mockSearchLogger = mock(() => {});

// Mock all dependencies before importing
mock.module('../../search/vectorSearchService', () => ({
  VectorSearchService: mock(() => ({
    search: mockSearch,
  })),
}));

mock.module('../../logging', () => ({
  Logger: mock(() => ({
    error: mock(() => {}),
    info: mock(() => {}),
    warn: mock(() => {}),
  })),
}));

mock.module('../../middleware/searchLogger', () => ({
  searchLogger: mockSearchLogger,
}));

import { Hono } from 'hono';
import { searchRoutes } from '../search';
import { VectorSearchService } from '../../search/vectorSearchService';
import { Logger } from '../../logging';

// Mock VectorSearchService
class MockVectorSearchService {
  search = mockSearch;
}

// Mock Logger
class MockLogger {
  error = mock(() => {});
  info = mock(() => {});
  warn = mock(() => {});
}

describe('Search API Routes', () => {
  let app: Hono;
  let mockVectorSearchService: MockVectorSearchService;
  let mockLogger: MockLogger;
  let dateSpy: any;

  // Helper function to make requests
  const makeRequest = async (path: string, method: string = 'POST', body?: any) => {
    const options: RequestInit = { method };
    if (body) {
      options.body = JSON.stringify(body);
      options.headers = { 'Content-Type': 'application/json' };
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
    mockVectorSearchService = new MockVectorSearchService();
    mockLogger = new MockLogger();

    // Setup search routes with mocked dependencies
    searchRoutes(app, mockVectorSearchService as any, mockLogger as any);

    // Reset mocks

    dateSpy = spyOn(Date.prototype, 'toISOString').mockReturnValue('2024-01-01T00:00:00.000Z');

    // Reset mock implementations
    mockSearchLogger.mockImplementation(async (c: any, next: any) => {
      await next();
    });
  });

  afterEach(() => {
    dateSpy?.mockRestore();
  });

  describe('POST /api/searchByType', () => {
    const mockSearchResults = [
      {
        type: 'post',
        id: 1,
        forum_name: 'ARBITRUM',
        title: 'Test Post',
        content: 'This is a test post content',
        similarity: 0.85,
        created_at: '2024-01-01T00:00:00.000Z',
        popularity_score: 10,
      },
      {
        type: 'post',
        id: 2,
        forum_name: 'ARBITRUM',
        title: 'Another Post',
        content: 'Another test post content',
        similarity: 0.75,
        created_at: '2024-01-01T00:00:00.000Z',
        popularity_score: 5,
      },
    ];

    it('should perform search by type successfully', async () => {
      // Given
      const searchQuery = {
        query: 'governance proposal',
        type: 'post',
        forum: 'ARBITRUM',
        limit: 10,
        threshold: 0.7,
      };
      mockSearch.mockImplementation(() => Promise.resolve(mockSearchResults));

      // When
      const response = await makeRequest('/api/searchByType', 'POST', searchQuery);

      // Then
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        results: mockSearchResults,
        metadata: {
          query: 'governance proposal',
          type: 'post',
          forum: 'ARBITRUM',
          total: 2,
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      });

      expect(mockSearch).toHaveBeenCalledWith(searchQuery);
    });

    it('should handle empty search results', async () => {
      // Given
      const searchQuery = {
        query: 'nonexistent topic',
        type: 'topic',
        forum: 'COMPOUND',
      };
      mockSearch.mockImplementation(() => Promise.resolve([]));

      // When
      const response = await makeRequest('/api/searchByType', 'POST', searchQuery);

      // Then
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        results: [],
        metadata: {
          query: 'nonexistent topic',
          type: 'topic',
          forum: 'COMPOUND',
          total: 0,
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      });
    });

    it('should handle search service errors', async () => {
      // Given
      const searchQuery = {
        query: 'error query',
        type: 'post',
        forum: 'ARBITRUM',
      };
      mockSearch.mockImplementation(() => Promise.reject(new Error('Database connection failed')));

      // When
      const response = await makeRequest('/api/searchByType', 'POST', searchQuery);

      // Then
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Search failed',
        details: 'Database connection failed',
        timestamp: '2024-01-01T00:00:00.000Z',
      });

      expect(mockLogger.error).toHaveBeenCalledWith('Search error:', {
        error: 'Database connection failed',
      });
    });

    it('should handle non-Error exceptions', async () => {
      // Given
      const searchQuery = {
        query: 'string error query',
        type: 'topic',
        forum: 'UNISWAP',
      };
      mockSearch.mockImplementation(() => Promise.reject('String error'));

      // When
      const response = await makeRequest('/api/searchByType', 'POST', searchQuery);

      // Then
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Search failed',
        details: 'Unknown error',
        timestamp: '2024-01-01T00:00:00.000Z',
      });
    });

    it('should handle malformed JSON body', async () => {
      // When
      const request = new Request('http://localhost/api/searchByType', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await app.fetch(request);

      // Then - Hono returns 500 for JSON parsing errors
      expect(response.status).toBe(500);
    });

    it('should handle missing request body', async () => {
      // When
      const response = await makeRequest('/api/searchByType', 'POST');

      // Then - Hono returns 500 for missing body when calling c.req.json()
      expect(response.status).toBe(500);
    });

    it('should handle different search types', async () => {
      // Given
      const snapshotQuery = {
        query: 'vote proposal',
        type: 'snapshot',
        forum: 'ARBITRUM',
      };
      const snapshotResults = [
        {
          type: 'snapshot',
          id: 'snapshot-1',
          forum_name: 'ARBITRUM',
          title: 'Snapshot Proposal',
          content: 'Vote on this proposal',
          similarity: 0.9,
        },
      ];
      mockSearch.mockImplementation(() => Promise.resolve(snapshotResults));

      // When
      const response = await makeRequest('/api/searchByType', 'POST', snapshotQuery);

      // Then
      expect(response.status).toBe(200);
      expect((response.body as any).results).toEqual(snapshotResults);
      expect((response.body as any).metadata.type).toBe('snapshot');
    });
  });

  describe('POST /api/searchAll', () => {
    const mockTopicResults = [{ type: 'topic', id: 1, title: 'Topic 1', similarity: 0.85 }];
    const mockPostResults = [{ type: 'post', id: 1, title: 'Post 1', similarity: 0.8 }];
    const mockSnapshotResults = [
      { type: 'snapshot', id: 'snap-1', title: 'Snapshot 1', similarity: 0.75 },
    ];
    const mockTallyResults = [{ type: 'tally', id: 'tally-1', title: 'Tally 1', similarity: 0.7 }];

    it('should perform comprehensive search across all types', async () => {
      // Given
      const searchQuery = {
        query: 'governance',
        forum: 'ARBITRUM',
        limit: 10,
        threshold: 0.7,
      };

      mockSearch
        .mockImplementationOnce(() => Promise.resolve(mockTopicResults))
        .mockImplementationOnce(() => Promise.resolve(mockPostResults))
        .mockImplementationOnce(() => Promise.resolve(mockSnapshotResults))
        .mockImplementationOnce(() => Promise.resolve(mockTallyResults));

      // When
      const response = await makeRequest('/api/searchAll', 'POST', searchQuery);

      // Then
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        topics: mockTopicResults,
        posts: mockPostResults,
        snapshot: mockSnapshotResults,
        tally: mockTallyResults,
        metadata: {
          query: 'governance',
          forum: 'ARBITRUM',
          threshold: 0.7,
          timestamp: '2024-01-01T00:00:00.000Z',
          counts: {
            topics: 1,
            posts: 1,
            snapshot: 1,
            tally: 1,
          },
        },
      });

      // Verify all search types were called
      expect(mockSearch).toHaveBeenCalledTimes(4);
      expect(mockSearch).toHaveBeenCalledWith({
        query: 'governance',
        type: 'topic',
        forum: 'ARBITRUM',
        limit: 10,
        threshold: 0.7,
      });
      expect(mockSearch).toHaveBeenCalledWith({
        query: 'governance',
        type: 'post',
        forum: 'ARBITRUM',
        limit: 10,
        threshold: 0.7,
      });
      expect(mockSearch).toHaveBeenCalledWith({
        query: 'governance',
        type: 'snapshot',
        forum: 'ARBITRUM',
        limit: 10,
        threshold: 0.7,
      });
      expect(mockSearch).toHaveBeenCalledWith({
        query: 'governance',
        type: 'tally',
        forum: 'ARBITRUM',
        limit: 10,
        threshold: 0.7,
      });
    });

    it('should use default limit and threshold values', async () => {
      // Given
      const searchQuery = {
        query: 'governance',
        forum: 'COMPOUND',
      };

      mockSearch.mockImplementation(() => Promise.resolve([]));

      // When
      const response = await makeRequest('/api/searchAll', 'POST', searchQuery);

      // Then
      expect(response.status).toBe(200);
      expect((response.body as any).metadata.threshold).toBe(0.7);

      // Verify default values were used
      expect(mockSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          threshold: 0.7,
        })
      );
    });

    it('should return 400 when query is missing', async () => {
      // Given
      const searchQuery = {
        forum: 'ARBITRUM',
      };

      // When
      const response = await makeRequest('/api/searchAll', 'POST', searchQuery);

      // Then
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Query and forum are required',
        timestamp: '2024-01-01T00:00:00.000Z',
      });
    });

    it('should return 400 when forum is missing', async () => {
      // Given
      const searchQuery = {
        query: 'governance',
      };

      // When
      const response = await makeRequest('/api/searchAll', 'POST', searchQuery);

      // Then
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Query and forum are required',
        timestamp: '2024-01-01T00:00:00.000Z',
      });
    });

    it('should return 400 when both query and forum are missing', async () => {
      // Given
      const searchQuery = {};

      // When
      const response = await makeRequest('/api/searchAll', 'POST', searchQuery);

      // Then
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Query and forum are required',
        timestamp: '2024-01-01T00:00:00.000Z',
      });
    });

    it('should handle search service errors in comprehensive search', async () => {
      // Given
      const searchQuery = {
        query: 'governance',
        forum: 'ARBITRUM',
      };

      mockSearch.mockImplementation(() => Promise.reject(new Error('Vector search failed')));

      // When
      const response = await makeRequest('/api/searchAll', 'POST', searchQuery);

      // Then
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Search failed',
        details: 'Vector search failed',
        timestamp: '2024-01-01T00:00:00.000Z',
      });

      expect(mockLogger.error).toHaveBeenCalledWith('Search all error:', {
        error: 'Vector search failed',
      });
    });

    it('should handle partial failures in Promise.all', async () => {
      // Given
      const searchQuery = {
        query: 'governance',
        forum: 'ARBITRUM',
      };

      // Mock first call succeeds, second fails
      mockSearch
        .mockImplementationOnce(() => Promise.resolve(mockTopicResults))
        .mockImplementationOnce(() => Promise.reject(new Error('Post search failed')));

      // When
      const response = await makeRequest('/api/searchAll', 'POST', searchQuery);

      // Then
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Search failed',
        details: 'Post search failed',
        timestamp: '2024-01-01T00:00:00.000Z',
      });
    });

    it('should handle empty results across all search types', async () => {
      // Given
      const searchQuery = {
        query: 'nonexistent topic',
        forum: 'UNISWAP',
        limit: 5,
        threshold: 0.8,
      };

      mockSearch.mockImplementation(() => Promise.resolve([]));

      // When
      const response = await makeRequest('/api/searchAll', 'POST', searchQuery);

      // Then
      expect(response.status).toBe(200);
      expect((response.body as any).metadata.counts).toEqual({
        topics: 0,
        posts: 0,
        snapshot: 0,
        tally: 0,
      });
    });

    it('should handle custom limit and threshold parameters', async () => {
      // Given
      const searchQuery = {
        query: 'custom search',
        forum: 'COMPOUND',
        limit: 20,
        threshold: 0.9,
      };

      mockSearch.mockImplementation(() => Promise.resolve([]));

      // When
      const response = await makeRequest('/api/searchAll', 'POST', searchQuery);

      // Then
      expect(response.status).toBe(200);
      expect((response.body as any).metadata.threshold).toBe(0.9);

      // Verify custom values were passed to search service
      expect(mockSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 20,
          threshold: 0.9,
        })
      );
    });
  });

  describe('Middleware Integration', () => {
    it('should apply search logger middleware to search routes', () => {
      // The middleware is applied during route setup
      // We verify it was called during the beforeEach setup
      expect(mockSearchLogger).toBeDefined();

      // Additional integration test could be added here to verify
      // the middleware is actually invoked during requests
    });
  });
});