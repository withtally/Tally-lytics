// db/repositories/PostRepository.ts - Concrete implementation of IPostRepository

import type { Knex } from 'knex';
import type {
  IPostRepository,
  Post,
  PostEvaluation,
  PostFilter,
  PostWithEvaluation,
} from './IPostRepository';

export class PostRepository implements IPostRepository {
  constructor(private db: Knex) {}

  async find(filter: PostFilter): Promise<Post[]> {
    let query = this.db('posts').select('*');

    if (filter.forum_name) {
      query = query.where('forum_name', filter.forum_name);
    }

    if (filter.evaluated !== undefined) {
      query = query.where('evaluated', filter.evaluated);
    }

    if (filter.author) {
      query = query.where('author', filter.author);
    }

    if (filter.topic_id) {
      query = query.where('topic_id', filter.topic_id);
    }

    if (filter.created_after) {
      query = query.where('created_at', '>=', filter.created_after);
    }

    if (filter.created_before) {
      query = query.where('created_at', '<=', filter.created_before);
    }

    if (filter.quality_score_min !== undefined) {
      query = query.where('quality_score', '>=', filter.quality_score_min);
    }

    if (filter.quality_score_max !== undefined) {
      query = query.where('quality_score', '<=', filter.quality_score_max);
    }

    return await query.orderBy('created_at', 'desc');
  }

  async findById(id: string): Promise<Post | null> {
    const result = await this.db('posts').where('id', id).first();
    return result || null;
  }

  async findUnevaluated(forumName?: string): Promise<Post[]> {
    let query = this.db('posts').where('evaluated', false).orWhereNull('evaluated');

    if (forumName) {
      query = query.where('forum_name', forumName);
    }

    return await query.orderBy('created_at', 'asc');
  }

  async findWithEvaluations(filter: PostFilter): Promise<PostWithEvaluation[]> {
    const posts = await this.find(filter);
    const postsWithEvaluations: PostWithEvaluation[] = [];

    for (const post of posts) {
      const evaluation = await this.db('post_evaluations').where('post_id', post.id).first();

      postsWithEvaluations.push({
        ...post,
        evaluation: evaluation || undefined,
      });
    }

    return postsWithEvaluations;
  }

  async create(post: Omit<Post, 'created_at' | 'updated_at'>): Promise<Post> {
    const now = new Date();
    const newPost = {
      ...post,
      created_at: now,
      updated_at: now,
    };

    await this.db('posts').insert(newPost);
    return newPost as Post;
  }

  async update(id: string, updates: Partial<Post>): Promise<Post> {
    const updatedData = {
      ...updates,
      updated_at: new Date(),
    };

    await this.db('posts').where('id', id).update(updatedData);

    const updatedPost = await this.findById(id);
    if (!updatedPost) {
      throw new Error(`Post with id ${id} not found after update`);
    }

    return updatedPost;
  }

  async markAsEvaluated(
    id: string,
    evaluation: {
      quality_score: number;
      relevance_score: number;
      ai_summary: string;
      ai_tags: string[];
    }
  ): Promise<void> {
    await this.db('posts')
      .where('id', id)
      .update({
        evaluated: true,
        quality_score: evaluation.quality_score,
        relevance_score: evaluation.relevance_score,
        ai_summary: evaluation.ai_summary,
        ai_tags: JSON.stringify(evaluation.ai_tags),
        updated_at: new Date(),
      });
  }

  async delete(id: string): Promise<void> {
    await this.db('posts').where('id', id).del();
  }

  async getCountByForum(forumName: string): Promise<number> {
    const result = await this.db('posts')
      .where('forum_name', forumName)
      .count('* as count')
      .first();

    return parseInt(result?.count as string) || 0;
  }

  async getRecent(forumName: string, limit: number = 10): Promise<Post[]> {
    return await this.db('posts')
      .where('forum_name', forumName)
      .orderBy('created_at', 'desc')
      .limit(limit);
  }

  async createMany(posts: Omit<Post, 'created_at' | 'updated_at'>[]): Promise<Post[]> {
    const now = new Date();
    const postsToInsert = posts.map(post => ({
      ...post,
      created_at: now,
      updated_at: now,
    }));

    await this.db('posts').insert(postsToInsert);
    return postsToInsert as Post[];
  }

  async updateMany(updates: Array<{ id: string; updates: Partial<Post> }>): Promise<void> {
    const now = new Date();

    // Use transaction for batch updates
    await this.db.transaction(async trx => {
      for (const { id, updates: postUpdates } of updates) {
        await trx('posts')
          .where('id', id)
          .update({
            ...postUpdates,
            updated_at: now,
          });
      }
    });
  }
}
