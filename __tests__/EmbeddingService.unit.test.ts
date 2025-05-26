// Unit tests for EmbeddingService using dependency injection

import { EmbeddingService } from '../services/llm/EmbeddingService';
import type { IOpenAIClient } from '../services/interfaces/IOpenAIClient';
import type { ILogger } from '../services/interfaces/ILogger';

// Mock implementations
class MockOpenAIClient implements IOpenAIClient {
  embeddings = {
    create: jest.fn().mockImplementation((params: any) => {
      const inputCount = Array.isArray(params.input) ? params.input.length : 1;
      return Promise.resolve({
        data: Array.from({ length: inputCount }, (_, i) => ({
          embedding: [0.1 + i, 0.2 + i, 0.3 + i, 0.4 + i],
        })),
        usage: { total_tokens: inputCount * 25 },
      });
    }),
  };

  chat = {
    completions: {
      create: jest.fn(),
    },
  };
}

class MockLogger implements ILogger {
  debug = jest.fn();
  info = jest.fn();
  warn = jest.fn();
  error = jest.fn();
}

describe('EmbeddingService (Unit Tests)', () => {
  let service: EmbeddingService;
  let mockOpenAI: MockOpenAIClient;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockOpenAI = new MockOpenAIClient();
    mockLogger = new MockLogger();
    service = new EmbeddingService(mockOpenAILogger);

    jest.clearAllMocks();
  });

  describe('generateEmbeddings', () => {
    it('should generate embeddings for multiple texts', async () => {
      // Given
      const texts = ['Hello world', 'Goodbye world'];

      // When
      const result = await service.generateEmbeddings(texts);

      // Then
      expect(result.embeddings).toHaveLength(2);
      expect(result.embeddings[0]).toEqual([0.1, 0.2, 0.3, 0.4]);
      expect(result.embeddings[1]).toEqual([1.1, 1.2, 1.3, 1.4]);
      expect(result.totalTokens).toBe(50);
      expect(result.processingTime).toBeGreaterThanOrEqual(0);

      // Verify OpenAI was called correctly
      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-ada-002',
        input: texts,
      });

      // Verify logging
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Starting embedding generation',
        expect.objectContaining({
          textCount: 2,
          model: 'text-embedding-ada-002',
        })
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Embedding generation completed',
        expect.objectContaining({
          textCount: 2,
          totalTokens: 50,
        })
      );
    });

    it('should handle custom model and batch size', async () => {
      // Given
      const texts = ['Test text'];
      const options = { model: 'text-embedding-3-small', batchSize: 1 };

      // When
      await service.generateEmbeddings(texts, options);

      // Then
      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: texts,
      });
    });

    it('should process large batches in chunks', async () => {
      // Given
      const texts = Array.from({ length: 150 }, (_, i) => `Text ${i}`);
      mockOpenAI.embeddings.create
        .mockResolvedValueOnce({
          data: Array.from({ length: 100 }, () => ({ embedding: [0.1, 0.2] })),
          usage: { total_tokens: 100 },
        })
        .mockResolvedValueOnce({
          data: Array.from({ length: 50 }, () => ({ embedding: [0.3, 0.4] })),
          usage: { total_tokens: 50 },
        });

      // When
      const result = await service.generateEmbeddings(texts, { batchSize: 100 });

      // Then
      expect(mockOpenAI.embeddings.create).toHaveBeenCalledTimes(2);
      expect(result.embeddings).toHaveLength(150);
      expect(result.totalTokens).toBe(150);
    });

    it('should validate non-empty texts', async () => {
      // Given
      const invalidTexts = ['Valid text', '', 'Another valid'];

      // When & Then
      await expect(service.generateEmbeddings(invalidTexts)).rejects.toThrow(
        'All texts must be non-empty strings'
      );
    });

    it('should handle empty input', async () => {
      // Given
      const emptyTexts: string[] = [];

      // When & Then
      await expect(service.generateEmbeddings(emptyTexts)).rejects.toThrow(
        'No texts provided for embedding generation'
      );
    });

    it('should handle OpenAI API errors', async () => {
      // Given
      const texts = ['Test text'];
      mockOpenAI.embeddings.create.mockRejectedValueOnce(new Error('OpenAI API Error'));

      // When & Then
      await expect(service.generateEmbeddings(texts)).rejects.toThrow(
        'Embedding generation failed: OpenAI API Error'
      );

      // Verify error logging
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Embedding generation failed',
        expect.objectContaining({
          textCount: 1,
          error: expect.stringContaining('OpenAI API Error'),
        })
      );
    });

    it('should handle rate limit errors', async () => {
      // Given
      const texts = ['Test text'];
      const rateLimitError = new Error('Rate limited');
      (rateLimitError as any).response = { status: 429 };
      mockOpenAI.embeddings.create.mockRejectedValueOnce(rateLimitError);

      // When & Then
      await expect(service.generateEmbeddings(texts)).rejects.toThrow(
        'Rate limit exceeded. Please try again later.'
      );
    });

    it('should handle invalid API key errors', async () => {
      // Given
      const texts = ['Test text'];
      const authError = new Error('Unauthorized');
      (authError as any).response = { status: 401 };
      mockOpenAI.embeddings.create.mockRejectedValueOnce(authError);

      // When & Then
      await expect(service.generateEmbeddings(texts)).rejects.toThrow('Invalid OpenAI API key');
    });
  });

  describe('generateSingleEmbedding', () => {
    it('should generate embedding for single text', async () => {
      // Given
      const text = 'Single test text';

      // When
      const embedding = await service.generateSingleEmbedding(text);

      // Then
      expect(embedding).toEqual([0.1, 0.2, 0.3, 0.4]);
      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-ada-002',
        input: [text],
      });
    });
  });

  describe('calculateCosineSimilarity', () => {
    it('should calculate cosine similarity correctly', () => {
      // Given
      const embedding1 = [1, 0, 0];
      const embedding2 = [0, 1, 0];

      // When
      const similarity = service.calculateCosineSimilarity(embedding1, embedding2);

      // Then
      expect(similarity).toBe(0); // Orthogonal vectors
    });

    it('should calculate similarity for identical embeddings', () => {
      // Given
      const embedding = [1, 2, 3];

      // When
      const similarity = service.calculateCosineSimilarity(embedding, embedding);

      // Then
      expect(similarity).toBeCloseTo(1, 5); // Should be 1.0
    });

    it('should handle zero vectors', () => {
      // Given
      const zeroVector = [0, 0, 0];
      const otherVector = [1, 2, 3];

      // When
      const similarity = service.calculateCosineSimilarity(zeroVector, otherVector);

      // Then
      expect(similarity).toBe(0);
    });

    it('should throw error for mismatched dimensions', () => {
      // Given
      const embedding1 = [1, 2, 3];
      const embedding2 = [1, 2];

      // When & Then
      expect(() => service.calculateCosineSimilarity(embedding1, embedding2)).toThrow(
        'Embeddings must have the same dimension'
      );
    });
  });

  describe('findMostSimilar', () => {
    it('should find most similar embeddings', () => {
      // Given
      const queryEmbedding = [1, 0, 0];
      const candidates = [
        { id: 'a', embedding: [1, 0, 0] }, // Identical
        { id: 'b', embedding: [0, 1, 0] }, // Orthogonal
        { id: 'c', embedding: [0.8, 0.6, 0] }, // Similar
      ];

      // When
      const results = service.findMostSimilar(queryEmbedding, candidates, 2);

      // Then
      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('a'); // Most similar
      expect(results[0].similarity).toBeCloseTo(1, 5);
      expect(results[1].id).toBe('c'); // Second most similar
    });

    it('should respect topK limit', () => {
      // Given
      const queryEmbedding = [1, 0];
      const candidates = [
        { id: 'a', embedding: [1, 0] },
        { id: 'b', embedding: [0, 1] },
        { id: 'c', embedding: [0.5, 0.5] },
      ];

      // When
      const results = service.findMostSimilar(queryEmbedding, candidates, 1);

      // Then
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('a');
    });
  });

  describe('estimateTokenCount', () => {
    it('should estimate token count for texts', () => {
      // Given
      const texts = ['Hello', 'World test']; // 5 + 10 = 15 chars

      // When
      const tokenCount = service.estimateTokenCount(texts);

      // Then
      expect(tokenCount).toBe(4); // 15 chars / 4 = 3.75 -> 4 tokens
    });

    it('should handle empty texts array', () => {
      // When
      const tokenCount = service.estimateTokenCount([]);

      // Then
      expect(tokenCount).toBe(0);
    });
  });

  describe('validateEmbeddingDimensions', () => {
    it('should validate consistent dimensions', () => {
      // Given
      const embeddings = [
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
      ];

      // When
      const isValid = service.validateEmbeddingDimensions(embeddings);

      // Then
      expect(isValid).toBe(true);
    });

    it('should detect inconsistent dimensions', () => {
      // Given
      const embeddings = [
        [0.1, 0.2, 0.3],
        [0.4, 0.5], // Different dimension
      ];

      // When
      const isValid = service.validateEmbeddingDimensions(embeddings);

      // Then
      expect(isValid).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('Inconsistent embedding dimensions detected');
    });

    it('should validate against expected dimension', () => {
      // Given
      const embeddings = [[0.1, 0.2, 0.3]];

      // When
      const isValid = service.validateEmbeddingDimensions(embeddings, 2);

      // Then
      expect(isValid).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith('Embedding dimension mismatch', {
        expected: 2,
        actual: 3,
      });
    });

    it('should handle empty embeddings array', () => {
      // When
      const isValid = service.validateEmbeddingDimensions([]);

      // Then
      expect(isValid).toBe(true);
    });
  });
});
