// Unit tests for TopicsService using dependency injection

import { TopicsService } from '../services/llm/TopicsServiceRefactored';
import type { IOpenAIClient } from '../services/interfaces/IOpenAIClient';
import type { ILogger } from '../services/interfaces/ILogger';
import type { ITopicRepository, Topic } from '../db/repositories/ITopicRepository';
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
                summary:
                  'This is a governance discussion about voting mechanisms and community participation.',
                tags: ['governance', 'voting', 'community', 'mechanisms'],
              }),
            },
          },
        ],
      }),
    },
  };

  embeddings = {
    create: jest.fn(),
  };
}

class MockLogger implements ILogger {
  debug = jest.fn();
  info = jest.fn();
  warn = jest.fn();
  error = jest.fn();
}

class MockTopicRepository implements ITopicRepository {
  private topics = new Map<string, Topic>();

  async find(filter: any): Promise<Topic[]> {
    let results = Array.from(this.topics.values());

    if (filter.forum_name) {
      results = results.filter(t => t.forum_name === filter.forum_name);
    }
    if (filter.has_summary !== undefined) {
      results = results.filter(t => (filter.has_summary ? !!t.ai_summary : !t.ai_summary));
    }

    return results;
  }

  async findById(id: string): Promise<Topic | null> {
    return this.topics.get(id) || null;
  }

  async findWithPosts(id: string): Promise<any | null> {
    const topic = this.topics.get(id);
    if (!topic) return null;

    return {
      ...topic,
      posts: [],
    };
  }

  async findNeedingSummary(forumName?: string): Promise<Topic[]> {
    let results = Array.from(this.topics.values()).filter(t => !t.ai_summary);

    if (forumName) {
      results = results.filter(t => t.forum_name === forumName);
    }

    return results;
  }

  async create(topic: Omit<Topic, 'created_at' | 'updated_at'>): Promise<Topic> {
    const newTopic: Topic = {
      ...topic,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.topics.set(newTopic.id, newTopic);
    return newTopic;
  }

  async update(id: string, updates: Partial<Topic>): Promise<Topic> {
    const topic = this.topics.get(id);
    if (!topic) {
      throw new Error(`Topic not found: ${id}`);
    }

    const updatedTopic = { ...topic, ...updates, updated_at: new Date() };
    this.topics.set(id, updatedTopic);
    return updatedTopic;
  }

  async updateSummary(id: string, summary: any): Promise<void> {
    const topic = this.topics.get(id);
    if (topic) {
      topic.ai_summary = summary.ai_summary;
      topic.ai_tags = summary.ai_tags;
      if (summary.quality_score) {
        topic.quality_score = summary.quality_score;
      }
    }
  }

  async delete(id: string): Promise<void> {
    this.topics.delete(id);
  }

  async getCountByForum(forumName: string): Promise<number> {
    return Array.from(this.topics.values()).filter(t => t.forum_name === forumName).length;
  }

  async getRecent(forumName: string, limit: number = 10): Promise<Topic[]> {
    return Array.from(this.topics.values())
      .filter(t => t.forum_name === forumName)
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
      .slice(0, limit);
  }

  async getPopular(forumName: string, limit: number = 10): Promise<Topic[]> {
    return Array.from(this.topics.values())
      .filter(t => t.forum_name === forumName)
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, limit);
  }

  async createMany(topics: Omit<Topic, 'created_at' | 'updated_at'>[]): Promise<Topic[]> {
    const created: Topic[] = [];
    for (const topic of topics) {
      created.push(await this.create(topic));
    }
    return created;
  }

  async updateMany(updates: Array<{ id: string; updates: Partial<Topic> }>): Promise<void> {
    for (const { id, updates: topicUpdates } of updates) {
      await this.update(id, topicUpdates);
    }
  }

  // Test utility methods
  seedTopic(topic: Topic): void {
    this.topics.set(topic.id, topic);
  }

  reset(): void {
    this.topics.clear();
  }
}

class MockPostRepository implements IPostRepository {
  private posts = new Map<string, Post>();

  async find(filter: any): Promise<Post[]> {
    let results = Array.from(this.posts.values());

    if (filter.topic_id) {
      results = results.filter(p => p.topic_id === filter.topic_id);
    }
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

  // Test utility methods
  seedPost(post: Post): void {
    this.posts.set(post.id, post);
  }

  reset(): void {
    this.posts.clear();
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
    return posts.map(post => ({ ...post, evaluation: null }));
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
    }
  }

  async delete(id: string): Promise<void> {
    this.posts.delete(id);
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
}

describe('TopicsService (Unit Tests)', () => {
  let service: TopicsService;
  let mockOpenAI: MockOpenAIClient;
  let mockTopicRepo: MockTopicRepository;
  let mockPostRepo: MockPostRepository;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockOpenAI = new MockOpenAIClient();
    mockTopicRepo = new MockTopicRepository();
    mockPostRepo = new MockPostRepository();
    mockLogger = new MockLogger();

    service = new TopicsService(mockOpenAI, mockTopicRepo, mockPostRepo, mockLogger);

    // Reset all mocks
    mockTopicRepo.reset();
    mockPostRepo.reset();
    jest.clearAllMocks();
  });

  describe('fetchAndSummarizeTopics', () => {
    it('should successfully summarize unsummarized topics', async () => {
      // Given
      const topics: Topic[] = [
        {
          id: 'topic-1',
          forum_name: 'ARBITRUM',
          title: 'Governance Discussion',
          posts_count: 5,
          created_at: new Date(),
          updated_at: new Date(),
          ai_summary: undefined, // Unsummarized
        },
        {
          id: 'topic-2',
          forum_name: 'ARBITRUM',
          title: 'Another Discussion',
          posts_count: 3,
          created_at: new Date(),
          updated_at: new Date(),
          ai_summary: undefined, // Unsummarized
        },
      ];

      const posts: Post[] = [
        {
          id: 'post-1',
          topic_id: 'topic-1',
          forum_name: 'ARBITRUM',
          content: 'This is a detailed governance proposal about voting mechanisms.',
          author: 'Author1',
          author_id: 'author-1',
          post_number: 1,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'post-2',
          topic_id: 'topic-2',
          forum_name: 'ARBITRUM',
          content: 'Another governance discussion about community participation.',
          author: 'Author2',
          author_id: 'author-2',
          post_number: 1,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      topics.forEach(topic => mockTopicRepo.seedTopic(topic));
      posts.forEach(post => mockPostRepo.seedPost(post));

      // When
      const result = await service.fetchAndSummarizeTopics('ARBITRUM');

      // Then
      expect(result.processed).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);

      // Verify OpenAI was called for each topic
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(2);

      // Verify logging
      expect(mockLogger.info).toHaveBeenCalledWith('Starting topic summarization', {
        forumName: 'ARBITRUM',
        batchSize: 10,
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Topic summarization completed',
        expect.objectContaining({
          forumName: 'ARBITRUM',
          processed: 2,
          failed: 0,
        })
      );
    });

    it('should respect batch size limits', async () => {
      // Given
      const topics: Topic[] = Array.from({ length: 5 }, (_, i) => ({
        id: `topic-${i + 1}`,
        forum_name: 'ARBITRUM',
        title: `Discussion ${i + 1}`,
        posts_count: 1,
        created_at: new Date(),
        updated_at: new Date(),
        ai_summary: undefined,
      }));

      const posts: Post[] = topics.map(topic => ({
        id: `post-${topic.id}`,
        topic_id: topic.id,
        forum_name: 'ARBITRUM',
        content: `Content for ${topic.title}`,
        author: 'Author',
        author_id: 'author-1',
        post_number: 1,
        created_at: new Date(),
        updated_at: new Date(),
      }));

      topics.forEach(topic => mockTopicRepo.seedTopic(topic));
      posts.forEach(post => mockPostRepo.seedPost(post));

      // When
      const result = await service.fetchAndSummarizeTopics('ARBITRUM', { batchSize: 3 });

      // Then
      expect(result.processed).toBe(3);
      expect(result.failed).toBe(0);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(3);
    });

    it('should handle topics with no posts', async () => {
      // Given
      const topics: Topic[] = [
        {
          id: 'topic-empty',
          forum_name: 'ARBITRUM',
          title: 'Empty Topic',
          posts_count: 0,
          created_at: new Date(),
          updated_at: new Date(),
          ai_summary: undefined,
        },
      ];

      topics.forEach(topic => mockTopicRepo.seedTopic(topic));
      // Note: No posts seeded

      // When
      const result = await service.fetchAndSummarizeTopics('ARBITRUM');

      // Then
      expect(result.processed).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('No posts found for topic topic-empty');

      // Verify error logging
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Topic summarization failed',
        expect.objectContaining({
          topicId: 'topic-empty',
        })
      );
    });

    it('should handle OpenAI API errors', async () => {
      // Given
      const topics: Topic[] = [
        {
          id: 'topic-1',
          forum_name: 'ARBITRUM',
          title: 'Test Topic',
          posts_count: 1,
          created_at: new Date(),
          updated_at: new Date(),
          ai_summary: undefined,
        },
      ];

      const posts: Post[] = [
        {
          id: 'post-1',
          topic_id: 'topic-1',
          forum_name: 'ARBITRUM',
          content: 'Test content',
          author: 'Author',
          author_id: 'author-1',
          post_number: 1,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      topics.forEach(topic => mockTopicRepo.seedTopic(topic));
      posts.forEach(post => mockPostRepo.seedPost(post));

      mockOpenAI.chat.completions.create.mockRejectedValueOnce(new Error('OpenAI API Error'));

      // When
      const result = await service.fetchAndSummarizeTopics('ARBITRUM');

      // Then
      expect(result.processed).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('OpenAI API Error');
    });
  });

  describe('summarizeTopic', () => {
    it('should successfully summarize a single topic', async () => {
      // Given
      const topic: Topic = {
        id: 'topic-1',
        forum_name: 'ARBITRUM',
        title: 'Governance Discussion',
        posts_count: 1,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const post: Post = {
        id: 'post-1',
        topic_id: 'topic-1',
        forum_name: 'ARBITRUM',
        content: 'This is a detailed governance proposal about voting mechanisms.',
        author: 'Author',
        author_id: 'author-1',
        post_number: 1,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPostRepo.seedPost(post);

      // When
      const result = await service.summarizeTopic(topic);

      // Then
      expect(result.summary).toBe(
        'This is a governance discussion about voting mechanisms and community participation.'
      );
      expect(result.tags).toEqual(['governance', 'voting', 'community', 'mechanisms']);

      // Verify OpenAI was called
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-3.5-turbo',
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('voting mechanisms'),
            }),
          ]),
        })
      );
    });

    it('should handle topics with empty content', async () => {
      // Given
      const topic: Topic = {
        id: 'topic-1',
        forum_name: 'ARBITRUM',
        title: 'Empty Topic',
        posts_count: 1,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const post: Post = {
        id: 'post-1',
        topic_id: 'topic-1',
        forum_name: 'ARBITRUM',
        content: '', // Empty content
        author: 'Author',
        author_id: 'author-1',
        post_number: 1,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPostRepo.seedPost(post);

      // When & Then
      await expect(service.summarizeTopic(topic)).rejects.toThrow('Topic topic-1 has no content');
    });
  });

  describe('generateTopicSummary', () => {
    it('should generate summary and tags from content', async () => {
      // Given
      const content = 'This is a governance proposal about improving voting mechanisms in our DAO.';

      // When
      const result = await service.generateTopicSummary(content);

      // Then
      expect(result.summary).toBe(
        'This is a governance discussion about voting mechanisms and community participation.'
      );
      expect(result.tags).toEqual(['governance', 'voting', 'community', 'mechanisms']);

      // Verify OpenAI was called with correct parameters
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-3.5-turbo',
          temperature: 0.3,
          max_tokens: 300,
          response_format: { type: 'json_object' },
        })
      );
    });

    it('should handle invalid LLM response format', async () => {
      // Given
      const content = 'Test content';
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                summary: 'Valid summary',
                // Missing tags
              }),
            },
          },
        ],
      });

      // When & Then
      await expect(service.generateTopicSummary(content)).rejects.toThrow(
        'Invalid response format: missing summary or tags'
      );
    });

    it('should handle malformed JSON response', async () => {
      // Given
      const content = 'Test content';
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'Not valid JSON',
            },
          },
        ],
      });

      // When & Then
      await expect(service.generateTopicSummary(content)).rejects.toThrow(
        'Failed to parse LLM response'
      );
    });

    it('should handle empty response from OpenAI', async () => {
      // Given
      const content = 'Test content';
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
      });

      // When & Then
      await expect(service.generateTopicSummary(content)).rejects.toThrow(
        'No response content from OpenAI'
      );
    });
  });

  describe('chunkText', () => {
    it('should return single chunk for short text', () => {
      // Given
      const shortText = 'This is a short text.';

      // When
      const chunks = service.chunkText(shortText, 1000);

      // Then
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe(shortText);
    });

    it('should split long text into multiple chunks', () => {
      // Given
      const longText = Array.from({ length: 1000 }, () => 'This is a sentence.').join(' ');

      // When
      const chunks = service.chunkText(longText, 100); // Small token limit

      // Then
      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach(chunk => {
        expect(chunk.length).toBeLessThanOrEqual(100 * 4); // ~4 chars per token
      });
    });

    it('should handle text with no sentence boundaries', () => {
      // Given
      const textWithoutSentences = 'word1 word2 word3 word4 word5';

      // When
      const chunks = service.chunkText(textWithoutSentences, 5); // Very small limit

      // Then
      expect(chunks).toHaveLength(1); // Should return original text if no good split points
      expect(chunks[0]).toBe(textWithoutSentences);
    });
  });

  describe('estimateTokenCount', () => {
    it('should estimate token count for text', () => {
      // Given
      const text = 'Hello world test'; // 16 chars

      // When
      const tokenCount = service.estimateTokenCount(text);

      // Then
      expect(tokenCount).toBe(4); // 16 chars / 4 = 4 tokens
    });

    it('should handle empty text', () => {
      // When
      const tokenCount = service.estimateTokenCount('');

      // Then
      expect(tokenCount).toBe(0);
    });
  });
});
