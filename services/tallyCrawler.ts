// File: /Users/dennisonbertram/develop/discourse-demo/services/tallyCrawler.ts

import { TallyCrawler } from './tally/index';
import { TallyProposalUpdater } from './tally/proposalUpdater'; // Import the new class
import { CrawlerConfig } from './tally/types';
import config from '../knexfile';

import { Logger } from './logging';
import { loggerConfig } from '../config/loggerConfig';

export async function startTallyCrawl(
  apiKey: string,
  organizationId: string,
  forumName: string,
  _onProgress?: (processed: number, total: number) => void
): Promise<void> {
  const logger = new Logger({
    ...loggerConfig,
    logFile: `logs/${forumName}-tally-crawler.log`,
  });

  const crawlerConfig: CrawlerConfig = {
    apiConfig: {
      apiKey: apiKey,
      apiUrl: 'https://api.tally.xyz/query',
    },
    dbConfig: config.development,
    logConfig: { level: 'info' },
    organizationId: organizationId,
  };

  const tallyCrawler = new TallyCrawler(crawlerConfig);

  tallyCrawler.on('start', message => logger.info(`[Tally Crawler] ${message}`));
  tallyCrawler.on('info', message => logger.info(`[Tally Crawler] ${message}`));
  tallyCrawler.on('proposal', message => logger.info(`[Tally Crawler] ${message}`));
  tallyCrawler.on('proposalProcessed', message => logger.info(`[Tally Crawler] ${message}`));
  tallyCrawler.on('error', message => logger.error(`[Tally Crawler] ${message}`));
  tallyCrawler.on('done', message => logger.info(`[Tally Crawler] ${message}`));

  await tallyCrawler.crawlProposals(forumName);
}

// New function to start the proposal updater
export async function startTallyProposalUpdater(
  apiKey: string,
  organizationId: string,
  forumName: string
): Promise<void> {
  const logger = new Logger({
    ...loggerConfig,
    logFile: `logs/${forumName}-tally-proposal-updater.log`,
  });

  const crawlerConfig: CrawlerConfig = {
    apiConfig: {
      apiKey: apiKey,
      apiUrl: 'https://api.tally.xyz/query',
    },
    dbConfig: config.development,
    logConfig: { level: 'info' },
    organizationId: organizationId,
  };

  const proposalUpdater = new TallyProposalUpdater(crawlerConfig);

  proposalUpdater.on('start', message => logger.info(`[Tally Proposal Updater] ${message}`));
  proposalUpdater.on('proposalUpdated', message =>
    logger.info(`[Tally Proposal Updater] ${message}`)
  );
  proposalUpdater.on('error', message => logger.error(`[Tally Proposal Updater] ${message}`));
  proposalUpdater.on('done', message => logger.info(`[Tally Proposal Updater] ${message}`));

  await proposalUpdater.updateNonFinalStateProposals(forumName);
}
