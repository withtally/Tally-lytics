// db/repositories/TopicRepository.ts - Concrete implementation of ITopicRepository

import type { Knex } from 'knex';
import type { 
  ITopicRepository, 
  Topic, 
  TopicFilter, 
  TopicWithPosts 
} from './ITopicRepository';

export class TopicRepository implements ITopicRepository {
  constructor(private db: Knex) {}

  async find(filter: TopicFilter): Promise<Topic[]> {
    let query = this.db('topics').select('*');

    if (filter.forum_name) {
      query = query.where('forum_name', filter.forum_name);
    }

    if (filter.category_id) {
      query = query.where('category_id', filter.category_id);
    }

    if (filter.has_summary !== undefined) {
      if (filter.has_summary) {
        query = query.whereNotNull('ai_summary');
      } else {
        query = query.whereNull('ai_summary');
      }
    }

    if (filter.created_after) {
      query = query.where('created_at', '>=', filter.created_after);
    }

    if (filter.created_before) {
      query = query.where('created_at', '<=', filter.created_before);
    }

    if (filter.min_posts) {
      query = query.where('posts_count', '>=', filter.min_posts);
    }

    if (filter.max_posts) {
      query = query.where('posts_count', '<=', filter.max_posts);
    }

    return await query.orderBy('created_at', 'desc');
  }

  async findById(id: string): Promise<Topic | null> {
    const result = await this.db('topics').where('id', id).first();
    return result || null;
  }

  async findWithPosts(id: string): Promise<TopicWithPosts | null> {
    const topic = await this.findById(id);
    if (!topic) {
      return null;
    }

    const posts = await this.db('posts')
      .where('topic_id', id)
      .select('id', 'content', 'author', 'created_at', 'post_number')
      .orderBy('post_number', 'asc');

    return {
      ...topic,
      posts,
    };
  }

  async findNeedingSummary(forumName?: string): Promise<Topic[]> {
    let query = this.db('topics')
      .whereNull('ai_summary')
      .where('posts_count', '>', 0); // Only topics with posts

    if (forumName) {
      query = query.where('forum_name', forumName);
    }

    return await query.orderBy('created_at', 'asc');
  }

  async create(topic: Omit<Topic, 'created_at' | 'updated_at'>): Promise<Topic> {
    const now = new Date();
    const newTopic = {
      ...topic,
      created_at: now,
      updated_at: now,
    };

    await this.db('topics').insert(newTopic);
    return newTopic as Topic;
  }

  async update(id: string, updates: Partial<Topic>): Promise<Topic> {
    const updatedData = {
      ...updates,
      updated_at: new Date(),
    };

    await this.db('topics').where('id', id).update(updatedData);
    
    const updatedTopic = await this.findById(id);
    if (!updatedTopic) {
      throw new Error(`Topic with id ${id} not found after update`);
    }
    
    return updatedTopic;
  }

  async updateSummary(id: string, summary: {
    ai_summary: string;
    ai_tags: string[];
    quality_score?: number;
  }): Promise<void> {
    await this.db('topics').where('id', id).update({
      ai_summary: summary.ai_summary,
      ai_tags: JSON.stringify(summary.ai_tags),
      quality_score: summary.quality_score,
      updated_at: new Date(),
    });
  }

  async delete(id: string): Promise<void> {
    await this.db('topics').where('id', id).del();
  }

  async getCountByForum(forumName: string): Promise<number> {
    const result = await this.db('topics')
      .where('forum_name', forumName)
      .count('* as count')
      .first();
    
    return parseInt(result?.count as string) || 0;
  }

  async getRecent(forumName: string, limit: number = 10): Promise<Topic[]> {
    return await this.db('topics')
      .where('forum_name', forumName)
      .orderBy('created_at', 'desc')
      .limit(limit);
  }

  async getPopular(forumName: string, limit: number = 10): Promise<Topic[]> {
    return await this.db('topics')
      .where('forum_name', forumName)
      .orderBy([
        { column: 'like_count', order: 'desc' },
        { column: 'reply_count', order: 'desc' },
        { column: 'views', order: 'desc' },
      ])
      .limit(limit);
  }

  async createMany(topics: Omit<Topic, 'created_at' | 'updated_at'>[]): Promise<Topic[]> {
    const now = new Date();
    const topicsToInsert = topics.map(topic => ({
      ...topic,
      created_at: now,
      updated_at: now,
    }));

    await this.db('topics').insert(topicsToInsert);
    return topicsToInsert as Topic[];
  }

  async updateMany(updates: Array<{ id: string; updates: Partial<Topic> }>): Promise<void> {
    const now = new Date();
    
    // Use transaction for batch updates
    await this.db.transaction(async (trx) => {
      for (const { id, updates: topicUpdates } of updates) {
        await trx('topics').where('id', id).update({
          ...topicUpdates,
          updated_at: now,
        });
      }
    });
  }
}