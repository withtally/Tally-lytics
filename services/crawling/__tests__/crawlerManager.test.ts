// services/crawling/__tests__/crawlerManager.test.ts

import { describe, it, expect } from '@jest/globals';
import { CrawlerManager, CrawlStatus } from '../crawlerManager';

describe('CrawlerManager', () => {
  it('should export CrawlerManager as a constructor', () => {
    expect(CrawlerManager).toBeDefined();
    expect(typeof CrawlerManager).toBe('function');
  });

  it('should export CrawlStatus enum', () => {
    expect(CrawlStatus).toBeDefined();
    expect(CrawlStatus.IDLE).toBe('idle');
    expect(CrawlStatus.RUNNING).toBe('running');
    expect(CrawlStatus.COMPLETED).toBe('completed');
    expect(CrawlStatus.FAILED).toBe('failed');
  });

  it('should have a constructor that accepts logger and heartbeat monitor', () => {
    expect(CrawlerManager.length).toBe(2);
  });

  it('should have required crawler management methods', () => {
    // Create mock logger and heartbeat monitor
    const mockLogger = {
      info: () => {},
      warn: () => {},
      error: () => {},
    };

    const mockHeartbeatMonitor = {
      updateHeartbeat: () => {},
      isStalled: () => false,
      clear: () => {},
      getAllStalled: () => [],
    };

    const instance = new CrawlerManager(mockLogger as any, mockHeartbeatMonitor as any);

    expect(typeof instance.startCrawl).toBe('function');
    expect(typeof instance.stopCrawl).toBe('function');
    expect(typeof instance.getStatus).toBe('function');
    expect(typeof instance.getAllStatuses).toBe('function');
  });

  it('should have startCrawl method with 1 parameter', () => {
    const mockLogger = {
      info: () => {},
      warn: () => {},
      error: () => {},
    };

    const mockHeartbeatMonitor = {
      updateHeartbeat: () => {},
      isStalled: () => false,
      clear: () => {},
      getAllStalled: () => [],
    };

    const instance = new CrawlerManager(mockLogger as any, mockHeartbeatMonitor as any);
    expect(instance.startCrawl.length).toBe(1);
  });

  it('should have stopCrawl method with 1 parameter', () => {
    const mockLogger = {
      info: () => {},
      warn: () => {},
      error: () => {},
    };

    const mockHeartbeatMonitor = {
      updateHeartbeat: () => {},
      isStalled: () => false,
      clear: () => {},
      getAllStalled: () => [],
    };

    const instance = new CrawlerManager(mockLogger as any, mockHeartbeatMonitor as any);
    expect(instance.stopCrawl.length).toBe(1);
  });

  it('should have getStatus method with 1 parameter', () => {
    const mockLogger = {
      info: () => {},
      warn: () => {},
      error: () => {},
    };

    const mockHeartbeatMonitor = {
      updateHeartbeat: () => {},
      isStalled: () => false,
      clear: () => {},
      getAllStalled: () => [],
    };

    const instance = new CrawlerManager(mockLogger as any, mockHeartbeatMonitor as any);
    expect(instance.getStatus.length).toBe(1);
  });

  it('should have getAllStatuses method with no parameters', () => {
    const mockLogger = {
      info: () => {},
      warn: () => {},
      error: () => {},
    };

    const mockHeartbeatMonitor = {
      updateHeartbeat: () => {},
      isStalled: () => false,
      clear: () => {},
      getAllStalled: () => [],
    };

    const instance = new CrawlerManager(mockLogger as any, mockHeartbeatMonitor as any);
    expect(instance.getAllStatuses.length).toBe(0);
  });
});
