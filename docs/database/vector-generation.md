# Vector Generation Implementation Guide

## Overview

This guide details our implementation of vector generation for semantic search functionality. We use OpenAI's text-embedding-ada-002 model to generate embeddings, with a comprehensive system for handling content processing, vector generation, and storage.

## Vector Generation Service

### Base Implementation

```typescript
// services/llm/embeddings/embeddingService.ts
import { OpenAI } from 'openai';
import { Logger } from '../../logging';
import { RateLimiter } from 'limiter';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Rate limiter: 3000 tokens per minute (OpenAI's rate limit)
const limiter = new RateLimiter({
  tokensPerInterval: 3000,
  interval: 'minute',
});

export async function generateEmbeddings(
  texts: string[],
  retries = 3
): Promise<number[][]> {
  try {
    await limiter.removeTokens(1);

    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: texts,
    });

    return response.data.map(item => item.embedding);
  } catch (error: any) {
    if (retries > 0 && error.status === 429) {
      // Rate limit hit, wait and retry
      await new Promise(resolve => setTimeout(resolve, 2000));
      return generateEmbeddings(texts, retries - 1);
    }
    throw error;
  }
}
```

### Content Processing Service

```typescript
// services/content/contentProcessingService.ts
import { truncateText } from '../../utils/textUtils';
import { generateEmbeddings } from '../llm/embeddings/embeddingService';
import { Logger } from '../logging';

interface ProcessedContent {
  title_vector?: number[];
  content_vector: number[];
  combined_vector: number[];
}

export class ContentProcessingService {
  private logger: Logger;
  private MAX_TOKENS = 8000; // OpenAI's limit

  constructor() {
    this.logger = new Logger({
      logFile: 'logs/content-processing.log',
    });
  }

  private combineVectors(vectors: number[][]): number[] {
    // Average the vectors
    const vectorLength = vectors[0].length;
    const combined = new Array(vectorLength).fill(0);
    
    for (const vector of vectors) {
      for (let i = 0; i < vectorLength; i++) {
        combined[i] += vector[i];
      }
    }
    
    for (let i = 0; i < vectorLength; i++) {
      combined[i] /= vectors.length;
    }
    
    return combined;
  }

  private preprocessText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s.,!?-]/g, '') // Remove special characters
      .toLowerCase();
  }

  async processContent(
    content: string,
    title?: string
  ): Promise<ProcessedContent> {
    try {
      const processedContent = this.preprocessText(content);
      const truncatedContent = truncateText(processedContent, this.MAX_TOKENS);
      
      const vectors: ProcessedContent = {
        content_vector: (await generateEmbeddings([truncatedContent]))[0],
        combined_vector: [], // Will be set after all vectors are generated
      };

      if (title) {
        const processedTitle = this.preprocessText(title);
        vectors.title_vector = (await generateEmbeddings([processedTitle]))[0];
      }

      // Combine vectors if we have both title and content
      const vectorsToCombin = [vectors.content_vector];
      if (vectors.title_vector) {
        vectorsToCombin.push(vectors.title_vector);
      }
      vectors.combined_vector = this.combineVectors(vectorsToCombin);

      return vectors;
    } catch (error: any) {
      this.logger.error('Error processing content:', error);
      throw error;
    }
  }
}
```

### Vector Storage Service

```typescript
// services/vectors/vectorStorageService.ts
import db from '../../db/db';
import { Logger } from '../logging';
import { ContentProcessingService } from '../content/contentProcessingService';

export class VectorStorageService {
  private logger: Logger;
  private contentProcessor: ContentProcessingService;

  constructor() {
    this.logger = new Logger({
      logFile: 'logs/vector-storage.log',
    });
    this.contentProcessor = new ContentProcessingService();
  }

  async storeTopicVectors(
    topicId: number,
    forumId: number,
    content: string,
    title?: string
  ): Promise<void> {
    const trx = await db.transaction();
    
    try {
      const vectors = await this.contentProcessor.processContent(content, title);

      await trx('topic_vectors').insert({
        topic_id: topicId,
        forum_id: forumId,
        title_vector: title ? `[${vectors.title_vector!.join(',')}]` : null,
        content_vector: `[${vectors.content_vector.join(',')}]`,
        combined_vector: `[${vectors.combined_vector.join(',')}]`,
      });

      await trx.commit();
    } catch (error: any) {
      await trx.rollback();
      this.logger.error(`Error storing vectors for topic ${topicId}:`, error);
      throw error;
    }
  }

  async storePostVectors(
    postId: number,
    forumId: number,
    content: string
  ): Promise<void> {
    const trx = await db.transaction();
    
    try {
      const vectors = await this.contentProcessor.processContent(content);

      await trx('post_vectors').insert({
        post_id: postId,
        forum_id: forumId,
        content_vector: `[${vectors.content_vector.join(',')}]`,
      });

      await trx.commit();
    } catch (error: any) {
      await trx.rollback();
      this.logger.error(`Error storing vectors for post ${postId}:`, error);
      throw error;
    }
  }

  async updateTopicVectors(
    topicId: number,
    content: string,
    title?: string
  ): Promise<void> {
    const trx = await db.transaction();
    
    try {
      const vectors = await this.contentProcessor.processContent(content, title);

      await trx('topic_vectors')
        .where({ topic_id: topicId })
        .update({
          title_vector: title ? `[${vectors.title_vector!.join(',')}]` : null,
          content_vector: `[${vectors.content_vector.join(',')}]`,
          combined_vector: `[${vectors.combined_vector.join(',')}]`,
          updated_at: trx.fn.now(),
        });

      await trx.commit();
    } catch (error: any) {
      await trx.rollback();
      this.logger.error(`Error updating vectors for topic ${topicId}:`, error);
      throw error;
    }
  }
}
```

### Batch Processing Service

```typescript
// services/vectors/batchProcessingService.ts
import db from '../../db/db';
import { Logger } from '../logging';
import { VectorStorageService } from './vectorStorageService';
import { chunk } from 'lodash';

export class BatchProcessingService {
  private logger: Logger;
  private vectorStorage: VectorStorageService;
  private BATCH_SIZE = 50;

  constructor() {
    this.logger = new Logger({
      logFile: 'logs/batch-processing.log',
    });
    this.vectorStorage = new VectorStorageService();
  }

  async processUnvectorizedTopics(): Promise<void> {
    try {
      // Get topics without vectors
      const topics = await db('topics')
        .leftJoin('topic_vectors', 'topics.id', 'topic_vectors.topic_id')
        .whereNull('topic_vectors.id')
        .select('topics.*');

      // Process in batches
      const batches = chunk(topics, this.BATCH_SIZE);
      
      for (const batch of batches) {
        await Promise.all(
          batch.map(topic =>
            this.vectorStorage.storeTopicVectors(
              topic.id,
              topic.forum_id,
              topic.content,
              topic.title
            ).catch(error => {
              this.logger.error(
                `Error processing topic ${topic.id}:`,
                error
              );
            })
          )
        );
      }
    } catch (error: any) {
      this.logger.error('Error in batch processing:', error);
      throw error;
    }
  }

  async reprocessVectors(forumId?: number): Promise<void> {
    try {
      // Get all topics that need reprocessing
      const query = db('topics')
        .join('topic_vectors', 'topics.id', 'topic_vectors.topic_id')
        .select('topics.*');

      if (forumId) {
        query.where('topics.forum_id', forumId);
      }

      const topics = await query;
      const batches = chunk(topics, this.BATCH_SIZE);

      for (const batch of batches) {
        await Promise.all(
          batch.map(topic =>
            this.vectorStorage.updateTopicVectors(
              topic.id,
              topic.content,
              topic.title
            ).catch(error => {
              this.logger.error(
                `Error reprocessing topic ${topic.id}:`,
                error
              );
            })
          )
        );
      }
    } catch (error: any) {
      this.logger.error('Error in vector reprocessing:', error);
      throw error;
    }
  }
}
```

## Usage Examples

### Processing New Content

```typescript
// Example: Processing a new topic
const vectorStorage = new VectorStorageService();

async function createTopicWithVectors(
  forumId: number,
  title: string,
  content: string
): Promise<number> {
  const trx = await db.transaction();
  
  try {
    // Insert topic
    const [topicId] = await trx('topics')
      .insert({
        forum_id: forumId,
        title,
        content,
      })
      .returning('id');

    // Generate and store vectors
    await vectorStorage.storeTopicVectors(
      topicId,
      forumId,
      content,
      title
    );

    await trx.commit();
    return topicId;
  } catch (error) {
    await trx.rollback();
    throw error;
  }
}
```

### Batch Processing

```typescript
// Example: Processing backlog of content
const batchProcessor = new BatchProcessingService();

async function processBacklog() {
  try {
    await batchProcessor.processUnvectorizedTopics();
    console.log('Backlog processing complete');
  } catch (error) {
    console.error('Error processing backlog:', error);
  }
}
```

## Best Practices

1. **Error Handling**
   - Implement proper retry logic for API calls
   - Use transactions for database operations
   - Log errors with sufficient context

2. **Performance**
   - Batch process vectors when possible
   - Implement rate limiting
   - Use connection pooling

3. **Data Quality**
   - Preprocess text before generating vectors
   - Validate vector dimensions
   - Handle edge cases (empty content, very long content)

4. **Monitoring**
   - Track API usage and costs
   - Monitor processing times
   - Log processing errors

## Testing

```typescript
// Example: Vector generation test
describe('Vector Generation', () => {
  it('should generate correct dimension vectors', async () => {
    const content = 'Test content';
    const processor = new ContentProcessingService();
    const vectors = await processor.processContent(content);
    
    expect(vectors.content_vector.length).toBe(1536);
    expect(vectors.combined_vector.length).toBe(1536);
  });
});
```

## Error Handling

```typescript
// Example: Error handling implementation
async function generateVectorsWithRetry(
  content: string,
  maxRetries = 3
): Promise<number[]> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const [vector] = await generateEmbeddings([content]);
      return vector;
    } catch (error: any) {
      if (
        attempt === maxRetries ||
        !error.message.includes('rate limit')
      ) {
        throw error;
      }
      await new Promise(resolve =>
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }
  throw new Error('Max retries exceeded');
}
```

This implementation provides a robust foundation for generating and managing vectors in a production environment, with proper error handling, monitoring, and scalability considerations. 