// Unit test for PostEvaluationService using dependency injection

import { PostEvaluationService } from '../services/llm/PostEvaluationService';
import type { IOpenAIClient } from '../services/interfaces/IOpenAIClient';
import type { ILogger } from '../services/interfaces/ILogger';
import type { IPostRepository, Post } from '../db/repositories/IPostRepository';

// Mock implementations
class MockOpenAIClient implements IOpenAIClient {
  chat = {
    completions: {
      create: jest.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                quality_score: 0.8,
                relevance_score: 0.9,
                summary: 'This is a high-quality governance proposal about voting mechanisms.',
                tags: ['governance', 'proposal', 'voting'],
              }),
            },
          },
        ],
      }),
    },
  };

  embeddings = {
    create: jest.fn().mockResolvedValue({
      data: [{ embedding: [0.1, 0.2, 0.3] }],
    }),
  };
}

class MockLogger implements ILogger {
  debug = jest.fn();
  info = jest.fn();
  warn = jest.fn();
  error = jest.fn();
}

class MockPostRepository implements IPostRepository {
  private posts = new Map<string, Post>();
  private evaluations = new Map<string, any>();

  async find(filter: any): Promise<Post[]> {
    let results = Array.from(this.posts.values());

    if (filter.forum_name) {
      results = results.filter(p => p.forum_name === filter.forum_name);
    }
    if (filter.evaluated !== undefined) {
      results = results.filter(p => p.evaluated === filter.evaluated);
    }

    return results;
  }

  async findById(id: string): Promise<Post | null> {
    return this.posts.get(id) || null;
  }

  async findUnevaluated(forumName?: string): Promise<Post[]> {
    let results = Array.from(this.posts.values()).filter(p => !p.evaluated);

    if (forumName) {
      results = results.filter(p => p.forum_name === forumName);
    }

    return results;
  }

  async findWithEvaluations(filter: any): Promise<any[]> {
    const posts = await this.find(filter);
    return posts.map(post => ({
      ...post,
      evaluation: this.evaluations.get(post.id),
    }));
  }

  async create(post: Omit<Post, 'created_at' | 'updated_at'>): Promise<Post> {
    const newPost: Post = {
      ...post,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.posts.set(newPost.id, newPost);
    return newPost;
  }

  async update(id: string, updates: Partial<Post>): Promise<Post> {
    const post = this.posts.get(id);
    if (!post) {
      throw new Error(`Post not found: ${id}`);
    }

    const updatedPost = { ...post, ...updates, updated_at: new Date() };
    this.posts.set(id, updatedPost);
    return updatedPost;
  }

  async markAsEvaluated(id: string, evaluation: any): Promise<void> {
    const post = this.posts.get(id);
    if (post) {
      post.evaluated = true;
      post.quality_score = evaluation.quality_score;
      post.ai_summary = evaluation.ai_summary;
      post.ai_tags = evaluation.ai_tags;
    }
    this.evaluations.set(id, evaluation);
  }

  async delete(id: string): Promise<void> {
    this.posts.delete(id);
    this.evaluations.delete(id);
  }

  async getCountByForum(forumName: string): Promise<number> {
    return Array.from(this.posts.values()).filter(p => p.forum_name === forumName).length;
  }

  async getRecent(forumName: string, limit: number = 10): Promise<Post[]> {
    return Array.from(this.posts.values())
      .filter(p => p.forum_name === forumName)
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
      .slice(0, limit);
  }

  async createMany(posts: Omit<Post, 'created_at' | 'updated_at'>[]): Promise<Post[]> {
    const created: Post[] = [];
    for (const post of posts) {
      created.push(await this.create(post));
    }
    return created;
  }

  async updateMany(updates: Array<{ id: string; updates: Partial<Post> }>): Promise<void> {
    for (const { id, updates: postUpdates } of updates) {
      await this.update(id, postUpdates);
    }
  }

  // Test utility methods
  seedPost(post: Post): void {
    this.posts.set(post.id, post);
  }

  getEvaluation(id: string): any {
    return this.evaluations.get(id);
  }

  reset(): void {
    this.posts.clear();
    this.evaluations.clear();
  }
}

describe.skip('PostEvaluationService (Unit Tests)', () => {
  let service: PostEvaluationService;
  let mockOpenAI: MockOpenAIClient;
  let mockRepository: MockPostRepository;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockOpenAI = new MockOpenAIClient();
    mockRepository = new MockPostRepository();
    mockLogger = new MockLogger();

    service = new PostEvaluationService(mockOpenAIRepositoryLogger);

    // Reset all mocks
    mockRepository.reset();
    jest.clearAllMocks();
  });

  describe.skip('evaluatePost', () => {
    it('should successfully evaluate a post', async () => {
      // Given
      const post: Post = {
        id: 'test-post-1',
        topic_id: 'topic-1',
        forum_name: 'ARBITRUM',
        content: 'This is a governance proposal about improving voting mechanisms.',
        author: 'TestAuthor',
        author_id: 'author-1',
        post_number: 1,
        created_at: new Date(),
        updated_at: new Date(),
        evaluated: false,
      };

      mockRepository.seedPost(post);

      // When
      const result = await service.evaluatePost('test-post-1');

      // Then
      expect(result).toBeDefined();
      expect(result.quality_score).toBe(0.8);
      expect(result.relevance_score).toBe(0.9);
      expect(result.summary).toContain('governance proposal');
      expect(result.tags).toContain('governance');
      expect(result.tags).toContain('proposal');
      expect(result.tags).toContain('voting');

      // Verify OpenAI was called
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(1);

      // Verify post was marked as evaluated
      const updatedPost = await mockRepository.findById('test-post-1');
      expect(updatedPost?.evaluated).toBe(true);
      expect(updatedPost?.quality_score).toBe(0.8);

      // Verify logging
      expect(mockLogger.info).toHaveBeenCalledWith('Starting post evaluation', {
        postId: 'test-post-1',
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Post evaluation completed',
        expect.objectContaining({
          postId: 'test-post-1',
          qualityScore: 0.8,
          relevanceScore: 0.9,
        })
      );
    });

    it('should throw error when post not found', async () => {
      // When & Then
      await expect(service.evaluatePost('non-existent-post')).rejects.toThrow(
        'Post not found: non-existent-post'
      );

      // The error is thrown before the try-catch block that handles error logging
      // So we don't expect error logging in this case
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should handle OpenAI API errors', async () => {
      // Given
      const post: Post = {
        id: 'test-post-1',
        topic_id: 'topic-1',
        forum_name: 'ARBITRUM',
        content: 'Test content',
        author: 'TestAuthor',
        author_id: 'author-1',
        post_number: 1,
        created_at: new Date(),
        updated_at: new Date(),
        evaluated: false,
      };

      mockRepository.seedPost(post);
      mockOpenAI.chat.completions.create.mockRejectedValueOnce(new Error('OpenAI API Error'));

      // When & Then
      await expect(service.evaluatePost('test-post-1')).rejects.toThrow('OpenAI API Error');

      // Verify error logging
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Post evaluation failed',
        expect.objectContaining({
          postId: 'test-post-1',
        })
      );
    });
  });

  describe.skip('evaluateUnanalyzedPosts', () => {
    it('should evaluate multiple unevaluated posts', async () => {
      // Given
      const posts: Post[] = [
        {
          id: 'post-1',
          topic_id: 'topic-1',
          forum_name: 'ARBITRUM',
          content: 'First proposal',
          author: 'Author1',
          author_id: 'author-1',
          post_number: 1,
          created_at: new Date(),
          updated_at: new Date(),
          evaluated: false,
        },
        {
          id: 'post-2',
          topic_id: 'topic-2',
          forum_name: 'ARBITRUM',
          content: 'Second proposal',
          author: 'Author2',
          author_id: 'author-2',
          post_number: 1,
          created_at: new Date(),
          updated_at: new Date(),
          evaluated: false,
        },
      ];

      posts.forEach(post => mockRepository.seedPost(post));

      // When
      const result = await service.evaluateUnanalyzedPosts('ARBITRUM');

      // Then
      expect(result.processed).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);

      // Verify OpenAI was called for each post
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(2);

      // Verify batch logging
      expect(mockLogger.info).toHaveBeenCalledWith('Starting batch post evaluation', {
        forumName: 'ARBITRUM',
        batchSize: 10,
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Batch post evaluation completed',
        expect.objectContaining({
          forumName: 'ARBITRUM',
          processed: 2,
          failed: 0,
        })
      );
    });

    it('should respect batch size limits', async () => {
      // Given
      const posts: Post[] = Array.from({ length: 5 }, (_, i) => ({
        id: `post-${i + 1}`,
        topic_id: `topic-${i + 1}`,
        forum_name: 'ARBITRUM',
        content: `Proposal ${i + 1}`,
        author: `Author${i + 1}`,
        author_id: `author-${i + 1}`,
        post_number: 1,
        created_at: new Date(),
        updated_at: new Date(),
        evaluated: false,
      }));

      posts.forEach(post => mockRepository.seedPost(post));

      // When
      const result = await service.evaluateUnanalyzedPosts('ARBITRUM', { batchSize: 3 });

      // Then
      expect(result.processed).toBe(3);
      expect(result.failed).toBe(0);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(3);
    });
  });

  describe.skip('generateEvaluationPrompt', () => {
    it('should generate appropriate evaluation prompt', () => {
      // Given
      const post: Post = {
        id: 'test-post',
        topic_id: 'topic-1',
        forum_name: 'ARBITRUM',
        content: 'This is a governance proposal about voting.',
        author: 'TestAuthor',
        author_id: 'author-1',
        post_number: 1,
        created_at: new Date(),
        updated_at: new Date(),
        evaluated: false,
      };

      // When
      const prompt = service.generateEvaluationPrompt(post);

      // Then
      expect(prompt).toContain('ARBITRUM');
      expect(prompt).toContain('governance proposal about voting');
      expect(prompt).toContain('TestAuthor');
      expect(prompt).toContain('quality_score');
      expect(prompt).toContain('relevance_score');
      expect(prompt).toContain('summary');
      expect(prompt).toContain('tags');
    });
  });

  describe.skip('parseEvaluationResponse', () => {
    it('should parse valid evaluation response', () => {
      // Given
      const validResponse = JSON.stringify({
        quality_score: 0.75,
        relevance_score: 0.85,
        summary: 'A thoughtful governance proposal.',
        tags: ['governance', 'proposal'],
      });

      // When
      const result = service.parseEvaluationResponse(validResponse);

      // Then
      expect(result.quality_score).toBe(0.75);
      expect(result.relevance_score).toBe(0.85);
      expect(result.summary).toBe('A thoughtful governance proposal.');
      expect(result.tags).toEqual(['governance', 'proposal']);
    });

    it('should handle invalid JSON', () => {
      // Given
      const invalidResponse = 'not valid json';

      // When & Then
      expect(() => service.parseEvaluationResponse(invalidResponse)).toThrow(
        'Invalid evaluation response format: not valid JSON'
      );
    });

    it('should validate required fields', () => {
      // Given
      const incompleteResponse = JSON.stringify({
        quality_score: 0.8,
        // Missing other required fields
      });

      // When & Then
      expect(() => service.parseEvaluationResponse(incompleteResponse)).toThrow(
        'Missing required evaluation fields'
      );
    });

    it('should validate score ranges', () => {
      // Given
      const invalidScoreResponse = JSON.stringify({
        quality_score: 1.5, // Invalid - over 1
        relevance_score: 0.9,
        summary: 'Test summary',
        tags: ['test'],
      });

      // When & Then
      expect(() => service.parseEvaluationResponse(invalidScoreResponse)).toThrow(
        'quality_score must be a number between 0 and 1'
      );
    });
  });
});
