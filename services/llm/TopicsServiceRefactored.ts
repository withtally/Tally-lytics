// services/llm/TopicsServiceRefactored.ts - Refactored topics service with dependency injection

import type { IOpenAIClient } from '../interfaces/IOpenAIClient';
import type { ILogger } from '../interfaces/ILogger';
import type { ITopicRepository, Topic } from '../../db/repositories/ITopicRepository';
import type { IPostRepository, Post } from '../../db/repositories/IPostRepository';
import type { TopicEvaluation, TopicChunkEvaluation } from './types';

export interface TopicSummaryResult {
  summary: string;
  tags: string[];
}

export interface TopicProcessingResult {
  processed: number;
  failed: number;
  errors: string[];
}

export interface TopicProcessingOptions {
  batchSize?: number;
  maxRetries?: number;
  chunkTokenLimit?: number;
}

/**
 * Service for processing and evaluating forum topics
 * Uses dependency injection for better testability
 */
export class TopicsService {
  private readonly DEFAULT_MAX_TOKENS = 4000;
  private readonly DEFAULT_CHUNK_TOKEN_LIMIT = 3500; // Leave margin for metadata
  private readonly DEFAULT_BATCH_SIZE = 10;

  constructor(
    private openaiClient: IOpenAIClient,
    private topicRepository: ITopicRepository,
    private postRepository: IPostRepository,
    private logger: ILogger
  ) {}

  /**
   * Fetch and summarize all unsummarized topics for a forum
   */
  async fetchAndSummarizeTopics(
    forumName: string,
    options: TopicProcessingOptions = {}
  ): Promise<TopicProcessingResult> {
    const { batchSize = this.DEFAULT_BATCH_SIZE } = options;
    
    this.logger.info('Starting topic summarization', { forumName, batchSize });

    try {
      const unsummarizedTopics = await this.topicRepository.findNeedingSummary(forumName);
      const topicsToProcess = unsummarizedTopics.slice(0, batchSize);

      let processed = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const topic of topicsToProcess) {
        try {
          await this.summarizeTopic(topic);
          processed++;
          
          this.logger.debug('Topic summarized successfully', { 
            topicId: topic.id,
            forumName: topic.forum_name 
          });
        } catch (error) {
          failed++;
          const errorMessage = `Topic ${topic.id} summarization failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMessage);
          
          this.logger.error('Topic summarization failed', {
            topicId: topic.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      this.logger.info('Topic summarization completed', {
        forumName,
        processed,
        failed,
        totalErrors: errors.length
      });

      return { processed, failed, errors };

    } catch (error) {
      this.logger.error('Failed to fetch and summarize topics', {
        forumName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Summarize a single topic
   */
  async summarizeTopic(topic: Topic): Promise<TopicSummaryResult> {
    this.logger.debug('Starting topic summarization', { topicId: topic.id });

    // Get the first post of the topic
    const posts = await this.postRepository.find({ topic_id: topic.id });
    
    if (!posts.length) {
      throw new Error(`No posts found for topic ${topic.id}`);
    }

    const firstPost = posts[0]; // Take the first post
    if (!firstPost.content || firstPost.content.trim().length === 0) {
      throw new Error(`Topic ${topic.id} has no content`);
    }

    // Generate summary and tags using LLM
    const { summary, tags } = await this.generateTopicSummary(firstPost.content);

    // Update the topic with the summary (would need to implement in repository)
    // await this.topicRepository.updateSummary(topic.id, summary, tags);

    this.logger.debug('Topic summarization completed', {
      topicId: topic.id,
      summaryLength: summary.length,
      tagCount: tags.length
    });

    return { summary, tags };
  }

  /**
   * Generate summary and tags for topic content using LLM
   */
  async generateTopicSummary(content: string): Promise<TopicSummaryResult> {
    const response = await this.openaiClient.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are an expert at analyzing forum discussions. Generate a concise summary and relevant tags for the given content. 
          
          Respond with JSON containing:
          - summary: string (2-3 sentences)
          - tags: array of strings (3-5 relevant tags)`
        },
        {
          role: 'user',
          content: `Summarize this topic content and provide relevant tags:\n\n${content}`
        }
      ],
      temperature: 0.3,
      max_tokens: 300,
      response_format: { type: 'json_object' }
    });

    const responseContent = response.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('No response content from OpenAI');
    }

    try {
      const parsed = JSON.parse(responseContent);
      
      if (!parsed.summary || !Array.isArray(parsed.tags)) {
        throw new Error('Invalid response format: missing summary or tags');
      }

      return {
        summary: parsed.summary,
        tags: parsed.tags.map((tag: any) => String(tag))
      };
    } catch (error) {
      throw new Error(`Failed to parse LLM response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Split text into chunks based on token limit
   */
  chunkText(text: string, maxTokens: number): string[] {
    // Simple approximation: 1 token ≈ 4 characters
    const maxChars = maxTokens * 4;
    
    if (text.length <= maxChars) {
      return [text];
    }

    const sentences = text.split(/(?<=[.?!])\s+/);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > maxChars && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence + ' ';
      } else {
        currentChunk += sentence + ' ';
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [text];
  }

  /**
   * Estimate token count for text (rough approximation)
   */
  estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }
}