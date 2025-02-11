// Modified app.ts
import dotenv from 'dotenv';
import { Logger } from './services/logging';
import { CrawlerManager } from './services/crawling/crawlerManager';

if (process.env.NODE_ENV === 'production') {
  dotenv.config({ path: '.env.production' });
} else {
  dotenv.config();
}

const logger = new Logger({
  logFile: 'logs/crawler.log',
  level: 'info',
});

export const crawlerManager = new CrawlerManager(logger);
