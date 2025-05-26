// Comprehensive tests for CrawlerManager

import { expect, test, describe, beforeEach, afterEach } from '@jest/globals';

// Create mock function references
const mockForumCrawlerStart = jest.fn();
const mockForumCrawlerStop = jest.fn();
const mockStartSnapshotCrawl = jest.fn();
const mockStartTallyCrawl = jest.fn();
const mockEvaluateTallyProposals = jest.fn();
const mockEvaluateSnapshotProposals = jest.fn();
const mockFetchAndSummarizeTopics = jest.fn();
const mockEvaluateUnanalyzedTopics = jest.fn();
const mockEvaluateUnanalyzedPostsInBatches = jest.fn();
const mockUpdateCrawlTime = jest.fn();
const mockEvaluateUnevaluatedThreads = jest.fn();
const mockCrawlTokenMarketData = jest.fn();
const mockCrawlNews = jest.fn();
const mockCrawlNewsArticleEvaluations = jest.fn();

// Mock dependencies
jest.mock('../../logging', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

jest.mock('../../../config/forumConfig', () => ({
  forumConfigs: [
    {
      name: 'ARBITRUM',
      apiConfig: { apiKey: 'test-key', apiUsername: 'test-user', discourseUrl: 'https://test.com' },
      snapshotSpaceId: 'arbitrum.eth',
      tallyConfig: { apiKey: 'tally-key', organizationId: 'org-123' },
      tokenConfig: { coingeckoId: 'arbitrum' },
    },
    {
      name: 'COMPOUND',
      apiConfig: {
        apiKey: 'test-key-2',
        apiUsername: 'test-user-2',
        discourseUrl: 'https://compound.com',
      },
    },
    {
      name: 'UNISWAP',
      apiConfig: {
        apiKey: 'test-key-3',
        apiUsername: 'test-user-3',
        discourseUrl: 'https://uniswap.com',
      },
      snapshotSpaceId: 'uniswap.eth',
    },
  ],
}));

jest.mock('../forumCrawler', () => ({
  ForumCrawler: jest.fn().mockImplementation(() => ({
    start: mockForumCrawlerStart,
    stop: mockForumCrawlerStop,
  })),
}));

jest.mock('../../snapshotCrawler', () => ({
  startSnapshotCrawl: mockStartSnapshotCrawl,
}));

jest.mock('../../tallyCrawler', () => ({
  startTallyCrawl: mockStartTallyCrawl,
}));

jest.mock('../../llm/tallyProposalsService', () => ({
  evaluateTallyProposals: mockEvaluateTallyProposals,
}));

jest.mock('../../llm/snapshotProposalsService', () => ({
  evaluateSnapshotProposals: mockEvaluateSnapshotProposals,
}));

jest.mock('../../llm/topicsService', () => ({
  fetchAndSummarizeTopics: mockFetchAndSummarizeTopics,
  evaluateUnanalyzedTopics: mockEvaluateUnanalyzedTopics,
}));

jest.mock('../../llm/postService', () => ({
  evaluateUnanalyzedPostsInBatches: mockEvaluateUnanalyzedPostsInBatches,
}));

jest.mock('../../../utils/dbUtils', () => ({
  updateCrawlTime: mockUpdateCrawlTime,
}));

jest.mock('../../llm/threadEvaluationService', () => ({
  evaluateUnevaluatedThreads: mockEvaluateUnevaluatedThreads,
}));

jest.mock('../../marketCapTracking/tokenMarketDataCrawler', () => ({
  crawlTokenMarketData: mockCrawlTokenMarketData,
}));

jest.mock('../../newsAPICrawler/newsCrawler', () => ({
  crawlNews: mockCrawlNews,
}));

jest.mock('../../newsAPICrawler/newsArticleEvaluationCrawler', () => ({
  crawlNewsArticleEvaluations: mockCrawlNewsArticleEvaluations,
}));

import { CrawlerManager, CrawlStatus } from '../crawlerManager';
import { Logger } from '../../logging';

describe.skip('CrawlerManager', () => {
  let crawlerManager: CrawlerManager;
  let mockLogger: any;
  let mockHeartbeatMonitor: {
    updateHeartbeat: any;
    isStalled: any;
    clear: any;
    getAllStalled: any;
  };

  beforeEach(() => {
    // Create mock logger
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;

    // Create mock heartbeat monitor
    mockHeartbeatMonitor = {
      updateHeartbeat: jest.fn(),
      isStalled: jest.fn(),
      clear: jest.fn(),
      getAllStalled: jest.fn(),
    };

    // Create crawler manager instance
    crawlerManager = new CrawlerManager(mockLoggerHeartbeatMonitor);

    // Clear all mocks
    mockForumCrawlerStart.mockClear();
    mockForumCrawlerStop.mockClear();
    mockStartSnapshotCrawl.mockClear();
    mockStartTallyCrawl.mockClear();
    mockEvaluateTallyProposals.mockClear();
    mockEvaluateSnapshotProposals.mockClear();
    mockFetchAndSummarizeTopics.mockClear();
    mockEvaluateUnanalyzedTopics.mockClear();
    mockEvaluateUnanalyzedPostsInBatches.mockClear();
    mockUpdateCrawlTime.mockClear();
    mockEvaluateUnevaluatedThreads.mockClear();
    mockCrawlTokenMarketData.mockClear();
    mockCrawlNews.mockClear();
    mockCrawlNewsArticleEvaluations.mockClear();
    mockLogger.info.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.error.mockClear();
    mockHeartbeatMonitor.updateHeartbeat.mockClear();
    mockHeartbeatMonitor.isStalled.mockClear();
    mockHeartbeatMonitor.clear.mockClear();
    mockHeartbeatMonitor.getAllStalled.mockClear();
  });

  afterEach(() => {
    // No need to restore mocks in Bun
  });

  describe.skip('initialization', () => {
    test('should initialize with correct forum statuses', () => {
      // When
      const statuses = crawlerManager.getAllStatuses();

      // Then
      expect(statuses).toHaveLength(3);

      const arbitrumStatus = statuses.find(s => s.forumName === 'ARBITRUM');
      expect(arbitrumStatus).toEqual({
        forumName: 'ARBITRUM',
        status: 'idle',
        progress: {
          evaluations: {
            topics: 0,
            posts: 0,
            threads: 0,
          },
        },
      });

      const compoundStatus = statuses.find(s => s.forumName === 'COMPOUND');
      expect(compoundStatus).toEqual({
        forumName: 'COMPOUND',
        status: 'idle',
        progress: {
          evaluations: {
            topics: 0,
            posts: 0,
            threads: 0,
          },
        },
      });

      const uniswapStatus = statuses.find(s => s.forumName === 'UNISWAP');
      expect(uniswapStatus).toEqual({
        forumName: 'UNISWAP',
        status: 'idle',
        progress: {
          evaluations: {
            topics: 0,
            posts: 0,
            threads: 0,
          },
        },
      });
    });

    test('should return individual forum status', () => {
      // When
      const arbitrumStatus = crawlerManager.getStatus('ARBITRUM');
      const nonExistentStatus = crawlerManager.getStatus('NON_EXISTENT');

      // Then
      expect(arbitrumStatus).toBeDefined();
      expect(arbitrumStatus?.forumName).toBe('ARBITRUM');
      expect(arbitrumStatus?.status).toBe('idle');
      expect(nonExistentStatus).toBeUndefined();
    });
  });

  describe.skip('startCrawl', () => {
    beforeEach(() => {
      // Mock all async dependencies to resolve successfully
      mockForumCrawlerStart.mockResolvedValue(undefined);
      mockUpdateCrawlTime.mockResolvedValue(undefined);
      mockCrawlTokenMarketData.mockResolvedValue(undefined);
      mockCrawlNews.mockResolvedValue(undefined);
      mockCrawlNewsArticleEvaluations.mockResolvedValue(undefined);
      mockFetchAndSummarizeTopics.mockResolvedValue(undefined);
      mockEvaluateUnanalyzedTopics.mockResolvedValue(undefined);
      mockEvaluateUnanalyzedPostsInBatches.mockResolvedValue(undefined);
      mockEvaluateUnevaluatedThreads.mockResolvedValue(undefined);
      mockStartSnapshotCrawl.mockResolvedValue(undefined);
      mockEvaluateSnapshotProposals.mockResolvedValue(undefined);
      mockStartTallyCrawl.mockResolvedValue(undefined);
      mockEvaluateTallyProposals.mockResolvedValue(undefined);
      mockForumCrawlerStop.mockResolvedValue(undefined);
    });

    test('should start crawl for forum with full configuration successfully', async () => {
      // Given
      const forumName = 'ARBITRUM';

      // When
      await crawlerManager.startCrawl(forumName);

      // Then
      const status = crawlerManager.getStatus(forumName);
      expect(status?.status).toBe('completed');
      expect(status?.startTime).toBeDefined();
      expect(status?.endTime).toBeDefined();
      expect(status?.lastError).toBeUndefined();

      // Verify all crawling steps were executed
      expect(mockForumCrawlerStart).toHaveBeenCalledTimes(1);
      expect(mockUpdateCrawlTime).toHaveBeenCalledWith(forumName);
      expect(mockCrawlTokenMarketData).toHaveBeenCalledTimes(1);
      expect(mockCrawlNews).toHaveBeenCalledTimes(1);
      expect(mockCrawlNewsArticleEvaluations).toHaveBeenCalledTimes(1);
      expect(mockFetchAndSummarizeTopics).toHaveBeenCalledWith(forumName);
      expect(mockEvaluateUnanalyzedTopics).toHaveBeenCalledWith(forumName);
      expect(mockEvaluateUnanalyzedPostsInBatches).toHaveBeenCalledWith(forumName);
      expect(mockEvaluateUnevaluatedThreads).toHaveBeenCalledWith(forumName);
      expect(mockStartSnapshotCrawl).toHaveBeenCalledWith('arbitrum.eth', forumName);
      expect(mockEvaluateSnapshotProposals).toHaveBeenCalledWith(forumName);
      expect(mockStartTallyCrawl).toHaveBeenCalledWith('tally-key', 'org-123', forumName);
      expect(mockEvaluateTallyProposals).toHaveBeenCalledWith(forumName);

      // Verify heartbeat monitor was cleared
      expect(mockHeartbeatMonitor.clear).toHaveBeenCalledWith(forumName);

      // Verify cleanup
      expect(mockForumCrawlerStop).toHaveBeenCalledTimes(1);
    });

    test('should start crawl for forum with minimal configuration', async () => {
      // Given
      const forumName = 'COMPOUND'; // No snapshot, tally, or token config

      // When
      await crawlerManager.startCrawl(forumName);

      // Then
      const status = crawlerManager.getStatus(forumName);
      expect(status?.status).toBe('completed');

      // Verify basic crawling steps were executed
      expect(mockForumCrawlerStart).toHaveBeenCalledTimes(1);
      expect(mockUpdateCrawlTime).toHaveBeenCalledWith(forumName);
      expect(mockFetchAndSummarizeTopics).toHaveBeenCalledWith(forumName);
      expect(mockEvaluateUnanalyzedTopics).toHaveBeenCalledWith(forumName);
      expect(mockEvaluateUnanalyzedPostsInBatches).toHaveBeenCalledWith(forumName);
      expect(mockEvaluateUnevaluatedThreads).toHaveBeenCalledWith(forumName);

      // Verify optional services were not called
      expect(mockCrawlTokenMarketData).not.toHaveBeenCalled();
      expect(mockStartSnapshotCrawl).not.toHaveBeenCalled();
      expect(mockEvaluateSnapshotProposals).not.toHaveBeenCalled();
      expect(mockStartTallyCrawl).not.toHaveBeenCalled();
      expect(mockEvaluateTallyProposals).not.toHaveBeenCalled();
    });

    test('should throw error for non-existent forum', async () => {
      // When & Then
      await expect(crawlerManager.startCrawl('NON_EXISTENT')).rejects.toThrow(
        'Forum configuration not found for NON_EXISTENT'
      );
    });

    test('should throw error when crawl already in progress', async () => {
      // Given
      const forumName = 'ARBITRUM';
      mockForumCrawlerStart.mockImplementation(() => new Promise(() => {})); // Never resolves

      // Start first crawl (don't await)
      const firstCrawlPromise = crawlerManager.startCrawl(forumName);

      // When & Then
      await expect(crawlerManager.startCrawl(forumName)).rejects.toThrow(
        'Crawl already in progress for ARBITRUM'
      );

      // Cleanup - resolve the hanging promise
      mockForumCrawlerStart.mockResolvedValue(undefined);
    });

    test('should handle forum crawler errors and update status', async () => {
      // Given
      const forumName = 'ARBITRUM';
      const error = new Error('Forum crawler failed');
      mockForumCrawlerStart.mockRejectedValue(error);

      // When & Then
      await expect(crawlerManager.startCrawl(forumName)).rejects.toThrow('Forum crawler failed');

      const status = crawlerManager.getStatus(forumName);
      expect(status?.status).toBe('failed');
      expect(status?.lastError).toBe('Forum crawler failed');
      expect(status?.endTime).toBeDefined();

      // Verify cleanup still happens
      expect(mockForumCrawlerStop).toHaveBeenCalledTimes(1);
    });

    test('should handle token market data errors and continue', async () => {
      // Given
      const forumName = 'ARBITRUM';
      mockCrawlTokenMarketData.mockRejectedValue(new Error('Token data failed'));

      // When
      await crawlerManager.startCrawl(forumName);

      // Then
      const status = crawlerManager.getStatus(forumName);
      expect(status?.status).toBe('completed'); // Should still complete

      // Verify error was logged
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error during token market data crawl for ARBITRUM:',
        expect.any(Error)
      );

      // Verify other steps still executed
      expect(mockFetchAndSummarizeTopics).toHaveBeenCalledWith(forumName);
    });

    test('should handle news crawl errors and continue', async () => {
      // Given
      const forumName = 'ARBITRUM';
      mockCrawlNews.mockRejectedValue(new Error('News crawl failed'));

      // When
      await crawlerManager.startCrawl(forumName);

      // Then
      const status = crawlerManager.getStatus(forumName);
      expect(status?.status).toBe('completed'); // Should still complete

      // Verify error was logged
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error during news crawl for ARBITRUM:',
        expect.any(Error)
      );

      // Verify other steps still executed
      expect(mockFetchAndSummarizeTopics).toHaveBeenCalledWith(forumName);
    });

    test('should handle content processing errors', async () => {
      // Given
      const forumName = 'ARBITRUM';
      mockFetchAndSummarizeTopics.mockRejectedValue(new Error('Topic processing failed'));

      // When & Then
      await expect(crawlerManager.startCrawl(forumName)).rejects.toThrow('Topic processing failed');

      const status = crawlerManager.getStatus(forumName);
      expect(status?.status).toBe('failed');
      expect(status?.lastError).toBe('Topic processing failed');
    });

    test('should update progress during evaluation steps', async () => {
      // Given
      const forumName = 'ARBITRUM';

      // When
      await crawlerManager.startCrawl(forumName);

      // Then
      const status = crawlerManager.getStatus(forumName);
      expect(status?.progress.evaluations?.topics).toBeGreaterThan(0);
      expect(status?.progress.evaluations?.posts).toBeGreaterThan(0);
      expect(status?.progress.evaluations?.threads).toBeGreaterThan(0);
    });

    test('should handle snapshot crawl for configured forums', async () => {
      // Given
      const forumName = 'UNISWAP'; // Has snapshot config but no tally

      // When
      await crawlerManager.startCrawl(forumName);

      // Then
      expect(mockStartSnapshotCrawl).toHaveBeenCalledWith('uniswap.eth', forumName);
      expect(mockEvaluateSnapshotProposals).toHaveBeenCalledWith(forumName);

      // Should not call tally services
      expect(mockStartTallyCrawl).not.toHaveBeenCalled();
      expect(mockEvaluateTallyProposals).not.toHaveBeenCalled();
    });

    test('should handle non-Error exceptions', async () => {
      // Given
      const forumName = 'ARBITRUM';
      mockForumCrawlerStart.mockRejectedValue('String error');

      // When & Then
      await expect(crawlerManager.startCrawl(forumName)).rejects.toBe('String error');

      const status = crawlerManager.getStatus(forumName);
      expect(status?.status).toBe('failed');
      expect(status?.lastError).toBe('Unknown error');
    });
  });

  describe.skip('stopCrawl', () => {
    beforeEach(() => {
      mockForumCrawlerStart.mockImplementation(() => new Promise(() => {})); // Never resolves
      mockForumCrawlerStop.mockResolvedValue(undefined);
    });

    test('should stop active crawl successfully', async () => {
      // Given
      const forumName = 'ARBITRUM';

      // Start a crawl (don't await)
      const crawlPromise = crawlerManager.startCrawl(forumName);

      // Verify crawl is running
      expect(crawlerManager.getStatus(forumName)?.status).toBe('running');

      // When
      await crawlerManager.stopCrawl(forumName);

      // Then
      const status = crawlerManager.getStatus(forumName);
      expect(status?.status).toBe('idle');
      expect(status?.lastError).toBe('Crawl stopped by user');
      expect(status?.endTime).toBeDefined();

      // Verify heartbeat monitor was cleared
      expect(mockHeartbeatMonitor.clear).toHaveBeenCalledWith(forumName);

      // Verify crawler was stopped
      expect(mockForumCrawlerStop).toHaveBeenCalledTimes(1);

      // Verify logger message
      expect(mockLogger.info).toHaveBeenCalledWith('Crawl stopped for ARBITRUM');
    });

    test('should throw error when no active crawl exists', async () => {
      // When & Then
      await expect(crawlerManager.stopCrawl('ARBITRUM')).rejects.toThrow(
        'No active crawl found for ARBITRUM'
      );
    });

    test('should handle crawler stop errors', async () => {
      // Given
      const forumName = 'ARBITRUM';

      // Start a crawl
      const crawlPromise = crawlerManager.startCrawl(forumName);

      // Mock stop to fail
      mockForumCrawlerStop.mockRejectedValue(new Error('Stop failed'));

      // When & Then
      await expect(crawlerManager.stopCrawl(forumName)).rejects.toThrow('Stop failed');
    });
  });

  describe.skip('status updates and logging', () => {
    test('should log status updates when crawl progresses', async () => {
      // Given
      const forumName = 'COMPOUND';
      mockForumCrawlerStart.mockResolvedValue(undefined);
      mockUpdateCrawlTime.mockResolvedValue(undefined);
      mockFetchAndSummarizeTopics.mockResolvedValue(undefined);
      mockEvaluateUnanalyzedTopics.mockResolvedValue(undefined);
      mockEvaluateUnanalyzedPostsInBatches.mockResolvedValue(undefined);
      mockEvaluateUnevaluatedThreads.mockResolvedValue(undefined);
      mockForumCrawlerStop.mockResolvedValue(undefined);

      // When
      await crawlerManager.startCrawl(forumName);

      // Then
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Crawler status updated for ${forumName}`,
        expect.objectContaining({
          status: expect.any(Object),
        })
      );

      expect(mockLogger.info).toHaveBeenCalledWith(`Starting content processing for ${forumName}`);
      expect(mockLogger.info).toHaveBeenCalledWith(`Starting topic summarization for ${forumName}`);
      expect(mockLogger.info).toHaveBeenCalledWith(`Starting topic evaluation for ${forumName}`);
      expect(mockLogger.info).toHaveBeenCalledWith(`Starting post evaluation for ${forumName}`);
      expect(mockLogger.info).toHaveBeenCalledWith(`Content processing completed for ${forumName}`);
      expect(mockLogger.info).toHaveBeenCalledWith(`Starting thread evaluation for ${forumName}`);
      expect(mockLogger.info).toHaveBeenCalledWith(`Crawl completed successfully for ${forumName}`);
    });
  });

  describe.skip('edge cases and integration', () => {
    test('should handle multiple simultaneous crawls for different forums', async () => {
      // Given
      mockForumCrawlerStart.mockResolvedValue(undefined);
      mockUpdateCrawlTime.mockResolvedValue(undefined);
      mockFetchAndSummarizeTopics.mockResolvedValue(undefined);
      mockEvaluateUnanalyzedTopics.mockResolvedValue(undefined);
      mockEvaluateUnanalyzedPostsInBatches.mockResolvedValue(undefined);
      mockEvaluateUnevaluatedThreads.mockResolvedValue(undefined);
      mockForumCrawlerStop.mockResolvedValue(undefined);

      // When
      const crawlPromises = [
        crawlerManager.startCrawl('ARBITRUM'),
        crawlerManager.startCrawl('COMPOUND'),
        crawlerManager.startCrawl('UNISWAP'),
      ];

      await Promise.all(crawlPromises);

      // Then
      expect(crawlerManager.getStatus('ARBITRUM')?.status).toBe('completed');
      expect(crawlerManager.getStatus('COMPOUND')?.status).toBe('completed');
      expect(crawlerManager.getStatus('UNISWAP')?.status).toBe('completed');

      // Verify each crawler was called
      expect(mockForumCrawlerStart).toHaveBeenCalledTimes(3);
    });

    test('should maintain status consistency during concurrent operations', async () => {
      // Given
      const forumName = 'ARBITRUM';

      // When
      const statuses1 = crawlerManager.getAllStatuses();
      const status1 = crawlerManager.getStatus(forumName);

      // Then
      expect(statuses1.find(s => s.forumName === forumName)).toEqual(status1);
      expect(status1?.forumName).toBe(forumName);
    });
  });
});
