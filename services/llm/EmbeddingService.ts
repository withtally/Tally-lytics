// services/llm/EmbeddingService.ts - Refactored embedding service with dependency injection

import type { IOpenAIClient } from '../interfaces/IOpenAIClient';
import type { ILogger } from '../interfaces/ILogger';

export interface EmbeddingOptions {
  model?: string;
  batchSize?: number;
}

export interface EmbeddingResult {
  embeddings: number[][];
  totalTokens: number;
  processingTime: number;
}

/**
 * Service for generating text embeddings using OpenAI
 * Uses dependency injection for better testability
 */
export class EmbeddingService {
  private readonly DEFAULT_MODEL = 'text-embedding-ada-002';
  private readonly DEFAULT_BATCH_SIZE = 100;

  constructor(
    private openaiClient: IOpenAIClient,
    private logger: ILogger
  ) {}

  /**
   * Generate embeddings for a batch of texts
   */
  async generateEmbeddings(
    texts: string[],
    options: EmbeddingOptions = {}
  ): Promise<EmbeddingResult> {
    const { model = this.DEFAULT_MODEL, batchSize = this.DEFAULT_BATCH_SIZE } = options;
    const startTime = Date.now();

    this.logger.info('Starting embedding generation', {
      textCount: texts.length,
      model,
      batchSize,
    });

    try {
      // Validate inputs
      if (!texts.length) {
        throw new Error('No texts provided for embedding generation');
      }

      if (texts.some(text => !text || text.trim().length === 0)) {
        throw new Error('All texts must be non-empty strings');
      }

      // Process in batches if needed
      const allEmbeddings: number[][] = [];
      let totalTokens = 0;

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const batchResult = await this.processBatch(batch, model);

        allEmbeddings.push(...batchResult.embeddings);
        totalTokens += batchResult.totalTokens;

        this.logger.debug('Processed embedding batch', {
          batchIndex: Math.floor(i / batchSize) + 1,
          batchSize: batch.length,
          totalProcessed: allEmbeddings.length,
        });
      }

      const processingTime = Date.now() - startTime;

      this.logger.info('Embedding generation completed', {
        textCount: texts.length,
        totalTokens,
        processingTimeMs: processingTime,
        avgTokensPerText: Math.round(totalTokens / texts.length),
      });

      return {
        embeddings: allEmbeddings,
        totalTokens,
        processingTime,
      };
    } catch (error) {
      this.logger.error('Embedding generation failed', {
        textCount: texts.length,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTimeMs: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Generate embedding for a single text
   */
  async generateSingleEmbedding(text: string, options: EmbeddingOptions = {}): Promise<number[]> {
    const result = await this.generateEmbeddings([text], options);
    return result.embeddings[0];
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  calculateCosineSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimension');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);

    if (magnitude === 0) {
      return 0;
    }

    return dotProduct / magnitude;
  }

  /**
   * Find the most similar embeddings to a query embedding
   */
  findMostSimilar(
    queryEmbedding: number[],
    candidates: Array<{ id: string; embedding: number[] }>,
    topK: number = 5
  ): Array<{ id: string; similarity: number }> {
    const similarities = candidates.map(candidate => ({
      id: candidate.id,
      similarity: this.calculateCosineSimilarity(queryEmbedding, candidate.embedding),
    }));

    return similarities.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
  }

  /**
   * Process a single batch of texts
   */
  private async processBatch(
    texts: string[],
    model: string
  ): Promise<{ embeddings: number[][]; totalTokens: number }> {
    try {
      const response = await this.openaiClient.embeddings.create({
        model,
        input: texts,
      });

      const embeddings = response.data.map(item => item.embedding);
      const totalTokens = response.usage?.total_tokens || 0;

      // Validate response
      if (embeddings.length !== texts.length) {
        throw new Error(`Expected ${texts.length} embeddings, got ${embeddings.length}`);
      }

      return { embeddings, totalTokens };
    } catch (error: any) {
      // Handle specific OpenAI errors
      if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }

      if (error.response?.status === 401) {
        throw new Error('Invalid OpenAI API key');
      }

      if (error.response?.data?.error) {
        throw new Error(`OpenAI API error: ${error.response.data.error.message}`);
      }

      throw new Error(`Embedding generation failed: ${error.message}`);
    }
  }

  /**
   * Estimate token count for texts (rough approximation)
   */
  estimateTokenCount(texts: string[]): number {
    // Rough approximation: 1 token ≈ 4 characters for English text
    const totalChars = texts.reduce((sum, text) => sum + text.length, 0);
    return Math.ceil(totalChars / 4);
  }

  /**
   * Validate embedding dimensions
   */
  validateEmbeddingDimensions(embeddings: number[][], expectedDimension?: number): boolean {
    if (!embeddings.length) return true;

    const firstDimension = embeddings[0].length;

    if (expectedDimension && firstDimension !== expectedDimension) {
      this.logger.warn('Embedding dimension mismatch', {
        expected: expectedDimension,
        actual: firstDimension,
      });
      return false;
    }

    // Check all embeddings have the same dimension
    const allSameDimension = embeddings.every(emb => emb.length === firstDimension);

    if (!allSameDimension) {
      this.logger.error('Inconsistent embedding dimensions detected');
      return false;
    }

    return true;
  }
}
