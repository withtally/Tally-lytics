// services/__tests__/analysis.test.ts

import { describe, it, beforeEach, expect } from '@jest/globals';

// Mock the database module BEFORE importing the service
const mockDb = jest.fn(() => {});

jest.mock('../../db/db', () => ({
  default: mockDb,
}));

// Import after mocking
import { topicNeedsReanalysis } from '../analysis';

describe('analysis service', () => {
  let topicQuery: any;
  let postsQuery: any;

  beforeEach(() => {
    mockDb.mockClear();

    // Create mock query objects with method chaining
    topicQuery = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      first: jest.fn(),
    };

    postsQuery = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn(),
      count: jest.fn(),
    };

    // Setup mockDb to return the appropriate query object based on table name
    mockDb.mockImplementation((tableName: string) => {
      if (tableName === 'topics') {
        return topicQuery;
      } else if (tableName === 'posts') {
        return postsQuery;
      }
      // Default fallback
      return topicQuery;
    });
  });

  describe('topicNeedsReanalysis', () => {
    it('should return true when topic has new posts after last_analyzed', async () => {
      const topicId = 123;
      const lastAnalyzed = '2023-01-01T00:00:00Z';

      // Mock topic query
      topicQuery.first.mockResolvedValue({ last_analyzed: lastAnalyzed });

      // Mock posts select query - return array with posts
      postsQuery.select.mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }]);

      const result = await topicNeedsReanalysis(topicId);

      expect(result).toBe(true);
      expect(mockDb).toHaveBeenCalledWith('topics');
      expect(topicQuery.where).toHaveBeenCalledWith({ id: topicId });
      expect(topicQuery.select).toHaveBeenCalledWith('last_analyzed');
      expect(mockDb).toHaveBeenCalledWith('posts');
      expect(postsQuery.where).toHaveBeenCalledWith({ topic_id: topicId });
      expect(postsQuery.select).toHaveBeenCalledWith('id');
    });

    it('should return false when topic has no new posts after last_analyzed', async () => {
      const topicId = 456;
      const lastAnalyzed = '2023-01-01T00:00:00Z';

      // Mock topic query
      topicQuery.first.mockResolvedValue({ last_analyzed: lastAnalyzed });

      // Mock posts count query - return count = 0
      postsQuery.select.mockResolvedValue([]);

      const result = await topicNeedsReanalysis(topicId);

      expect(result).toBe(false);
      expect(mockDb).toHaveBeenCalledWith('topics');
      expect(mockDb).toHaveBeenCalledWith('posts');
      expect(postsQuery.where).toHaveBeenCalledWith({ topic_id: topicId });
      expect(postsQuery.select).toHaveBeenCalledWith('id');
    });

    it('should return true when topic has never been analyzed (last_analyzed is null)', async () => {
      const topicId = 789;

      // Mock topic query - null last_analyzed
      topicQuery.first.mockResolvedValue({ last_analyzed: null });

      // Mock posts count query
      postsQuery.select.mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]);

      const result = await topicNeedsReanalysis(topicId);

      expect(result).toBe(true);
      expect(mockDb).toHaveBeenCalledWith('topics');
      expect(mockDb).toHaveBeenCalledWith('posts');
      // Should use Date(0) as fallback for null last_analyzed
      expect(postsQuery.andWhere).toHaveBeenCalledWith('created_at', '>', new Date(0));
    });

    it('should return false when topic has never been analyzed and has no posts', async () => {
      const topicId = 101;

      // Mock topic query - null last_analyzed
      topicQuery.first.mockResolvedValue({ last_analyzed: null });

      // Mock posts count query - no posts
      postsQuery.select.mockResolvedValue([]);

      const result = await topicNeedsReanalysis(topicId);

      expect(result).toBe(false);
    });

    it('should throw error when topic does not exist', async () => {
      const topicId = 999;

      // Mock topic query - topic not found
      topicQuery.first.mockResolvedValue(null);

      await expect(topicNeedsReanalysis(topicId)).rejects.toThrow('Topic with ID 999 not found.');

      expect(mockDb).toHaveBeenCalledWith('topics');
      expect(topicQuery.where).toHaveBeenCalledWith({ id: topicId });
    });

    it('should throw error when topic is undefined', async () => {
      const topicId = 888;

      // Mock topic query - topic is undefined
      topicQuery.first.mockResolvedValue(undefined);

      await expect(topicNeedsReanalysis(topicId)).rejects.toThrow('Topic with ID 888 not found.');
    });

    it('should handle zero topic ID', async () => {
      const topicId = 0;

      // Mock topic query - topic not found for ID 0
      topicQuery.first.mockResolvedValue(null);

      await expect(topicNeedsReanalysis(topicId)).rejects.toThrow('Topic with ID 0 not found.');
    });

    it('should handle negative topic ID', async () => {
      const topicId = -1;

      // Mock topic query - topic not found for negative ID
      topicQuery.first.mockResolvedValue(null);

      await expect(topicNeedsReanalysis(topicId)).rejects.toThrow('Topic with ID -1 not found.');
    });

    it('should handle very large topic ID', async () => {
      const topicId = Number.MAX_SAFE_INTEGER;

      // Mock topic query - simulate valid topic
      topicQuery.first.mockResolvedValue({ last_analyzed: '2023-01-01T00:00:00Z' });
      postsQuery.select.mockResolvedValue([{ id: 1 }]);

      const result = await topicNeedsReanalysis(topicId);

      expect(result).toBe(true);
      expect(topicQuery.where).toHaveBeenCalledWith({ id: topicId });
    });

    it('should handle different date formats for last_analyzed', async () => {
      const topicId = 123;
      const lastAnalyzed = new Date('2023-01-01T00:00:00Z');

      // Mock topic query with Date object
      topicQuery.first.mockResolvedValue({ last_analyzed: lastAnalyzed });
      postsQuery.select.mockResolvedValue([{ id: 1 }, { id: 2 }]);

      const result = await topicNeedsReanalysis(topicId);

      expect(result).toBe(true);
    });

    it('should handle exactly one new post', async () => {
      const topicId = 123;
      const lastAnalyzed = '2023-01-01T00:00:00Z';

      topicQuery.first.mockResolvedValue({ last_analyzed: lastAnalyzed });
      postsQuery.select.mockResolvedValue([{ id: 1 }]);

      const result = await topicNeedsReanalysis(topicId);

      expect(result).toBe(true);
    });

    it('should handle many new posts', async () => {
      const topicId = 123;
      const lastAnalyzed = '2023-01-01T00:00:00Z';

      topicQuery.first.mockResolvedValue({ last_analyzed: lastAnalyzed });
      postsQuery.select.mockResolvedValue(new Array(100).fill(0).map((_, i) => ({ id: i + 1 })));

      const result = await topicNeedsReanalysis(topicId);

      expect(result).toBe(true);
    });

    it('should handle empty string last_analyzed', async () => {
      const topicId = 123;

      // Mock topic query with empty string
      topicQuery.first.mockResolvedValue({ last_analyzed: '' });
      postsQuery.select.mockResolvedValue([{ id: 1 }]);

      const result = await topicNeedsReanalysis(topicId);

      expect(result).toBe(true);
      // Empty string should be treated as Date(0)
      expect(postsQuery.andWhere).toHaveBeenCalledWith('created_at', '>', new Date(0));
    });

    it('should handle topic with last_analyzed as Date object', async () => {
      const topicId = 123;
      const lastAnalyzed = new Date('2023-06-01T12:00:00Z');

      topicQuery.first.mockResolvedValue({ last_analyzed: lastAnalyzed });
      postsQuery.select.mockResolvedValue([]);

      const result = await topicNeedsReanalysis(topicId);

      expect(result).toBe(false);
      expect(postsQuery.andWhere).toHaveBeenCalledWith('created_at', '>', lastAnalyzed);
    });

    it('should use Date(0) fallback when last_analyzed is null', async () => {
      const topicId = 123;

      topicQuery.first.mockResolvedValue({ last_analyzed: null });
      postsQuery.select.mockResolvedValue([{ id: 1 }]);

      await topicNeedsReanalysis(topicId);

      expect(postsQuery.andWhere).toHaveBeenCalledWith('created_at', '>', new Date(0));
    });

    it('should use Date(0) fallback when last_analyzed is undefined', async () => {
      const topicId = 123;

      topicQuery.first.mockResolvedValue({ last_analyzed: undefined });
      postsQuery.select.mockResolvedValue([{ id: 1 }]);

      await topicNeedsReanalysis(topicId);

      expect(postsQuery.andWhere).toHaveBeenCalledWith('created_at', '>', new Date(0));
    });

    it('should properly check query execution order', async () => {
      const topicId = 123;

      topicQuery.first.mockResolvedValue({ last_analyzed: '2023-01-01T00:00:00Z' });
      postsQuery.select.mockResolvedValue([{ id: 1 }]);

      await topicNeedsReanalysis(topicId);

      // Verify topics query is called before posts query
      expect(mockDb).toHaveBeenNthCalledWith(1, 'topics');
      expect(mockDb).toHaveBeenNthCalledWith(2, 'posts');
    });

    it('should return boolean type consistently', async () => {
      const topicId = 123;

      topicQuery.first.mockResolvedValue({ last_analyzed: '2023-01-01T00:00:00Z' });
      postsQuery.select.mockResolvedValue([]);

      const result = await topicNeedsReanalysis(topicId);

      expect(typeof result).toBe('boolean');
      expect(result).toBe(false);
    });
  });
});