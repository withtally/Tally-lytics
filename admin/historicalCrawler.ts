import { EventEmitter } from 'events';
import { RateLimiter } from 'limiter';
import { Logger } from './services/logging';
import { loggerConfig } from './config/loggerConfig';
import { ApiService } from './services/crawler/apiService';
import { DatabaseService } from './services/crawler/databaseService';
import { CrawlerConfig } from './services/crawler/types';
import { forumConfigs } from './config/forumConfig';
import { vectorizeContent } from './services/llm/embeddings/hybridVectorizer';
import db from './db/db';

class HistoricalCrawler extends EventEmitter {
  private apiService: ApiService;
  private dbService: DatabaseService;
  private logger: Logger;
  private rateLimiter: RateLimiter;
  private forumName: string;

  constructor(config: CrawlerConfig) {
    super();
    this.apiService = new ApiService(config.apiConfig, config.forumName);
    this.dbService = new DatabaseService(config.dbConfig);
    this.forumName = config.forumName;
    this.logger = new Logger({
      ...loggerConfig,
      logFile: `logs/${config.forumName}-historical-crawler.log`,
    });
    this.rateLimiter = new RateLimiter({ tokensPerInterval: 5, interval: 'second' });
  }

  private async fetchTopicsByRange(offset: number, _limit: number = 30): Promise<any[]> {
    await this.rateLimiter.removeTokens(1);
    const url = `${this.apiService.config.discourseUrl}/latest.json?no_definitions=true&page=${offset}&order=created`;
    const response = await fetch(url, {
      headers: {
        'Api-Key': this.apiService.config.apiKey,
        'Api-Username': this.apiService.config.apiUsername,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.topic_list.topics || [];
  }

  async crawlHistoricalTopics(): Promise<void> {
    try {
      this.logger.info('Starting historical topic crawl');
      this.emit('start', 'Starting historical topic crawl');

      let offset = 0;
      const batchSize = 30;
      let totalProcessed = 0;
      let hasMore = true;

      while (hasMore) {
        try {
          const topics = await this.fetchTopicsByRange(offset, batchSize);

          if (topics.length === 0) {
            this.logger.info('No more topics found');
            break;
          }

          this.logger.info(`Processing batch of ${topics.length} topics from offset ${offset}`);

          for (const topic of topics) {
            await this.processTopic(topic);
            totalProcessed++;

            if (totalProcessed % 100 === 0) {
              this.logger.info(`Processed ${totalProcessed} topics so far`);
            }
          }

          if (topics.length < batchSize) {
            hasMore = false;
          } else {
            offset++;
            // Add a small delay between batches
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error: any) {
          this.logger.error(`Error processing batch at offset ${offset}:`, error);
          await new Promise(resolve => setTimeout(resolve, 5000)); // Longer delay on error
        }
      }

      this.logger.info(`Historical crawl completed. Processed ${totalProcessed} topics`);
      this.emit('done', `Historical crawl completed. Processed ${totalProcessed} topics`);
    } catch (error: any) {
      this.logger.error('Error during historical crawl:', error);
      this.emit('error', `Error during historical crawl: ${error}`);
      throw error;
    }
  }

  private async processTopic(topicData: any): Promise<void> {
    try {
      // Check if topic exists but don't skip it
      const existingTopic = await db('topics')
        .where({ id: topicData.id, forum_name: this.forumName })
        .first();

      // Always insert/update the topic
      await this.dbService.insertTopic(topicData, this.forumName);

      // Only vectorize if not already done
      if (!existingTopic) {
        await vectorizeContent('topic', topicData.id, this.forumName);
      }

      // Fetch and process all posts for this topic
      const posts = await this.apiService.fetchNewPosts(topicData.id, new Date(0));

      for (const post of posts) {
        // Check if post exists but don't skip it
        const existingPost = await db('posts')
          .where({ id: post.id, forum_name: this.forumName })
          .first();

        await this.dbService.insertPost(post, this.forumName);

        // Only vectorize if not already done
        if (!existingPost) {
          await vectorizeContent('post', post.id, this.forumName);
        }

        // Always process user data
        await this.dbService.insertUser(post, this.forumName);
      }

      this.emit('topicProcessed', `Processed topic ${topicData.id} with ${posts.length} posts`);
    } catch (error: any) {
      this.logger.error(`Error processing topic ${topicData.id}:`, error);
      throw error;
    }
  }
}

async function runHistoricalCrawl(forumName: string): Promise<void> {
  const forumConfig = forumConfigs.find(config => config.name === forumName);
  if (!forumConfig) {
    throw new Error(`Forum configuration not found for ${forumName}`);
  }

  const crawlerConfig: CrawlerConfig = {
    apiConfig: forumConfig.apiConfig,
    logConfig: { level: 'info' },
    forumName: forumConfig.name,
  };

  const crawler = new HistoricalCrawler(crawlerConfig);

  crawler.on('start', message => console.log(message));
  crawler.on('topicProcessed', message => console.log(message));
  crawler.on('error', error => console.error(error));
  crawler.on('done', message => console.log(message));

  await crawler.crawlHistoricalTopics();
}

// Run the script
if (require.main === module) {
  const args = process.argv.slice(2);
  const forumName = args[0];

  if (!forumName) {
    console.error('Please provide a forum name as an argument');
    process.exit(1);
  }

  runHistoricalCrawl(forumName)
    .then(() => {
      console.log('Historical crawl completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Historical crawl failed:', error);
      process.exit(1);
    });
}

export { HistoricalCrawler, runHistoricalCrawl };

export async function crawlHistoricalPosts(_limit?: number) {
  // Implementation of crawlHistoricalPosts function
}
