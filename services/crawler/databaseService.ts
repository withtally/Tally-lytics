// File: /Users/dennisonbertram/develop/discourse-demo/services/crawler/databaseService.ts

import { Knex } from 'knex';
import { htmlToText } from 'html-to-text';
import userService from '../user/userService';
import { Logger } from '../logging';
import { loggerConfig } from '../../config/loggerConfig';
import db from '../../db/db';

interface Post {
  id: number;
  topic_id: number;
  username: string;
  cooked: string;
  created_at: string;
  updated_at: string;
}

export class DatabaseService {
  private db: Knex;
  private logger: Logger;

  constructor(private _config: any) {
    this.db = db;

    this.db
      .raw('SELECT 1')
      .then(() => {
        this.logger.info('Database connection established successfully');
      })
      .catch(error => {
        this.logger.error('Database connection failed:', error);
        throw error;
      });

    this.logger = new Logger({
      ...loggerConfig,
      logFile: 'logs/user-service.log',
    });
  }

  async getLatestTopicTimestamp(forumName: string): Promise<Date | null> {
    const result = await this.db('topics')
      .where({ forum_name: forumName })
      .max('created_at as latest_timestamp')
      .first();
    return result ? new Date(result.latest_timestamp) : null;
  }

  async getLatestPostTimestamp(forumName: string): Promise<Date | null> {
    const result = await this.db('posts')
      .where({ forum_name: forumName })
      .max('created_at as latest_timestamp')
      .first();
    return result ? new Date(result.latest_timestamp) : null;
  }

  async insertPost(post: Post, forumName: string): Promise<void> {
    await this.db('posts')
      .insert({
        id: post.id,
        forum_name: forumName,
        topic_id: post.topic_id,
        username: post.username,
        plain_text: htmlToText(post.cooked, { wordwrap: 130 }),
        cooked: post.cooked,
        created_at: post.created_at,
        updated_at: post.updated_at || post.created_at,
      })
      .onConflict(['id', 'forum_name'])
      .merge();
  }

  async insertTopic(topic: any, forumName: string): Promise<void> {
    const updatedAt =
      topic.updated_at || topic.last_posted_at || topic.bumped_at || topic.created_at;

    await this.db('topics')
      .insert({
        id: topic.id,
        forum_name: forumName,
        title: topic.title,
        slug: topic.slug,
        posts_count: topic.posts_count,
        reply_count: topic.reply_count,
        created_at: topic.created_at,
        updated_at: updatedAt,
      })
      .onConflict(['id', 'forum_name'])
      .merge();
  }

  async insertUser(user: any, forumName: string): Promise<void> {
    try {
      await userService.upsertUser(
        {
          id: user.user_id,
          username: user.username,
          name: user.name,
          avatar_template: user.avatar_template,
          created_at: user.created_at,
          updated_at: user.updated_at || user.created_at,
          last_seen_at: user.last_seen_at,
          website: user.website,
          location: user.location,
          bio: user.bio_raw,
          moderator: user.moderator,
          admin: user.admin,
        },
        forumName
      );
    } catch (error: any) {
      this.logger.error(`Failed to insert user ${user.username}:`, error);
      throw error;
    }
  }
}
