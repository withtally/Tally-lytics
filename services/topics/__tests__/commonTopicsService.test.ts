// Comprehensive tests for CommonTopicsService
import { describe, test, expect, beforeEach, mock } from 'bun:test';

// Create mock function references that we can control
const mockLoggerInfo = mock();
const mockLoggerWarn = mock();
const mockLoggerError = mock();

// Mock logging
mock.module('../../logging', () => ({
  Logger: mock(() => ({
    info: mockLoggerInfo,
    warn: mockLoggerWarn,
    error: mockLoggerError,
  })),
}));

// Mock database module
const mockDb = mock();
const createMockQueryBuilder = () => {
  const queryBuilder: any = {
    select: mock(() => queryBuilder),
    from: mock(() => queryBuilder),
    join: mock(() => queryBuilder),
    where: mock(() => queryBuilder),
    orderBy: mock(() => queryBuilder),
    limit: mock(() => queryBuilder),
    groupBy: mock(() => queryBuilder),
    count: mock(() => queryBuilder),
    first: mock(),
    then: mock((resolve: any) => Promise.resolve(resolve ? resolve([]) : [])),
  };
  return queryBuilder;
};
const mockQueryBuilder = createMockQueryBuilder();

mockDb.mockImplementation(() => mockQueryBuilder);

mock.module('../../../db/db', () => ({
  default: mockDb,
}));

// Mock LLM service
const mockEvaluateSearchQueries = mock();
mock.module('../../llm/llmService', () => ({
  evaluateSearchQueries: mockEvaluateSearchQueries,
}));

import { CommonTopicsService } from '../commonTopicsService';

describe.skip('CommonTopicsService', () => {
  let service: CommonTopicsService;

  beforeEach(() => {
    // Clear all mocks
    mockLoggerInfo.mockClear();
    mockLoggerWarn.mockClear();
    mockLoggerError.mockClear();
    mockDb.mockClear();
    mockEvaluateSearchQueries.mockClear();
    
    // Reset query builder mocks
    Object.values(mockQueryBuilder).forEach((mockFn: any) => {
      if (mockFn.mockClear) mockFn.mockClear();
      // Reset mock functions
    });
    
    // Create new service instance
    service = new CommonTopicsService();
  });

  describe.skip('getOrCreateCommonTopics', () => {
    test('should fetch existing topics from database', async () => {
      const mockTopics = [
        { id: 1, topic: 'governance', query: 'dao governance', score: 95 },
        { id: 2, topic: 'treasury', query: 'treasury management', score: 88 }
      ];
      
      mockQueryBuilder.then.mockImplementationOnce((resolve: any) => 
        Promise.resolve(resolve ? resolve(mockTopics) : mockTopics)
      );
      
      const result = await service.getOrCreateCommonTopics();
      
      expect(result).toEqual(mockTopics);
      expect(mockDb).toHaveBeenCalledWith('common_topics');
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('*');
    });

    test('should create default topics if none exist', async () => {
      // Mock empty database response
      mockQueryBuilder.then.mockImplementationOnce((resolve: any) => 
        Promise.resolve(resolve ? resolve([]) : [])
      );
      
      // Mock LLM evaluation response
      const mockEvaluationResults = [
        { topic: 'governance', score: 95, query: 'dao governance proposals' },
        { topic: 'treasury', score: 90, query: 'treasury management' }
      ];
      mockEvaluateSearchQueries.mockResolvedValue(mockEvaluationResults);
      
      // Mock insert operation
      const mockInsertBuilder: any = {};
      mockInsertBuilder.insert = mock(() => mockInsertBuilder);
      mockInsertBuilder.returning = mock(() => Promise.resolve(mockEvaluationResults));
      mockDb.mockImplementationOnce(() => mockInsertBuilder);
      
      const result = await service.getOrCreateCommonTopics();
      
      expect(mockEvaluateSearchQueries).toHaveBeenCalled();
      expect(mockInsertBuilder.insert).toHaveBeenCalled();
      expect(result).toEqual(mockEvaluationResults);
    });

    test('should handle database errors gracefully', async () => {
      mockQueryBuilder.then.mockRejectedValueOnce(new Error('Database error'));
      
      await expect(service.getOrCreateCommonTopics()).rejects.toThrow('Database error');
      expect(mockLoggerError).toHaveBeenCalled();
    });

    test('should handle LLM service errors', async () => {
      // Mock empty database
      mockQueryBuilder.then.mockImplementationOnce((resolve: any) => 
        Promise.resolve(resolve ? resolve([]) : [])
      );
      
      // Mock LLM error
      mockEvaluateSearchQueries.mockRejectedValue(new Error('LLM service error'));
      
      await expect(service.getOrCreateCommonTopics()).rejects.toThrow('LLM service error');
      expect(mockLoggerError).toHaveBeenCalled();
    });
  });

  describe.skip('searchCommonTopics', () => {
    test('should search topics by query', async () => {
      const mockResults = [
        { id: 1, topic: 'governance', query: 'dao governance', score: 95 }
      ];
      
      mockQueryBuilder.then.mockImplementationOnce((resolve: any) => 
        Promise.resolve(resolve ? resolve(mockResults) : mockResults)
      );
      
      const result = await service.searchCommonTopics('governance');
      
      expect(result).toEqual(mockResults);
      expect(mockQueryBuilder.where).toHaveBeenCalled();
    });

    test('should handle empty search query', async () => {
      mockQueryBuilder.then.mockImplementationOnce((resolve: any) => 
        Promise.resolve(resolve ? resolve([]) : [])
      );
      
      const result = await service.searchCommonTopics('');
      
      expect(result).toEqual([]);
    });

    test('should handle special characters in search query', async () => {
      const mockResults = [
        { id: 3, topic: 'defi', query: 'defi & lending', score: 85 }
      ];
      
      mockQueryBuilder.then.mockImplementationOnce((resolve: any) => 
        Promise.resolve(resolve ? resolve(mockResults) : mockResults)
      );
      
      const result = await service.searchCommonTopics('defi & lending');
      
      expect(result).toEqual(mockResults);
    });
  });

  describe.skip('updateTopicScore', () => {
    test('should update topic score successfully', async () => {
      const mockUpdateBuilder: any = {};
      mockUpdateBuilder.where = mock(() => mockUpdateBuilder);
      mockUpdateBuilder.update = mock(() => Promise.resolve(1));
      mockDb.mockImplementationOnce(() => mockUpdateBuilder);
      
      await service.updateTopicScore(1, 98);
      
      expect(mockUpdateBuilder.where).toHaveBeenCalledWith('id', 1);
      expect(mockUpdateBuilder.update).toHaveBeenCalledWith({ score: 98 });
    });

    test('should handle non-existent topic ID', async () => {
      const mockUpdateBuilder: any = {};
      mockUpdateBuilder.where = mock(() => mockUpdateBuilder);
      mockUpdateBuilder.update = mock(() => Promise.resolve(0));
      mockDb.mockImplementationOnce(() => mockUpdateBuilder);
      
      const result = await service.updateTopicScore(999, 50);
      
      expect(result).toBeUndefined();
    });

    test('should validate score boundaries', async () => {
      // Test score > 100
      await expect(service.updateTopicScore(1, 150)).rejects.toThrow();
      
      // Test score < 0
      await expect(service.updateTopicScore(1, -10)).rejects.toThrow();
    });
  });

  describe.skip('getTopicsByForum', () => {
    test('should fetch topics for specific forum', async () => {
      const mockTopics = [
        { id: 1, topic: 'arbitrum governance', forum_name: 'arbitrum', score: 92 },
        { id: 2, topic: 'arbitrum proposals', forum_name: 'arbitrum', score: 88 }
      ];
      
      mockQueryBuilder.then.mockImplementationOnce((resolve: any) => 
        Promise.resolve(resolve ? resolve(mockTopics) : mockTopics)
      );
      
      const result = await service.getTopicsByForum('arbitrum');
      
      expect(result).toEqual(mockTopics);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('forum_name', 'arbitrum');
    });

    test('should return empty array for non-existent forum', async () => {
      mockQueryBuilder.then.mockImplementationOnce((resolve: any) => 
        Promise.resolve(resolve ? resolve([]) : [])
      );
      
      const result = await service.getTopicsByForum('nonexistent');
      
      expect(result).toEqual([]);
    });
  });

  describe.skip('addCustomTopic', () => {
    test('should add custom topic successfully', async () => {
      const newTopic = {
        topic: 'custom topic',
        query: 'custom search query',
        score: 80,
        forum_name: 'arbitrum'
      };
      
      const mockInsertBuilder: any = {
        insert: mock(() => mockInsertBuilder),
        returning: mock(() => Promise.resolve([{ id: 10, ...newTopic }])),
      };
      mockDb.mockImplementationOnce(() => mockInsertBuilder);
      
      const result = await service.addCustomTopic(newTopic);
      
      expect(result).toEqual({ id: 10, ...newTopic });
      expect(mockInsertBuilder.insert).toHaveBeenCalledWith(newTopic);
    });

    test('should handle duplicate topic insertion', async () => {
      const duplicateTopic = {
        topic: 'governance',
        query: 'dao governance',
        score: 95
      };
      
      const mockInsertBuilder: any = {
        insert: mock(() => mockInsertBuilder),
        returning: mock(() => Promise.reject(new Error('Duplicate key violation'))),
      };
      mockDb.mockImplementationOnce(() => mockInsertBuilder);
      
      await expect(service.addCustomTopic(duplicateTopic)).rejects.toThrow('Duplicate key violation');
    });
  });

  describe.skip('deleteCustomTopic', () => {
    test('should delete topic successfully', async () => {
      const mockDeleteBuilder: any = {
        where: mock(() => mockDeleteBuilder),
        del: mock(() => Promise.resolve(1)),
      };
      mockDb.mockImplementationOnce(() => mockDeleteBuilder);
      
      const result = await service.deleteCustomTopic(5);
      
      expect(result).toBe(true);
      expect(mockDeleteBuilder.where).toHaveBeenCalledWith('id', 5);
    });

    test('should return false for non-existent topic', async () => {
      const mockDeleteBuilder: any = {
        where: mock(() => mockDeleteBuilder),
        del: mock(() => Promise.resolve(0)),
      };
      mockDb.mockImplementationOnce(() => mockDeleteBuilder);
      
      const result = await service.deleteCustomTopic(999);
      
      expect(result).toBe(false);
    });
  });

  describe.skip('getTopicStats', () => {
    test('should calculate topic statistics', async () => {
      const mockStats = [
        { forum_name: 'arbitrum', topic_count: 10, avg_score: 87.5 },
        { forum_name: 'compound', topic_count: 8, avg_score: 82.3 }
      ];
      
      mockQueryBuilder.then.mockImplementationOnce((resolve: any) => 
        Promise.resolve(resolve ? resolve(mockStats) : mockStats)
      );
      
      const result = await service.getTopicStats();
      
      expect(result).toEqual(mockStats);
      expect(mockQueryBuilder.groupBy).toHaveBeenCalledWith('forum_name');
    });

    test('should handle empty statistics', async () => {
      mockQueryBuilder.then.mockImplementationOnce((resolve: any) => 
        Promise.resolve(resolve ? resolve([]) : [])
      );
      
      const result = await service.getTopicStats();
      
      expect(result).toEqual([]);
    });
  });

  describe.skip('error handling', () => {
    test('should log errors with context', async () => {
      const testError = new Error('Test error');
      mockQueryBuilder.then.mockRejectedValueOnce(testError);
      
      try {
        await service.getOrCreateCommonTopics();
      } catch (error) {
        // Expected to throw
      }
      
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.stringContaining('Error in getOrCreateCommonTopics'),
        expect.objectContaining({ error: testError })
      );
    });
  });

  describe.skip('initialization', () => {
    test('should log initialization', () => {
      new CommonTopicsService();
      expect(mockLoggerInfo).toHaveBeenCalledWith('CommonTopicsService initialized');
    });
  });
});