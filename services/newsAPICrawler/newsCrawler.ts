import db from '../../db/db';
import fetch from 'node-fetch';
import { Logger } from '../logging';
import { loggerConfig } from '../../config/loggerConfig';
import { forumConfigs } from '../../config/forumConfig';
import { RateLimiter } from 'limiter';

const logger = new Logger({
  ...loggerConfig,
  logFile: 'logs/news-crawler.log',
});

const limiter = new RateLimiter({ tokensPerInterval: 1, interval: 2000 });
const NEWS_API_KEY = process.env.NEWS_API_KEY;
if (!NEWS_API_KEY) {
  throw new Error('Missing NEWS_API_KEY in environment variables');
}

// Basic fetch with retry logic
async function fetchWithRetry(
  url: string,
  options: any,
  retries = 3,
  backoff = 2000
): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status} - ${response.statusText}: ${text}`);
      }
      return response.json();
    } catch (error: any) {
      logger.warn(`Fetch attempt ${attempt} failed for ${url}: ${error.message}`);
      if (attempt < retries) {
        await new Promise(res => setTimeout(res, backoff * attempt));
      } else {
        throw error;
      }
    }
  }
}

function buildQuery(daoName: string): string {
  const daoTerm = `"${daoName}"`;
  const includedTerms =
    '(DAO OR governance OR crypto OR token OR protocol OR ethereum OR blockchain)';
  const excludedTerms =
    '(rental OR flight OR airline OR property OR cruise OR vacation OR cooking OR food OR gardening OR bank)';
  return `${daoTerm} AND ${includedTerms} NOT ${excludedTerms}`;
}

async function fetchArticlesForDAO(daoName: string) {
  const q = buildQuery(daoName);
  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&searchIn=title,description&sortBy=relevancy&apiKey=${NEWS_API_KEY}`;

  await limiter.removeTokens(1);
  const data = await fetchWithRetry(url, { headers: { accept: 'application/json' } });
  if (data.status !== 'ok') {
    throw new Error(`NewsAPI returned error status: ${data.status} - ${data.message}`);
  }

  const articles = data.articles || [];
  if (articles.length === 0) {
    logger.info(`No articles found for ${daoName} with query: ${q}`);
    return;
  }

  let insertedCount = 0;

  for (const article of articles) {
    const record = {
      forum_name: daoName,
      source_id: article.source?.id || null,
      source_name: article.source?.name || null,
      author: article.author || null,
      title: article.title || null,
      description: article.description || null,
      url: article.url,
      url_to_image: article.urlToImage || null,
      published_at: article.publishedAt ? new Date(article.publishedAt) : null,
      content: article.content || null,
    };

    try {
      await db('news_articles').insert(record).onConflict(['forum_name', 'url']).merge();
      insertedCount++;
    } catch (error: any) {
      logger.error(`Error inserting article for ${daoName}: ${error.message}`);
      // If one fails, log and continue to the next one
      continue;
    }
  }

  logger.info(`Inserted/updated articles for ${daoName}. Count: ${insertedCount}`);
}

export async function crawlNewsForForum(forumName: string): Promise<void> {
  logger.info(`Starting news crawl for ${forumName}...`);

  try {
    await fetchArticlesForDAO(forumName);
    logger.info(`News crawl completed for ${forumName}.`);
  } catch (error: any) {
    logger.error(`Failed to fetch articles for ${forumName}: ${error.message}`);
    throw error;
  }
}

export async function crawlNews(): Promise<void> {
  logger.info('Starting news crawl...');

  const args = process.argv.slice(2);
  let daosToCrawl: string[] = [];

  if (args.length === 0) {
    // If no DAO passed, use all from forumConfigs
    daosToCrawl = forumConfigs.filter(cfg => cfg.name).map(cfg => cfg.name);
  } else {
    daosToCrawl = [args[0]];
  }

  for (const daoName of daosToCrawl) {
    logger.info(`Fetching articles for DAO: ${daoName}`);
    try {
      await fetchArticlesForDAO(daoName);
    } catch (error: any) {
      logger.error(`Failed to fetch articles for ${daoName}: ${error.message}`);
    }
  }

  logger.info('News crawl completed.');
}

// If run standalone
if (require.main === module) {
  crawlNews()
    .then(() => {
      logger.info('Standalone news crawl finished.');
      process.exit(0);
    })
    .catch(err => {
      logger.error(`Standalone run failed: ${err.message}`);
      process.exit(1);
    });
}
