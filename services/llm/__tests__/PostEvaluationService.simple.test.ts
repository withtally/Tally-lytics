// Simple PostEvaluationService test without ServiceContainer
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PostEvaluationService } from '../PostEvaluationService';

// Mock dependencies - using any type to bypass Jest typing complexity for now
const mockOpenAIClient: any = {
  chat: {
    completions: {
      create: jest.fn(),
    },
  },
  embeddings: {
    create: jest.fn(),
  },
};

const mockLogger: any = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

const mockPostRepository: any = {
  findById: jest.fn(),
  find: jest.fn(),
  findUnevaluated: jest.fn(),
  findWithEvaluations: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  markAsEvaluated: jest.fn(),
  delete: jest.fn(),
  getCountByForum: jest.fn(),
  getRecent: jest.fn(),
  createMany: jest.fn(),
  updateMany: jest.fn(),
};

describe('PostEvaluationService (Simple)', () => {
  let service: PostEvaluationService;

  beforeEach(() => {
    service = new PostEvaluationService(mockOpenAIClient, mockPostRepository, mockLogger);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create service with dependencies', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(PostEvaluationService);
    });
  });

  describe('evaluatePost', () => {
    it('should handle post not found', async () => {
      // Given
      const postId = 'non-existent-post';
      mockPostRepository.findById.mockResolvedValue(null);

      // When & Then
      await expect(service.evaluatePost(postId)).rejects.toThrow();
      expect(mockPostRepository.findById).toHaveBeenCalledWith(postId);
    });
  });
});