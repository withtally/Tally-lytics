// services/crawling/forumCrawler.ts

import { EventEmitter } from 'events';
import { Crawler } from '../crawler/index';
import { CrawlerConfig } from '../crawler/types';
import { ForumConfig } from '../../config/forumConfig';
import { Logger } from '../logging';
import { loggerConfig } from '../../config/loggerConfig';
/**
 * ForumCrawler is responsible solely for crawling forum data and storing it.
 * It does not handle evaluation or processing of the data.
 */

export class ForumCrawler extends EventEmitter {
  private crawler: Crawler;
  private logger: Logger;
  private lastActivityTimestamp: number;
  private readonly TIMEOUT_THRESHOLD = 5 * 60 * 1000; // 5 minutes
  private healthCheck: NodeJS.Timer | null = null;

  constructor(private forumConfig: ForumConfig) {
    super();

    const crawlerConfig: CrawlerConfig = {
      apiConfig: forumConfig.apiConfig,
      logConfig: { level: 'info' },
      forumName: forumConfig.name,
    };

    this.crawler = new Crawler(crawlerConfig);
    this.logger = new Logger({
      ...loggerConfig,
      logFile: `logs/${forumConfig.name}-forum-crawler.log`,
    });
    this.lastActivityTimestamp = Date.now();

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.crawler.on('start', (message: string) => {
      this.lastActivityTimestamp = Date.now();
      this.logger.info(`[${this.forumConfig.name}] ${message}`);
      this.emit('start', message);
    });

    this.crawler.on('topic', (message: string) => {
      this.lastActivityTimestamp = Date.now();
      this.logger.info(`[${this.forumConfig.name}] ${message}`);
      this.emit('topic', message);
    });

    this.crawler.on('postProcessed', (message: string) => {
      this.lastActivityTimestamp = Date.now();
      this.logger.info(`[${this.forumConfig.name}] ${message}`);
      this.emit('postProcessed', message);
    });

    this.crawler.on('error', (error: string) => {
      this.lastActivityTimestamp = Date.now();
      this.logger.error(`[${this.forumConfig.name}] ${error}`);
      this.emit('error', error);
    });

    this.crawler.on('done', (message: string) => {
      this.lastActivityTimestamp = Date.now();
      this.logger.info(`[${this.forumConfig.name}] ${message}`);
      this.emit('done', message);
    });
  }

  private startHealthCheck(): void {
    this.healthCheck = setInterval(() => {
      const timeSinceLastActivity = Date.now() - this.lastActivityTimestamp;
      if (timeSinceLastActivity > this.TIMEOUT_THRESHOLD) {
        this.logger.warn(
          `No activity detected for ${timeSinceLastActivity / 1000}s in ${this.forumConfig.name} crawler`
        );
      }
    }, 60000);
  }

  public async start(): Promise<void> {
    try {
      this.startHealthCheck();
      await this.crawler.crawlLatestTopics();
    } catch (error: any) {
      this.logger.error(`[${this.forumConfig.name}] Critical error in forum crawling:`, error);
      throw error;
    } finally {
      if (this.healthCheck) {
        clearInterval(this.healthCheck);
      }
    }
  }

  public async stop(): Promise<void> {
    if (this.healthCheck) {
      clearInterval(this.healthCheck);
    }
    // Add any cleanup or stop logic for the crawler here
    this.emit('stopped', `Crawler stopped for ${this.forumConfig.name}`);
  }
}
