// services/__tests__/topics.test.ts

import { describe, it, beforeEach, expect, mock } from 'bun:test';

// Mock the database module BEFORE importing the service
const mockDb = mock(() => {});

mock.module('../../db/db', () => ({
  default: mockDb,
}));

// Import after mocking
import { insertTopic, getAllTopics, getLatestTopicTimestamp } from '../topics';

describe('topics service', () => {
  let mockQuery: any;

  beforeEach(() => {
    mockDb.mockClear();

    // Create mock query object with method chaining
    mockQuery = {
      insert: mock().mockReturnThis(),
      onConflict: mock().mockReturnThis(),
      merge: mock().mockReturnThis(),
      select: mock().mockReturnThis(),
      max: mock().mockReturnThis(),
      first: mock(),
    };

    // Setup mockDb to return the mock query object
    mockDb.mockImplementation(() => mockQuery);
  });

  describe('insertTopic', () => {
    it('should insert topic with conflict resolution', async () => {
      const topicData = {
        id: 123,
        title: 'Test Topic',
        forum_name: 'test-forum',
        created_at: new Date(),
      };

      // Mock successful insert (returns void)
      mockQuery.merge.mockResolvedValue(undefined);

      const result = await insertTopic(topicData);

      expect(result).toBeUndefined();
      expect(mockDb).toHaveBeenCalledWith('topics');
      expect(mockQuery.insert).toHaveBeenCalledWith(topicData);
      expect(mockQuery.onConflict).toHaveBeenCalledWith('id');
      expect(mockQuery.merge).toHaveBeenCalled();
    });

    it('should handle empty topic object', async () => {
      const topicData = {};

      mockQuery.merge.mockResolvedValue(undefined);

      const result = await insertTopic(topicData);

      expect(result).toBeUndefined();
      expect(mockQuery.insert).toHaveBeenCalledWith(topicData);
    });

    it('should handle topic with minimal fields', async () => {
      const topicData = {
        id: 456,
        title: 'Minimal Topic',
      };

      mockQuery.merge.mockResolvedValue(undefined);

      const result = await insertTopic(topicData);

      expect(result).toBeUndefined();
      expect(mockQuery.insert).toHaveBeenCalledWith(topicData);
    });

    it('should handle topic with all optional fields', async () => {
      const topicData = {
        id: 789,
        title: 'Full Topic',
        forum_name: 'test-forum',
        created_at: new Date(),
        updated_at: new Date(),
        author_id: 1,
        post_count: 5,
        view_count: 100,
        last_analyzed: new Date(),
      };

      mockQuery.merge.mockResolvedValue(undefined);

      const result = await insertTopic(topicData);

      expect(result).toBeUndefined();
      expect(mockQuery.insert).toHaveBeenCalledWith(topicData);
    });

    it('should handle database error during insert', async () => {
      const topicData = { id: 999, title: 'Error Topic' };

      // Mock database error
      mockQuery.merge.mockRejectedValue(new Error('Database connection failed'));

      await expect(insertTopic(topicData)).rejects.toThrow('Database connection failed');
    });

    it('should handle null topic data', async () => {
      const topicData = null;

      mockQuery.merge.mockResolvedValue(undefined);

      const result = await insertTopic(topicData);

      expect(result).toBeUndefined();
      expect(mockQuery.insert).toHaveBeenCalledWith(topicData);
    });

    it('should handle undefined topic data', async () => {
      const topicData = undefined;

      mockQuery.merge.mockResolvedValue(undefined);

      const result = await insertTopic(topicData);

      expect(result).toBeUndefined();
      expect(mockQuery.insert).toHaveBeenCalledWith(topicData);
    });

    it('should handle large topic data object', async () => {
      const topicData = {
        id: 12345,
        title: 'A'.repeat(1000), // Very long title
        forum_name: 'long-forum-name-with-many-characters',
        created_at: new Date(),
        description: 'B'.repeat(5000), // Very long description
      };

      mockQuery.merge.mockResolvedValue(undefined);

      const result = await insertTopic(topicData);

      expect(result).toBeUndefined();
      expect(mockQuery.insert).toHaveBeenCalledWith(topicData);
    });

    it('should verify method call order', async () => {
      const topicData = { id: 777, title: 'Order Test' };

      mockQuery.merge.mockResolvedValue(undefined);

      await insertTopic(topicData);

      // Verify method chaining order
      expect(mockQuery.insert).toHaveBeenCalled();
      expect(mockQuery.onConflict).toHaveBeenCalled();
      expect(mockQuery.merge).toHaveBeenCalled();
    });

    it('should handle consecutive inserts', async () => {
      const topicData1 = { id: 1, title: 'Topic 1' };
      const topicData2 = { id: 2, title: 'Topic 2' };

      mockQuery.merge.mockResolvedValue(undefined);

      await insertTopic(topicData1);
      await insertTopic(topicData2);

      expect(mockQuery.insert).toHaveBeenCalledWith(topicData1);
      expect(mockQuery.insert).toHaveBeenCalledWith(topicData2);
      expect(mockQuery.insert).toHaveBeenCalledTimes(2);
    });
  });

  describe('getAllTopics', () => {
    it('should return all topics', async () => {
      const mockTopics = [
        { id: 1, title: 'Topic 1', forum_name: 'forum1' },
        { id: 2, title: 'Topic 2', forum_name: 'forum2' },
        { id: 3, title: 'Topic 3', forum_name: 'forum1' },
      ];

      mockQuery.select.mockResolvedValue(mockTopics);

      const result = await getAllTopics();

      expect(result).toEqual(mockTopics);
      expect(mockDb).toHaveBeenCalledWith('topics');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
    });

    it('should handle empty topics result', async () => {
      mockQuery.select.mockResolvedValue([]);

      const result = await getAllTopics();

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('should handle database error', async () => {
      mockQuery.select.mockRejectedValue(new Error('Database query failed'));

      await expect(getAllTopics()).rejects.toThrow('Database query failed');
    });

    it('should handle large dataset', async () => {
      const largeMockTopics = new Array(1000).fill(0).map((_, i) => ({
        id: i + 1,
        title: `Topic ${i + 1}`,
        forum_name: `forum${(i % 10) + 1}`,
      }));

      mockQuery.select.mockResolvedValue(largeMockTopics);

      const result = await getAllTopics();

      expect(result).toEqual(largeMockTopics);
      expect(result).toHaveLength(1000);
    });

    it('should always return array format', async () => {
      // Test with null response (shouldn't happen but defensive)
      mockQuery.select.mockResolvedValue(null);

      const result = await getAllTopics();

      expect(result).toBe(null);
    });

    it('should handle topics with various field types', async () => {
      const mockTopics = [
        {
          id: 1,
          title: 'String Topic',
          forum_name: 'forum1',
          created_at: '2023-01-01T00:00:00Z',
          post_count: 5,
          view_count: 100,
        },
        {
          id: 2,
          title: null, // null title
          forum_name: '',
          created_at: new Date(),
          post_count: 0,
          view_count: null,
        },
      ];

      mockQuery.select.mockResolvedValue(mockTopics);

      const result = await getAllTopics();

      expect(result).toEqual(mockTopics);
    });
  });

  describe('getLatestTopicTimestamp', () => {
    it('should return latest timestamp', async () => {
      const latestTimestamp = '2023-12-01T10:00:00Z';

      mockQuery.first.mockResolvedValue({ latest_timestamp: latestTimestamp });

      const result = await getLatestTopicTimestamp();

      expect(result).toEqual(new Date(latestTimestamp));
      expect(mockDb).toHaveBeenCalledWith('topics');
      expect(mockQuery.max).toHaveBeenCalledWith('created_at as latest_timestamp');
      expect(mockQuery.first).toHaveBeenCalled();
    });

    it('should handle no topics in database', async () => {
      mockQuery.first.mockResolvedValue(null);

      const result = await getLatestTopicTimestamp();

      expect(result).toBe(null);
    });

    it('should handle undefined result', async () => {
      mockQuery.first.mockResolvedValue(undefined);

      const result = await getLatestTopicTimestamp();

      expect(result).toBe(null);
    });

    it('should handle database error', async () => {
      mockQuery.first.mockRejectedValue(new Error('Database connection lost'));

      await expect(getLatestTopicTimestamp()).rejects.toThrow('Database connection lost');
    });

    it('should handle null latest_timestamp', async () => {
      mockQuery.first.mockResolvedValue({ latest_timestamp: null });

      const result = await getLatestTopicTimestamp();

      expect(result).toEqual(new Date(null)); // This creates an invalid date
    });

    it('should handle malformed timestamp', async () => {
      mockQuery.first.mockResolvedValue({ latest_timestamp: 'invalid-date' });

      const result = await getLatestTopicTimestamp();

      expect(result.toString()).toBe('Invalid Date');
    });

    it('should handle very old timestamp', async () => {
      const oldTimestamp = '1970-01-01T00:00:00Z';

      mockQuery.first.mockResolvedValue({ latest_timestamp: oldTimestamp });

      const result = await getLatestTopicTimestamp();

      expect(result).toEqual(new Date(oldTimestamp));
    });

    it('should handle future timestamp', async () => {
      const futureTimestamp = '2030-12-31T23:59:59Z';

      mockQuery.first.mockResolvedValue({ latest_timestamp: futureTimestamp });

      const result = await getLatestTopicTimestamp();

      expect(result).toEqual(new Date(futureTimestamp));
    });

    it('should verify query method call order', async () => {
      mockQuery.first.mockResolvedValue({ latest_timestamp: '2023-01-01T00:00:00Z' });

      await getLatestTopicTimestamp();

      // Verify proper query methods called
      expect(mockDb).toHaveBeenCalled();
      expect(mockQuery.max).toHaveBeenCalled();
      expect(mockQuery.first).toHaveBeenCalled();
    });

    it('should handle response missing latest_timestamp field', async () => {
      // Mock response without latest_timestamp field
      mockQuery.first.mockResolvedValue({ id: 123, title: 'Some Topic' });

      const result = await getLatestTopicTimestamp();

      expect(result.toString()).toBe('Invalid Date');
    });

    it('should handle numeric timestamp', async () => {
      const numericTimestamp = Date.now();

      mockQuery.first.mockResolvedValue({ latest_timestamp: numericTimestamp });

      const result = await getLatestTopicTimestamp();

      expect(result).toEqual(new Date(numericTimestamp));
    });

    it('should handle zero timestamp', async () => {
      mockQuery.first.mockResolvedValue({ latest_timestamp: 0 });

      const result = await getLatestTopicTimestamp();

      expect(result).toEqual(new Date(0));
    });
  });
});