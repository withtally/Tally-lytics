// __tests__/mocks/MockPostRepository.ts - Mock implementation for testing

import type { 
  IPostRepository, 
  Post, 
  PostFilter, 
  PostWithEvaluation 
} from '../../db/repositories/IPostRepository';
import { createTestPost, createTestPostEvaluation } from '../factories/postFactory';

export class MockPostRepository implements IPostRepository {
  private posts: Map<string, Post> = new Map();
  private evaluations: Map<string, any> = new Map(); // post_id -> evaluation

  // Test utilities
  reset() {
    this.posts.clear();
    this.evaluations.clear();
  }

  seedPosts(posts: Post[]) {
    posts.forEach(post => {
      this.posts.set(post.id, post);
    });
  }

  seedEvaluations(postId: string, evaluation: any) {
    this.evaluations.set(postId, evaluation);
  }

  getAllPosts(): Post[] {
    return Array.from(this.posts.values());
  }

  // IPostRepository implementation
  async find(filter: PostFilter): Promise<Post[]> {
    let posts = Array.from(this.posts.values());

    if (filter.forum_name) {
      posts = posts.filter(p => p.forum_name === filter.forum_name);
    }

    if (filter.evaluated !== undefined) {
      posts = posts.filter(p => p.evaluated === filter.evaluated);
    }

    if (filter.author) {
      posts = posts.filter(p => p.author === filter.author);
    }

    if (filter.topic_id) {
      posts = posts.filter(p => p.topic_id === filter.topic_id);
    }

    if (filter.created_after) {
      posts = posts.filter(p => p.created_at >= filter.created_after!);
    }

    if (filter.created_before) {
      posts = posts.filter(p => p.created_at <= filter.created_before!);
    }

    if (filter.quality_score_min !== undefined) {
      posts = posts.filter(p => p.quality_score !== undefined && p.quality_score >= filter.quality_score_min!);
    }

    if (filter.quality_score_max !== undefined) {
      posts = posts.filter(p => p.quality_score !== undefined && p.quality_score <= filter.quality_score_max!);
    }

    // Sort by created_at desc
    return posts.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  }

  async findById(id: string): Promise<Post | null> {
    return this.posts.get(id) || null;
  }

  async findUnevaluated(forumName?: string): Promise<Post[]> {
    let posts = Array.from(this.posts.values()).filter(p => !p.evaluated);

    if (forumName) {
      posts = posts.filter(p => p.forum_name === forumName);
    }

    return posts.sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
  }

  async findWithEvaluations(filter: PostFilter): Promise<PostWithEvaluation[]> {
    const posts = await this.find(filter);
    
    return posts.map(post => ({
      ...post,
      evaluation: this.evaluations.get(post.id),
    }));
  }

  async create(post: Omit<Post, 'created_at' | 'updated_at'>): Promise<Post> {
    const now = new Date();
    const newPost: Post = {
      ...post,
      created_at: now,
      updated_at: now,
    };

    this.posts.set(newPost.id, newPost);
    return newPost;
  }

  async update(id: string, updates: Partial<Post>): Promise<Post> {
    const existing = this.posts.get(id);
    if (!existing) {
      throw new Error(`Post with id ${id} not found`);
    }

    const updated: Post = {
      ...existing,
      ...updates,
      updated_at: new Date(),
    };

    this.posts.set(id, updated);
    return updated;
  }

  async markAsEvaluated(id: string, evaluation: {
    quality_score: number;
    relevance_score: number;
    ai_summary: string;
    ai_tags: string[];
  }): Promise<void> {
    const post = this.posts.get(id);
    if (!post) {
      throw new Error(`Post with id ${id} not found`);
    }

    post.evaluated = true;
    post.quality_score = evaluation.quality_score;
    post.relevance_score = evaluation.relevance_score;
    post.ai_summary = evaluation.ai_summary;
    post.ai_tags = evaluation.ai_tags;
    post.updated_at = new Date();

    this.posts.set(id, post);
  }

  async delete(id: string): Promise<void> {
    this.posts.delete(id);
    this.evaluations.delete(id);
  }

  async getCountByForum(forumName: string): Promise<number> {
    return Array.from(this.posts.values())
      .filter(p => p.forum_name === forumName)
      .length;
  }

  async getRecent(forumName: string, limit: number = 10): Promise<Post[]> {
    const posts = Array.from(this.posts.values())
      .filter(p => p.forum_name === forumName)
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

    return posts.slice(0, limit);
  }

  async createMany(posts: Omit<Post, 'created_at' | 'updated_at'>[]): Promise<Post[]> {
    const now = new Date();
    const createdPosts: Post[] = [];

    for (const post of posts) {
      const newPost: Post = {
        ...post,
        created_at: now,
        updated_at: now,
      };
      
      this.posts.set(newPost.id, newPost);
      createdPosts.push(newPost);
    }

    return createdPosts;
  }

  async updateMany(updates: Array<{ id: string; updates: Partial<Post> }>): Promise<void> {
    const now = new Date();

    for (const { id, updates: postUpdates } of updates) {
      const existing = this.posts.get(id);
      if (existing) {
        const updated = {
          ...existing,
          ...postUpdates,
          updated_at: now,
        };
        this.posts.set(id, updated);
      }
    }
  }
}