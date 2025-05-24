// services/llm/__tests__/PostEvaluationService.test.ts - Test for refactored post evaluation service

import { PostEvaluationService } from '../PostEvaluationService';
import { MockPostRepository } from '../../../__tests__/mocks/MockPostRepository';
import { serviceContainer, configureTestServices } from '../../container/ServiceContainer';
import { createTestPost } from '../../../__tests__/factories/postFactory';

describe('PostEvaluationService', () => {
  let service: PostEvaluationService;
  let mockPostRepo: MockPostRepository;

  beforeEach(() => {
    // Reset and configure test services
    serviceContainer.clear();
    configureTestServices(serviceContainer);
    
    // Get dependencies from container
    const openaiClient = serviceContainer.getOpenAIClient();
    const logger = serviceContainer.getLogger();
    mockPostRepo = serviceContainer.getPostRepository() as MockPostRepository;
    
    // Create service with injected dependencies
    service = new PostEvaluationService(openaiClient, mockPostRepo, logger);
    
    // Reset mock repository
    mockPostRepo.reset();
  });

  describe('evaluatePost', () => {
    it('should evaluate a single post successfully', async () => {
      // Given
      const post = createTestPost({
        content: 'This is a high quality governance proposal about improving the voting mechanism.',
        forum_name: 'ARBITRUM',
      });
      
      mockPostRepo.seedPosts([post]);

      // When
      const result = await service.evaluatePost(post.id);

      // Then
      expect(result).toBeDefined();
      expect(result.quality_score).toBeGreaterThan(0);
      expect(result.quality_score).toBeLessThanOrEqual(1);
      expect(result.relevance_score).toBeGreaterThan(0);
      expect(result.relevance_score).toBeLessThanOrEqual(1);
      expect(result.summary).toBeDefined();
      expect(result.tags).toBeInstanceOf(Array);
      expect(result.tags.length).toBeGreaterThan(0);
    });

    it('should handle post not found', async () => {
      // Given
      const nonExistentId = 'non-existent-id';

      // When & Then
      await expect(service.evaluatePost(nonExistentId))
        .rejects.toThrow('Post not found');
    });

    it('should mark post as evaluated after processing', async () => {
      // Given
      const post = createTestPost({ evaluated: false });
      mockPostRepo.seedPosts([post]);

      // When
      await service.evaluatePost(post.id);

      // Then
      const updatedPost = await mockPostRepo.findById(post.id);
      expect(updatedPost?.evaluated).toBe(true);
      expect(updatedPost?.quality_score).toBeDefined();
      expect(updatedPost?.ai_summary).toBeDefined();
      expect(updatedPost?.ai_tags).toBeDefined();
    });
  });

  describe('evaluateUnanalyzedPosts', () => {
    it('should evaluate multiple unevaluated posts', async () => {
      // Given
      const posts = [
        createTestPost({ forum_name: 'ARBITRUM', evaluated: false }),
        createTestPost({ forum_name: 'ARBITRUM', evaluated: false }),
        createTestPost({ forum_name: 'ARBITRUM', evaluated: true }), // Already evaluated
      ];
      
      mockPostRepo.seedPosts(posts);

      // When
      const result = await service.evaluateUnanalyzedPosts('ARBITRUM');

      // Then
      expect(result.processed).toBe(2); // Only 2 unevaluated posts
      expect(result.failed).toBe(0);
      
      // Check that posts are marked as evaluated
      const unevaluated = await mockPostRepo.findUnevaluated('ARBITRUM');
      expect(unevaluated.length).toBe(0);
    });

    it('should handle evaluation errors gracefully', async () => {
      // Given
      const posts = [
        createTestPost({ forum_name: 'ARBITRUM', evaluated: false }),
      ];
      
      mockPostRepo.seedPosts(posts);
      
      // Mock OpenAI to throw an error
      const openaiClient = serviceContainer.getOpenAIClient();
      jest.spyOn(openaiClient.chat.completions, 'create').mockRejectedValueOnce(
        new Error('OpenAI API Error')
      );

      // When
      const result = await service.evaluateUnanalyzedPosts('ARBITRUM');

      // Then
      expect(result.processed).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('OpenAI API Error');
    });

    it('should respect batch limits', async () => {
      // Given
      const posts = Array.from({ length: 15 }, () => 
        createTestPost({ forum_name: 'ARBITRUM', evaluated: false })
      );
      
      mockPostRepo.seedPosts(posts);

      // When
      const result = await service.evaluateUnanalyzedPosts('ARBITRUM', { batchSize: 5 });

      // Then
      expect(result.processed).toBe(5); // Should only process batch size
      
      const remainingUnevaluated = await mockPostRepo.findUnevaluated('ARBITRUM');
      expect(remainingUnevaluated.length).toBe(10); // 15 - 5 = 10 remaining
    });
  });

  describe('generateEvaluationPrompt', () => {
    it('should generate appropriate prompt for post evaluation', () => {
      // Given
      const post = createTestPost({
        content: 'This is a proposal about governance improvements.',
        forum_name: 'ARBITRUM',
      });

      // When
      const prompt = service.generateEvaluationPrompt(post);

      // Then
      expect(prompt).toContain('evaluate');
      expect(prompt).toContain('quality_score');
      expect(prompt).toContain('relevance_score');
      expect(prompt).toContain('summary');
      expect(prompt).toContain('tags');
      expect(prompt).toContain(post.content);
      expect(prompt).toContain(post.forum_name);
    });
  });

  describe('parseEvaluationResponse', () => {
    it('should parse valid JSON evaluation response', () => {
      // Given
      const jsonResponse = JSON.stringify({
        quality_score: 0.8,
        relevance_score: 0.9,
        summary: 'Test summary',
        tags: ['governance', 'proposal'],
      });

      // When
      const result = service.parseEvaluationResponse(jsonResponse);

      // Then
      expect(result.quality_score).toBe(0.8);
      expect(result.relevance_score).toBe(0.9);
      expect(result.summary).toBe('Test summary');
      expect(result.tags).toEqual(['governance', 'proposal']);
    });

    it('should handle invalid JSON gracefully', () => {
      // Given
      const invalidJson = 'This is not valid JSON';

      // When & Then
      expect(() => service.parseEvaluationResponse(invalidJson))
        .toThrow('Invalid evaluation response format');
    });

    it('should validate required fields', () => {
      // Given
      const incompleteResponse = JSON.stringify({
        quality_score: 0.8,
        // Missing other required fields
      });

      // When & Then
      expect(() => service.parseEvaluationResponse(incompleteResponse))
        .toThrow('Missing required evaluation fields');
    });
  });
});