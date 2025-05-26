// services/snapshot/__tests__/snapshotUtils.test.ts

import { describe, test, it, expect, beforeEach, afterEach, spyOn, mock } from 'bun:test';
import {
  SnapshotProposal,
  timestampToDate,
  getNewestTimestamp,
  isValidTimestamp,
  filterNewProposals,
  validateProposal,
  validateAndFilterProposals,
  transformProposalForDatabase,
  transformProposalsBatch,
  createBatches,
  shouldContinuePagination,
  sanitizeProposalContent,
  sanitizeProposal,
  createGraphQLVariables,
  calculateRetryDelay,
  formatProposalForLog,
  calculateCrawlingStats,
  shouldStopCrawling,
  createDefaultCrawlInfo,
  calculatePaginationParams,
} from '../snapshotUtils';

describe('snapshotUtils', () => {
  const mockProposal: SnapshotProposal = {
    id: 'proposal-1',
    forum_name: 'arbitrum',
    title: 'Test Proposal 1',
    body: 'Test proposal body',
    choices: ['Yes', 'No'],
    start: 1640995200, // Unix timestamp
    end: 1641081600,
    snapshot: 'snapshot-hash-1',
    state: 'active',
    author: 'test-author',
    space: {
      id: 'test-space',
      name: 'Test Space',
    },
    scores: [100, 50],
    scores_total: 150,
  };

  const mockProposal2: SnapshotProposal = {
    id: 'proposal-2',
    forum_name: 'arbitrum',
    title: 'Test Proposal 2',
    body: 'Another test proposal',
    choices: ['Option A', 'Option B', 'Option C'],
    start: 1641082000,
    end: 1641168000,
    snapshot: 'snapshot-hash-2',
    state: 'closed',
    author: 'another-author',
    space: {
      id: 'test-space',
      name: 'Test Space',
    },
    scores: [75, 25, 100],
    scores_total: 200,
  };

  describe('timestampToDate', () => {
    it('should convert Unix timestamp to Date', () => {
      const timestamp = 1640995200;
      const result = timestampToDate(timestamp);
      expect(result).toEqual(new Date(1640995200 * 1000));
    });

    it('should handle zero timestamp', () => {
      const result = timestampToDate(0);
      expect(result).toEqual(new Date(0));
    });

    it('should handle negative timestamp', () => {
      const result = timestampToDate(-1);
      expect(result).toEqual(new Date(-1000));
    });
  });

  describe('getNewestTimestamp', () => {
    it('should return newest timestamp from proposals', () => {
      const proposals = [mockProposal, mockProposal2];
      const result = getNewestTimestamp(proposals, 0);
      expect(result).toBe(1641082000); // mockProposal2 has newer timestamp
    });

    it('should handle single proposal', () => {
      const proposals = [mockProposal];
      const result = getNewestTimestamp(proposals, 0);
      expect(result).toBe(1640995200);
    });

    it('should return current newest for empty array', () => {
      const result = getNewestTimestamp([], 1640000000);
      expect(result).toBe(1640000000);
    });

    it('should handle proposals with same timestamp', () => {
      const proposals = [
        { ...mockProposal, start: 1640995200 },
        { ...mockProposal2, start: 1640995200 },
      ];
      const result = getNewestTimestamp(proposals, 0);
      expect(result).toBe(1640995200);
    });

    it('should return current newest if it is higher', () => {
      const proposals = [mockProposal];
      const result = getNewestTimestamp(proposals, 1641082000);
      expect(result).toBe(1641082000);
    });
  });

  describe('isValidTimestamp', () => {
    it('should return true for valid timestamps', () => {
      expect(isValidTimestamp(1640995200)).toBe(true);
      expect(isValidTimestamp(1577836801)).toBe(true); // Just after 2020-01-01
    });

    it('should return false for invalid timestamps', () => {
      expect(isValidTimestamp(-1)).toBe(false);
      expect(isValidTimestamp(NaN)).toBe(false);
      expect(isValidTimestamp(Infinity)).toBe(false);
    });

    it('should return false for timestamps too old', () => {
      expect(isValidTimestamp(0)).toBe(false); // Before 2020
      expect(isValidTimestamp(946684800)).toBe(false); // Year 2000
      expect(isValidTimestamp(1577836800)).toBe(false); // Exactly 2020-01-01 (not included due to > check)
    });

    it('should return false for future timestamps', () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 86400; // Tomorrow
      expect(isValidTimestamp(futureTimestamp)).toBe(false);
    });
  });

  describe('filterNewProposals', () => {
    it('should filter proposals newer than last crawl time', () => {
      const proposals = [mockProposal, mockProposal2];
      const lastCrawlTime = new Date(1641000000 * 1000); // Between the two proposals
      const result = filterNewProposals(proposals, lastCrawlTime);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('proposal-2');
    });

    it('should return all proposals if last crawl time is very old', () => {
      const proposals = [mockProposal, mockProposal2];
      const lastCrawlTime = new Date(0);
      const result = filterNewProposals(proposals, lastCrawlTime);

      expect(result).toHaveLength(2);
    });

    it('should return empty array if all proposals are old', () => {
      const proposals = [mockProposal, mockProposal2];
      const lastCrawlTime = new Date(2000000000 * 1000); // Future date
      const result = filterNewProposals(proposals, lastCrawlTime);

      expect(result).toHaveLength(0);
    });

    it('should handle empty proposal array', () => {
      const result = filterNewProposals([], new Date());
      expect(result).toHaveLength(0);
    });
  });

  describe('validateProposal', () => {
    it('should return true for valid proposal', () => {
      expect(validateProposal(mockProposal)).toBe(true);
    });

    it('should return true for proposal with empty string id (string type check passes)', () => {
      const proposalWithEmptyId = { ...mockProposal, id: '' };
      expect(validateProposal(proposalWithEmptyId)).toBe(true);
    });

    it('should return false for proposal with null id', () => {
      const invalidProposal = { ...mockProposal, id: null };
      expect(validateProposal(invalidProposal)).toBe(false);
    });

    it('should return true for proposal with negative timestamp (number type check passes)', () => {
      const proposalWithNegativeTimestamp = { ...mockProposal, start: -1 };
      expect(validateProposal(proposalWithNegativeTimestamp)).toBe(true);
    });

    it('should return false for proposal with string timestamp', () => {
      const invalidProposal = { ...mockProposal, start: '1640995200' };
      expect(validateProposal(invalidProposal)).toBe(false);
    });

    it('should handle proposal with missing space safely', () => {
      const invalidProposal = { ...mockProposal, space: null as any };
      // The function should not crash but might return falsy value
      const result = validateProposal(invalidProposal);
      expect(result).toBeFalsy();
    });

    it('should return true for proposal with empty space id (string type check passes)', () => {
      const proposalWithEmptySpaceId = {
        ...mockProposal,
        space: { ...mockProposal.space, id: '' },
      };
      expect(validateProposal(proposalWithEmptySpaceId)).toBe(true);
    });

    it('should return false for proposal with null space id', () => {
      const invalidProposal = {
        ...mockProposal,
        space: { ...mockProposal.space, id: null },
      };
      expect(validateProposal(invalidProposal)).toBe(false);
    });
  });

  describe('validateAndFilterProposals', () => {
    it('should filter out invalid proposals', () => {
      const proposals = [
        mockProposal,
        { ...mockProposal2, id: null }, // Invalid - null id
        mockProposal2,
      ];

      const result = validateAndFilterProposals(proposals);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('proposal-1');
      expect(result[1].id).toBe('proposal-2');
    });

    it('should return empty array if all proposals are invalid', () => {
      const proposals = [
        { ...mockProposal, id: null }, // Invalid - null id
        { ...mockProposal2, start: 'invalid' }, // Invalid - string timestamp
      ];

      const result = validateAndFilterProposals(proposals);
      expect(result).toHaveLength(0);
    });

    it('should handle empty array', () => {
      const result = validateAndFilterProposals([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('transformProposalForDatabase', () => {
    it('should transform proposal correctly', () => {
      const result = transformProposalForDatabase(mockProposal, 'test-forum');

      expect(result).toEqual({
        id: 'proposal-1',
        title: 'Test Proposal 1',
        body: 'Test proposal body',
        choices: JSON.stringify(['Yes', 'No']),
        start: new Date(1640995200 * 1000),
        end: new Date(1641081600 * 1000),
        snapshot: 'snapshot-hash-1',
        state: 'active',
        author: 'test-author',
        space_id: 'test-space',
        space_name: 'Test Space',
        scores: JSON.stringify([100, 50]),
        scores_total: '150',
        forum_name: 'test-forum',
      });
    });

    it('should handle proposal with undefined scores_total', () => {
      const proposalWithoutScores = {
        ...mockProposal,
        scores_total: undefined as any,
      };

      const result = transformProposalForDatabase(proposalWithoutScores, 'test-forum');
      expect(result.scores_total).toBe('0');
    });

    it('should handle proposal with null scores_total', () => {
      const proposalWithoutScores = {
        ...mockProposal,
        scores_total: null as any,
      };

      const result = transformProposalForDatabase(proposalWithoutScores, 'test-forum');
      expect(result.scores_total).toBe('0');
    });
  });

  describe('transformProposalsBatch', () => {
    it('should transform multiple proposals', () => {
      const proposals = [mockProposal, mockProposal2];
      const result = transformProposalsBatch(proposals, 'test-forum');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('proposal-1');
      expect(result[1].id).toBe('proposal-2');
      expect(result[0].forum_name).toBe('test-forum');
      expect(result[1].forum_name).toBe('test-forum');
    });

    it('should handle empty array', () => {
      const result = transformProposalsBatch([], 'test-forum');
      expect(result).toHaveLength(0);
    });
  });

  describe('createBatches', () => {
    it('should create batches of specified size', () => {
      const items = [1, 2, 3, 4, 5, 6, 7];
      const result = createBatches(items, 3);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual([1, 2, 3]);
      expect(result[1]).toEqual([4, 5, 6]);
      expect(result[2]).toEqual([7]);
    });

    it('should handle array smaller than batch size', () => {
      const items = [1, 2];
      const result = createBatches(items, 5);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual([1, 2]);
    });

    it('should handle empty array', () => {
      const result = createBatches([], 3);
      expect(result).toHaveLength(0);
    });

    it('should handle batch size of 1', () => {
      const items = [1, 2, 3];
      const result = createBatches(items, 1);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual([1]);
      expect(result[1]).toEqual([2]);
      expect(result[2]).toEqual([3]);
    });
  });

  describe('shouldContinuePagination', () => {
    it('should return true when batch size equals page size and has new items', () => {
      expect(shouldContinuePagination(10, 10, true)).toBe(true);
    });

    it('should return false when batch size is less than page size', () => {
      expect(shouldContinuePagination(5, 10, true)).toBe(false);
    });

    it('should return false when batch size is zero', () => {
      expect(shouldContinuePagination(0, 10, true)).toBe(false);
    });

    it('should return false when no new items found', () => {
      expect(shouldContinuePagination(10, 10, false)).toBe(false);
    });

    it('should handle negative batch size', () => {
      expect(shouldContinuePagination(-1, 10, true)).toBe(false);
    });

    it('should return true when batch size exceeds page size and has new items', () => {
      expect(shouldContinuePagination(15, 10, true)).toBe(true);
    });
  });

  describe('sanitizeProposalContent', () => {
    it('should normalize line breaks', () => {
      const dirty = 'Hello\r\nworld\n\n\n\ntest';
      const result = sanitizeProposalContent(dirty);
      expect(result).toBe('Hello\nworld\n\ntest');
    });

    it('should handle empty string', () => {
      const result = sanitizeProposalContent('');
      expect(result).toBe('');
    });

    it('should handle null input', () => {
      const result = sanitizeProposalContent(null as any);
      expect(result).toBe('');
    });

    it('should handle undefined input', () => {
      const result = sanitizeProposalContent(undefined as any);
      expect(result).toBe('');
    });

    it('should trim whitespace', () => {
      const dirty = '  Hello world  ';
      const result = sanitizeProposalContent(dirty);
      expect(result).toBe('Hello world');
    });

    it('should limit content length', () => {
      const longContent = 'a'.repeat(60000);
      const result = sanitizeProposalContent(longContent);
      expect(result.length).toBe(50000);
    });

    it('should handle non-string input', () => {
      const result = sanitizeProposalContent(123 as any);
      expect(result).toBe('');
    });
  });

  describe('sanitizeProposal', () => {
    it('should sanitize proposal content fields', () => {
      const dirtyProposal = {
        ...mockProposal,
        title: '  Title with spaces  ',
        body: 'Body\r\nwith\n\n\n\nmultiple breaks',
        choices: ['  Choice 1  ', 'Choice\r\n2'],
      };

      const result = sanitizeProposal(dirtyProposal);
      expect(result.title).toBe('Title with spaces');
      expect(result.body).toBe('Body\nwith\n\nmultiple breaks');
      expect(result.choices).toEqual(['Choice 1', 'Choice\n2']);
    });

    it('should preserve non-content fields', () => {
      const result = sanitizeProposal(mockProposal);
      expect(result.id).toBe(mockProposal.id);
      expect(result.start).toBe(mockProposal.start);
      expect(result.state).toBe(mockProposal.state);
    });

    it('should ensure integer timestamps', () => {
      const proposalWithFloats = {
        ...mockProposal,
        start: 1640995200.5,
        end: 1641081600.7,
      };

      const result = sanitizeProposal(proposalWithFloats);
      expect(result.start).toBe(1640995200);
      expect(result.end).toBe(1641081600);
    });

    it('should ensure non-negative scores_total', () => {
      const proposalWithNegativeScore = {
        ...mockProposal,
        scores_total: -10,
      };

      const result = sanitizeProposal(proposalWithNegativeScore);
      expect(result.scores_total).toBe(0);
    });
  });

  describe('createGraphQLVariables', () => {
    it('should create correct GraphQL variables', () => {
      const result = createGraphQLVariables('test-space', 100, 50);

      expect(result).toEqual({
        spaceId: 'test-space',
        first: 100,
        skip: 50,
      });
    });

    it('should handle zero values', () => {
      const result = createGraphQLVariables('test-space', 0, 0);

      expect(result).toEqual({
        spaceId: 'test-space',
        first: 0,
        skip: 0,
      });
    });
  });

  describe('calculateRetryDelay', () => {
    it('should calculate exponential backoff delay', () => {
      expect(calculateRetryDelay(1)).toBe(2000);
      expect(calculateRetryDelay(2)).toBe(4000);
      expect(calculateRetryDelay(3)).toBe(8000);
    });

    it('should use custom base delay', () => {
      expect(calculateRetryDelay(1, 500)).toBe(1000);
      expect(calculateRetryDelay(2, 500)).toBe(2000);
    });

    it('should handle attempt 0', () => {
      expect(calculateRetryDelay(0)).toBe(1000);
    });

    it('should handle large attempts', () => {
      const result = calculateRetryDelay(10);
      expect(result).toBe(1024000); // 2^10 * 1000
    });
  });

  describe('formatProposalForLog', () => {
    it('should format proposal for logging as string', () => {
      const result = formatProposalForLog(mockProposal);

      expect(result).toBe('proposal-1 - "Test Proposal 1" (active)');
    });

    it('should handle proposal with empty title', () => {
      const proposalWithEmptyTitle = {
        ...mockProposal,
        title: '',
      };

      const result = formatProposalForLog(proposalWithEmptyTitle);
      expect(result).toBe('proposal-1 - "" (active)');
    });

    it('should handle proposal with special characters in title', () => {
      const proposalWithSpecialChars = {
        ...mockProposal,
        title: 'Title "with" quotes & symbols',
      };

      const result = formatProposalForLog(proposalWithSpecialChars);
      expect(result).toBe('proposal-1 - "Title "with" quotes & symbols" (active)');
    });
  });

  describe('calculateCrawlingStats', () => {
    it('should calculate crawling statistics', () => {
      const startTime = new Date('2023-01-01T00:00:00Z');
      // Mock Date.now to return end time
      const endTimeMs = new Date('2023-01-01T00:01:00Z').getTime();
      spyOn(Date, 'now').mockReturnValue(endTimeMs);

      const totalFetched = 100;
      const newProposals = 25;

      const result = calculateCrawlingStats(totalFetched, newProposals, startTime);

      expect(result).toEqual({
        totalFetched: 100,
        newProposals: 25,
        duration: 60000, // 1 minute
        rate: expect.closeTo(1.67, 1), // 100/60
      });

      mock.restore();
    });

    it('should handle zero duration', () => {
      const time = new Date('2023-01-01T00:00:00Z');
      spyOn(Date, 'now').mockReturnValue(time.getTime());

      const result = calculateCrawlingStats(10, 5, time);

      expect(result.duration).toBe(0);
      expect(result.rate).toBe(Infinity); // 10/0

      mock.restore();
    });

    it('should handle zero proposals', () => {
      const startTime = new Date('2023-01-01T00:00:00Z');
      const endTimeMs = new Date('2023-01-01T00:01:00Z').getTime();
      spyOn(Date, 'now').mockReturnValue(endTimeMs);

      const result = calculateCrawlingStats(0, 0, startTime);

      expect(result.totalFetched).toBe(0);
      expect(result.newProposals).toBe(0);
      expect(result.rate).toBe(0);

      mock.restore();
    });

    it('should calculate correct rate', () => {
      const startTime = new Date();
      const endTimeMs = startTime.getTime() + 1000; // 1 second later
      spyOn(Date, 'now').mockReturnValue(endTimeMs);

      const result = calculateCrawlingStats(50, 10, startTime);

      expect(result.rate).toBe(50); // 50 items per second

      mock.restore();
    });
  });

  describe('shouldStopCrawling', () => {
    it('should return true when newest timestamp is older than last crawl', () => {
      const newestTimestamp = 1640995200;
      const lastCrawl = new Date(1641081600 * 1000);

      expect(shouldStopCrawling(newestTimestamp, lastCrawl)).toBe(true);
    });

    it('should return false when newest timestamp is newer than last crawl', () => {
      const newestTimestamp = 1641081600 * 1000; // Convert to milliseconds for comparison
      const lastCrawl = new Date(1640995200 * 1000);

      expect(shouldStopCrawling(newestTimestamp, lastCrawl)).toBe(false);
    });

    it('should return true when timestamps are equal', () => {
      const timestamp = 1641081600;
      const lastCrawl = new Date(timestamp * 1000);

      expect(shouldStopCrawling(timestamp * 1000, lastCrawl)).toBe(true);
    });
  });

  describe('createDefaultCrawlInfo', () => {
    it('should create default crawl info with epoch timestamp', () => {
      const result = createDefaultCrawlInfo();

      expect(result).toEqual({
        lastTimestamp: new Date(0),
      });
    });
  });

  describe('calculatePaginationParams', () => {
    it('should calculate pagination parameters', () => {
      const result = calculatePaginationParams(50, 100, 150);

      expect(result).toEqual({
        skip: 50,
        first: 100,
        hasMore: true,
      });
    });

    it('should handle zero values', () => {
      const result = calculatePaginationParams(0, 0, 0);

      expect(result).toEqual({
        skip: 0,
        first: 0,
        hasMore: true,
      });
    });
  });
});
