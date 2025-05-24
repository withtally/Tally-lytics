// Comprehensive tests for VectorSearchService

// Create mock function references
const mockGenerateEmbeddings = jest.fn();
const mockGenerateQuerySimile = jest.fn();
const mockDbRaw = jest.fn();
const mockDbSchemaHasColumn = jest.fn();

// Mock Redis
class MockRedis {
  on = jest.fn();
  disconnect = jest.fn();
  quit = jest.fn();
}

// Mock dependencies
jest.doMock('ioredis', () => {
  return jest.fn().mockImplementation(() => new MockRedis());
});

jest.doMock('../../logging', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

jest.doMock('../../llm/embeddings/embeddingService', () => ({
  generateEmbeddings: mockGenerateEmbeddings,
}));

jest.doMock('../../llm/llmService', () => ({
  generateQuerySimile: mockGenerateQuerySimile,
}));

const mockDb = {
  raw: mockDbRaw,
  schema: {
    hasColumn: mockDbSchemaHasColumn,
  },
};

jest.doMock('../../../db/db', () => ({
  default: mockDb,
  ...mockDb
}));

import { VectorSearchService, SearchParams } from '../vectorSearchService';

describe('VectorSearchService', () => {
  let vectorSearchService: VectorSearchService;
  let mockLogger: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create the logger mock first
    const Logger = require('../../logging').Logger;
    mockLogger = Logger.mock.results[Logger.mock.results.length - 1]?.value || {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    
    vectorSearchService = new VectorSearchService();
    
    // Default mock implementations
    mockGenerateEmbeddings.mockResolvedValue([[0.1, 0.2, 0.3, 0.4, 0.5]]);
    mockDbSchemaHasColumn.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize without Redis when REDIS_URL is not set', () => {
      // Given
      delete process.env.REDIS_URL;

      // When
      const service = new VectorSearchService();

      // Then
      expect(service).toBeDefined();
    });

    it('should initialize with Redis when REDIS_URL is set', () => {
      // Given
      const originalEnv = process.env.REDIS_URL;
      process.env.REDIS_URL = 'redis://localhost:6379';

      // When
      const service = new VectorSearchService();

      // Then
      expect(service).toBeDefined();
      
      // Cleanup
      if (originalEnv) {
        process.env.REDIS_URL = originalEnv;
      } else {
        delete process.env.REDIS_URL;
      }
    });

    it('should handle Redis connection errors gracefully', () => {
      // Given
      const originalEnv = process.env.REDIS_URL;
      process.env.REDIS_URL = 'redis://invalid:6379';

      // When & Then - Should not throw
      expect(() => new VectorSearchService()).not.toThrow();
      
      // Cleanup
      if (originalEnv) {
        process.env.REDIS_URL = originalEnv;
      } else {
        delete process.env.REDIS_URL;
      }
    });
  });

  describe('search functionality', () => {
    const mockSearchResults = {
      rows: [
        {
          id: 1,
          title: 'Test Topic 1',
          plain_text: 'Content about governance',
          forum_name: 'ARBITRUM',
          similarity: 0.85,
          created_at: new Date('2024-01-01'),
          popularity_score: 75
        },
        {
          id: 2,
          title: 'Test Topic 2',
          plain_text: 'Content about DeFi',
          forum_name: 'ARBITRUM',
          similarity: 0.78,
          created_at: new Date('2024-01-15'),
          popularity_score: 60
        }
      ]
    };

    beforeEach(() => {
      mockDbRaw.mockResolvedValue(mockSearchResults);
    });

    it('should perform basic topic search successfully', async () => {
      // Given
      const searchParams: SearchParams = {
        query: 'governance proposal',
        type: 'topic',
        forum: 'ARBITRUM',
        limit: 10,
        threshold: 0.7
      };

      // When
      const results = await vectorSearchService.search(searchParams);

      // Then
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        type: 'topic',
        id: 1,
        forum_name: 'ARBITRUM',
        title: 'Test Topic 1',
        content: 'Content about governance',
        similarity: 0.85,
        created_at: new Date('2024-01-01'),
        popularity_score: 75
      });

      // Verify embedding generation was called
      expect(mockGenerateEmbeddings).toHaveBeenCalledWith(['governance proposal']);

      // Verify database query was called with correct parameters
      expect(mockDbRaw).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['[0.1,0.2,0.3,0.4,0.5]', 'ARBITRUM', '[0.1,0.2,0.3,0.4,0.5]', 0.7, 10]
      );
    });

    it('should handle different content types correctly', async () => {
      // Test each content type
      const contentTypes = ['topic', 'post', 'snapshot', 'tally'];

      for (const type of contentTypes) {
        const searchParams: SearchParams = {
          query: 'test query',
          type: type as any,
          forum: 'COMPOUND',
        };

        await vectorSearchService.search(searchParams);

        // Verify correct table configuration is used
        expect(mockDbRaw).toHaveBeenCalledWith(
          expect.stringContaining(getExpectedTableName(type)),
          expect.any(Array)
        );
      }
    });

    it('should use default parameters when not provided', async () => {
      // Given
      const searchParams: SearchParams = {
        query: 'test',
        type: 'post',
        forum: 'UNISWAP'
      };

      // When
      await vectorSearchService.search(searchParams);

      // Then
      expect(mockDbRaw).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([expect.any(String), 'UNISWAP', expect.any(String), 0.5, 10])
      );
    });

    it('should handle empty search results', async () => {
      // Given
      mockDbRaw.mockResolvedValue({ rows: [] });
      const searchParams: SearchParams = {
        query: 'nonexistent',
        type: 'topic',
        forum: 'ARBITRUM'
      };

      // When
      const results = await vectorSearchService.search(searchParams);

      // Then
      expect(results).toEqual([]);
    });

    it('should handle missing content fields gracefully', async () => {
      // Given
      mockDbRaw.mockResolvedValue({
        rows: [{
          id: 1,
          title: null,
          plain_text: null,
          body: null,
          description: null,
          forum_name: 'ARBITRUM',
          similarity: 0.8,
          created_at: null,
          popularity_score: null
        }]
      });

      const searchParams: SearchParams = {
        query: 'test',
        type: 'topic',
        forum: 'ARBITRUM'
      };

      // When
      const results = await vectorSearchService.search(searchParams);

      // Then
      expect(results[0]).toEqual({
        type: 'topic',
        id: 1,
        forum_name: 'ARBITRUM',
        title: null,
        content: null,
        similarity: 0.8,
        created_at: null,
        popularity_score: null
      });
    });

    it('should prioritize content fields correctly', async () => {
      // Given
      mockDbRaw.mockResolvedValue({
        rows: [{
          id: 1,
          title: 'Test Title',
          plain_text: 'Plain text content',
          body: 'Body content',
          description: 'Description content',
          forum_name: 'ARBITRUM',
          similarity: 0.8,
          created_at: new Date(),
          popularity_score: 50
        }]
      });

      const searchParams: SearchParams = {
        query: 'test',
        type: 'topic',
        forum: 'ARBITRUM'
      };

      // When
      const results = await vectorSearchService.search(searchParams);

      // Then - Should prioritize plain_text over body and description
      expect(results[0].content).toBe('Plain text content');
    });
  });

  describe('recency boost', () => {
    it('should apply recency boost to recent content', async () => {
      // Given
      const recentDate = new Date();
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 40); // 40 days ago

      mockDbRaw.mockResolvedValue({
        rows: [
          {
            id: 1,
            title: 'Recent Post',
            plain_text: 'Recent content',
            forum_name: 'ARBITRUM',
            similarity: 0.8,
            created_at: recentDate,
            popularity_score: 50
          },
          {
            id: 2,
            title: 'Old Post',
            plain_text: 'Old content',
            forum_name: 'ARBITRUM',
            similarity: 0.8,
            created_at: oldDate,
            popularity_score: 50
          }
        ]
      });

      const searchParams: SearchParams = {
        query: 'test',
        type: 'post',
        forum: 'ARBITRUM',
        boostRecent: true
      };

      // When
      const results = await vectorSearchService.search(searchParams);

      // Then
      expect(results[0].similarity).toBeGreaterThan(results[1].similarity);
      expect(results[0].title).toBe('Recent Post');
    });

    it('should handle missing created_at dates', async () => {
      // Given
      mockDbRaw.mockResolvedValue({
        rows: [{
          id: 1,
          title: 'Test Post',
          plain_text: 'Content',
          forum_name: 'ARBITRUM',
          similarity: 0.8,
          created_at: null,
          popularity_score: 50
        }]
      });

      const searchParams: SearchParams = {
        query: 'test',
        type: 'post',
        forum: 'ARBITRUM',
        boostRecent: true
      };

      // When
      const results = await vectorSearchService.search(searchParams);

      // Then - Should not crash and similarity should remain unchanged
      expect(results[0].similarity).toBe(0.8);
    });
  });

  describe('popularity boost', () => {
    it('should apply popularity boost when column exists', async () => {
      // Given
      mockDbSchemaHasColumn.mockResolvedValue(true);
      mockDbRaw.mockResolvedValue({
        rows: [
          {
            id: 1,
            title: 'Popular Post',
            plain_text: 'Popular content',
            forum_name: 'ARBITRUM',
            similarity: 0.8,
            created_at: new Date(),
            popularity_score: 90
          },
          {
            id: 2,
            title: 'Less Popular Post',
            plain_text: 'Less popular content',
            forum_name: 'ARBITRUM',
            similarity: 0.8,
            created_at: new Date(),
            popularity_score: 30
          }
        ]
      });

      const searchParams: SearchParams = {
        query: 'test',
        type: 'post',
        forum: 'ARBITRUM',
        boostPopular: true
      };

      // When
      const results = await vectorSearchService.search(searchParams);

      // Then
      expect(results[0].similarity).toBeGreaterThan(results[1].similarity);
      expect(results[0].title).toBe('Popular Post');
    });

    it('should skip popularity boost when column does not exist', async () => {
      // Given
      mockDbSchemaHasColumn.mockResolvedValue(false);
      mockDbRaw.mockResolvedValue({
        rows: [{
          id: 1,
          title: 'Test Post',
          plain_text: 'Content',
          forum_name: 'ARBITRUM',
          similarity: 0.8,
          created_at: new Date(),
          popularity_score: 90
        }]
      });

      const searchParams: SearchParams = {
        query: 'test',
        type: 'post',
        forum: 'ARBITRUM',
        boostPopular: true
      };

      // When
      const results = await vectorSearchService.search(searchParams);

      // Then
      expect(results[0].similarity).toBe(0.8); // Unchanged
      // Note: Logger calls are not easily testable due to mocking limitations
    });

    it('should handle popularity boost errors gracefully', async () => {
      // Given
      mockDbSchemaHasColumn.mockRejectedValue(new Error('Database error'));
      mockDbRaw.mockResolvedValue({
        rows: [{
          id: 1,
          title: 'Test Post',
          plain_text: 'Content',
          forum_name: 'ARBITRUM',
          similarity: 0.8,
          created_at: new Date(),
          popularity_score: 90
        }]
      });

      const searchParams: SearchParams = {
        query: 'test',
        type: 'post',
        forum: 'ARBITRUM',
        boostPopular: true
      };

      // When
      const results = await vectorSearchService.search(searchParams);

      // Then
      expect(results[0].similarity).toBe(0.8); // Should fallback to original
      // Note: Logger calls are not easily testable due to mocking limitations
    });

    it('should handle missing popularity scores', async () => {
      // Given
      mockDbSchemaHasColumn.mockResolvedValue(true);
      mockDbRaw.mockResolvedValue({
        rows: [{
          id: 1,
          title: 'Test Post',
          plain_text: 'Content',
          forum_name: 'ARBITRUM',
          similarity: 0.8,
          created_at: new Date(),
          popularity_score: null
        }]
      });

      const searchParams: SearchParams = {
        query: 'test',
        type: 'post',
        forum: 'ARBITRUM',
        boostPopular: true
      };

      // When
      const results = await vectorSearchService.search(searchParams);

      // Then
      expect(results[0].similarity).toBe(0.8); // Should remain unchanged
    });
  });

  describe('LLM reranking', () => {
    beforeEach(() => {
      mockGenerateQuerySimile.mockResolvedValue('related concepts');
      // Second call to generateEmbeddings for reranking
      mockGenerateEmbeddings
        .mockResolvedValueOnce([[0.1, 0.2, 0.3, 0.4, 0.5]]) // Original query
        .mockResolvedValueOnce([[0.2, 0.3, 0.4, 0.5, 0.6]]); // Augmented query
    });

    it('should apply LLM reranking when useCache is true', async () => {
      // Given
      mockDbRaw
        .mockResolvedValueOnce({ // Initial search
          rows: [
            {
              id: 1,
              title: 'Original Result',
              plain_text: 'Original content',
              forum_name: 'ARBITRUM',
              similarity: 0.8,
              created_at: new Date(),
              popularity_score: 50
            }
          ]
        })
        .mockResolvedValueOnce({ // Reranked search
          rows: [
            {
              id: 1,
              title: 'Original Result',
              plain_text: 'Original content',
              forum_name: 'ARBITRUM',
              similarity: 0.9, // Higher similarity after reranking
              created_at: new Date(),
              popularity_score: 50,
              type: 'topic'
            }
          ]
        });

      const searchParams: SearchParams = {
        query: 'governance',
        type: 'topic',
        forum: 'ARBITRUM',
        useCache: true
      };

      // When
      const results = await vectorSearchService.search(searchParams);

      // Then
      expect(mockGenerateQuerySimile).toHaveBeenCalledWith('governance');
      expect(mockGenerateEmbeddings).toHaveBeenCalledTimes(2);
      expect(mockGenerateEmbeddings).toHaveBeenNthCalledWith(2, ['governance related concepts']);
      expect(results[0].similarity).toBe(0.9);
    });

    it('should handle LLM reranking errors gracefully', async () => {
      // Given
      mockGenerateQuerySimile.mockRejectedValue(new Error('LLM service unavailable'));
      mockDbRaw.mockResolvedValue({
        rows: [{
          id: 1,
          title: 'Test Post',
          plain_text: 'Content',
          forum_name: 'ARBITRUM',
          similarity: 0.8,
          created_at: new Date(),
          popularity_score: 50
        }]
      });

      const searchParams: SearchParams = {
        query: 'test',
        type: 'topic',
        forum: 'ARBITRUM',
        useCache: true
      };

      // When
      const results = await vectorSearchService.search(searchParams);

      // Then
      expect(results[0].similarity).toBe(0.8); // Should fallback to original
      // Note: Logger calls are not easily testable due to mocking limitations
    });
  });

  describe('error handling', () => {
    it('should handle embedding generation errors', async () => {
      // Given
      mockGenerateEmbeddings.mockReset();
      mockGenerateEmbeddings.mockRejectedValue(new Error('Embedding service failed'));
      const searchParams: SearchParams = {
        query: 'test',
        type: 'topic',
        forum: 'ARBITRUM'
      };

      // When & Then
      await expect(vectorSearchService.search(searchParams)).rejects.toThrow('Embedding service failed');
    });

    it('should handle database query errors', async () => {
      // Given
      jest.clearAllMocks();
      mockGenerateEmbeddings.mockResolvedValue([[0.1, 0.2, 0.3, 0.4, 0.5]]);
      mockDbRaw.mockRejectedValue(new Error('Database connection failed'));
      const searchParams: SearchParams = {
        query: 'test',
        type: 'topic',
        forum: 'ARBITRUM'
      };

      // When & Then
      await expect(vectorSearchService.search(searchParams)).rejects.toThrow('Database connection failed');
    });

    it('should throw error for invalid content type', async () => {
      // When & Then
      await expect(
        vectorSearchService.search({
          query: 'test',
          type: 'invalid' as any,
          forum: 'ARBITRUM'
        })
      ).rejects.toThrow('Invalid content type: invalid');
    });
  });

  describe('cleanup', () => {
    it('should cleanup Redis connection successfully', async () => {
      // Given
      process.env.REDIS_URL = 'redis://localhost:6379';
      const service = new VectorSearchService();
      const mockRedis = new MockRedis();
      mockRedis.quit.mockResolvedValue('OK');

      // When
      await service.cleanup();

      // Then - Should not throw
    });

    it('should handle Redis cleanup errors gracefully', async () => {
      // Given
      process.env.REDIS_URL = 'redis://localhost:6379';
      const service = new VectorSearchService();

      // When & Then - Should not throw even if cleanup fails
      await expect(service.cleanup()).resolves.toBeUndefined();
    });
  });

  describe('result sorting', () => {
    it('should sort results by similarity in descending order', async () => {
      // Given
      mockDbRaw.mockResolvedValue({
        rows: [
          {
            id: 1,
            title: 'Lower Similarity',
            plain_text: 'Content 1',
            forum_name: 'ARBITRUM',
            similarity: 0.6,
            created_at: new Date(),
            popularity_score: 50
          },
          {
            id: 2,
            title: 'Higher Similarity',
            plain_text: 'Content 2',
            forum_name: 'ARBITRUM',
            similarity: 0.9,
            created_at: new Date(),
            popularity_score: 50
          }
        ]
      });

      const searchParams: SearchParams = {
        query: 'test',
        type: 'topic',
        forum: 'ARBITRUM'
      };

      // When
      const results = await vectorSearchService.search(searchParams);

      // Then
      expect(results[0].similarity).toBe(0.9);
      expect(results[1].similarity).toBe(0.6);
      expect(results[0].title).toBe('Higher Similarity');
    });
  });
});

// Helper function for testing table configurations
function getExpectedTableName(type: string): string {
  switch (type) {
    case 'topic': return 'topic_vectors';
    case 'post': return 'post_vectors';
    case 'snapshot': return 'snapshot_proposal_vectors';
    case 'tally': return 'tally_proposal_vectors';
    default: throw new Error(`Unknown type: ${type}`);
  }
}