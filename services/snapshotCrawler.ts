// File: /Users/dennisonbertram/develop/discourse-demo/services/snapshotCrawler.ts

import { SnapshotCrawler } from './snapshot';
import { Logger } from './logging';
import { loggerConfig } from '../config/loggerConfig';

export async function startSnapshotCrawl(
  spaceId: string,
  forumName: string,
  _onProgress?: (processed: number, total: number) => void
): Promise<void> {
  const logger = new Logger({
    ...loggerConfig,
    logFile: `logs/${forumName}-snapshot-crawler.log`,
  });

  const snapshotCrawler = new SnapshotCrawler(spaceId, forumName);

  snapshotCrawler.on('start', message => logger.info(`[${forumName} Snapshot] ${message}`));
  snapshotCrawler.on('info', message => logger.info(`[${forumName} Snapshot] ${message}`));
  snapshotCrawler.on('proposalProcessed', message =>
    logger.info(`[${forumName} Snapshot] ${message}`)
  );
  snapshotCrawler.on('votesProcessed', message =>
    logger.info(`[${forumName} Snapshot] ${message}`)
  );
  snapshotCrawler.on('error', message => logger.error(`[${forumName} Snapshot] ${message}`));
  snapshotCrawler.on('done', message => logger.info(`[${forumName} Snapshot] ${message}`));

  await snapshotCrawler.crawlSnapshotSpace();
}
