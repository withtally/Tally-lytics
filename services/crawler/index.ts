import { EventEmitter } from 'events';
import { CrawlerConfig } from './types';
import { ApiService } from './apiService';
import { DatabaseService } from './databaseService';
import { Logger } from '../logging';
import { loggerConfig } from '../../config/loggerConfig';
import { vectorizeContent } from '../llm/embeddings/hybridVectorizer';

export class Crawler {
  private apiService: ApiService;
  private dbService: DatabaseService;
  private logger: Logger;
  private emitter: EventEmitter;
  private forumName: string;

  constructor(config: CrawlerConfig) {
    this.apiService = new ApiService(config.apiConfig, config.forumName);
    this.dbService = new DatabaseService(config.dbConfig);
    this.emitter = new EventEmitter();
    this.forumName = config.forumName;
    this.logger = new Logger({
      ...loggerConfig,
      logFile: `logs/${config.forumName}-crawler.log`,
    });
  }

  // Shared method for processing users
  private async processUser(username: string, basicUserData: any): Promise<void> {
    try {
      // Fetch detailed user information
      const userDetails = await this.apiService.fetchUserDetails(username);

      console.log('Fetched user details:', {
        username,
        avatar: userDetails?.user?.avatar_template,
        id: userDetails?.user?.id,
      });

      if (userDetails && userDetails.user) {
        await this.dbService.insertUser(
          {
            ...userDetails.user,
            user_id: userDetails.user.id,
          },
          this.forumName
        );
        this.logger.info(`Inserted/updated user: ${username} (User ID: ${userDetails.user.id})`);
      } else {
        this.logger.warn(`Could not fetch user details for ${username}`);
        // Fall back to basic user info
        await this.dbService.insertUser(basicUserData, this.forumName);
      }
    } catch (error: any) {
      this.logger.error(`Error processing user ${username}: ${error}`);
      throw error;
    }
  }

  async crawlLatestTopics(): Promise<void> {
    try {
      this.logger.info('Starting to crawl latest topics...');
      this.emitter.emit('start', 'Starting to crawl latest topics...');

      const startTime = await this.getStartTime();
      const topics = await this.apiService.fetchNewTopics(startTime); // TEMPORARY
      /// TEMP

      this.logger.info(`Fetched ${topics.length} new topics from the forum.`);
      this.emitter.emit('info', `Fetched ${topics.length} new topics from the forum.`);

      for (const topic of topics) {
        await this.processTopic(topic, startTime);
      }

      this.logger.info('Crawling completed successfully!');
      this.emitter.emit('done', 'Crawling completed successfully!');
    } catch (error: any) {
      this.handleError(error as Error);
    }
  }

  private async getStartTime(): Promise<Date> {
    const latestTopicTimestamp = await this.dbService.getLatestTopicTimestamp(this.forumName);
    const latestPostTimestamp = await this.dbService.getLatestPostTimestamp(this.forumName);
    return new Date(
      Math.max(latestTopicTimestamp?.getTime() || 0, latestPostTimestamp?.getTime() || 0)
    );
  }

  private async processTopic(topicData: any, startTime: Date): Promise<void> {
    this.logger.info(`Processing topic: ${topicData.title} (ID: ${topicData.id})`);
    this.emitter.emit('topic', `Processing topic: ${topicData.title} (ID: ${topicData.id})`);

    // No need to map fields here since we're handling it in insertTopic
    await this.dbService.insertTopic(topicData, this.forumName);

    const posts = await this.apiService.fetchNewPosts(topicData.id, startTime);
    this.logger.info(`Found ${posts.length} new posts for topic: ${topicData.title}`);
    this.emitter.emit('info', `Found ${posts.length} new posts for topic: ${topicData.title}`);

    // do vectorization here
    await this.dbService.insertTopic(topicData, this.forumName);
    await vectorizeContent('topic', topicData.id, this.forumName);

    for (const post of posts) {
      await this.processPost(post);
    }
  }

  private async processPost(post: any): Promise<void> {
    await this.dbService.insertPost(post, this.forumName);
    this.logger.info(`Inserted post by ${post.username} (Post ID: ${post.id})`);
    this.emitter.emit('postProcessed', `Inserted post by ${post.username} (Post ID: ${post.id})`);

    await this.dbService.insertUser(post, this.forumName);
    this.logger.info(`Inserted/updated user: ${post.username} (User ID: ${post.user_id})`);
    this.emitter.emit(
      'userProcessed',
      `Inserted/updated user: ${post.username} (User ID: ${post.user_id})`
    );

    // do vectorization here
    await this.dbService.insertPost(post, this.forumName);

    // Vectorize the post after it has been inserted
    await vectorizeContent('post', post.id, this.forumName);
  }

  private handleError(error: Error): void {
    this.logger.error(`Error during crawling: ${error.message}`);
    this.emitter.emit('error', `Error during crawling: ${error.message}`);
  }

  public on(event: string, listener: (...args: any[]) => void): void {
    this.emitter.on(event, listener);
  }
}
