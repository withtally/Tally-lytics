// services/llm/PostEvaluationService.ts - Refactored post evaluation service with dependency injection

import type { IOpenAIClient } from '../interfaces/IOpenAIClient';
import type { ILogger } from '../interfaces/ILogger';
import type { IPostRepository, Post } from '../../db/repositories/IPostRepository';

export interface PostEvaluation {
  quality_score: number;
  relevance_score: number;
  summary: string;
  tags: string[];
}

export interface EvaluationResult {
  processed: number;
  failed: number;
  errors: string[];
}

export interface EvaluationOptions {
  batchSize?: number;
  maxRetries?: number;
}

/**
 * Service for evaluating post content using LLM
 * Uses dependency injection for better testability
 */
export class PostEvaluationService {
  constructor(
    private openaiClient: IOpenAIClient,
    private postRepository: IPostRepository,
    private logger: ILogger
  ) {}

  /**
   * Evaluate a single post by ID
   */
  async evaluatePost(postId: string): Promise<PostEvaluation> {
    this.logger.info('Starting post evaluation', { postId });

    const post = await this.postRepository.findById(postId);
    if (!post) {
      throw new Error(`Post not found: ${postId}`);
    }

    try {
      const evaluation = await this.performEvaluation(post);

      // Update post with evaluation results
      await this.postRepository.markAsEvaluated(postId, {
        quality_score: evaluation.quality_score,
        relevance_score: evaluation.relevance_score,
        ai_summary: evaluation.summary,
        ai_tags: evaluation.tags,
      });

      this.logger.info('Post evaluation completed', {
        postId,
        qualityScore: evaluation.quality_score,
        relevanceScore: evaluation.relevance_score,
      });

      return evaluation;
    } catch (error) {
      this.logger.error('Post evaluation failed', { postId, error });
      throw error;
    }
  }

  /**
   * Evaluate all unevaluated posts for a forum
   */
  async evaluateUnanalyzedPosts(
    forumName: string,
    options: EvaluationOptions = {}
  ): Promise<EvaluationResult> {
    const { batchSize = 10, maxRetries = 3 } = options;

    this.logger.info('Starting batch post evaluation', { forumName, batchSize });

    const unevaluatedPosts = await this.postRepository.findUnevaluated(forumName);
    const postsToProcess = unevaluatedPosts.slice(0, batchSize);

    let processed = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const post of postsToProcess) {
      let retries = 0;
      let success = false;

      while (retries < maxRetries && !success) {
        try {
          await this.evaluatePost(post.id);
          processed++;
          success = true;
        } catch (error) {
          retries++;
          const errorMessage = `Post ${post.id} evaluation failed (attempt ${retries}): ${error instanceof Error ? error.message : 'Unknown error'}`;

          if (retries === maxRetries) {
            this.logger.error('Post evaluation failed after all retries', {
              postId: post.id,
              retries,
              error,
            });
            failed++;
            errors.push(errorMessage);
          } else {
            this.logger.warn('Post evaluation failed, retrying', {
              postId: post.id,
              attempt: retries,
              error,
            });
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * retries));
          }
        }
      }
    }

    this.logger.info('Batch post evaluation completed', {
      forumName,
      processed,
      failed,
      totalErrors: errors.length,
    });

    return { processed, failed, errors };
  }

  /**
   * Perform the actual LLM evaluation
   */
  private async performEvaluation(post: Post): Promise<PostEvaluation> {
    const prompt = this.generateEvaluationPrompt(post);

    const response = await this.openaiClient.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert at evaluating DAO governance content. Respond only with valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response content from OpenAI');
    }

    return this.parseEvaluationResponse(content);
  }

  /**
   * Generate evaluation prompt for a post
   */
  generateEvaluationPrompt(post: Post): string {
    return `Please evaluate this ${post.forum_name} forum post for quality and relevance to DAO governance.

Post Content:
"${post.content}"

Author: ${post.author}
Post Number: ${post.post_number}

Evaluate and respond with JSON containing:
- quality_score: number between 0-1 (1 = highest quality)
- relevance_score: number between 0-1 (1 = most relevant to governance)
- summary: string (2-3 sentences summarizing the post)
- tags: array of strings (3-5 relevant tags from: governance, proposal, discussion, technical, community, treasury, development, partnerships, marketing, security, voting, delegation, grants, ecosystem)

Consider:
- Content depth and thoughtfulness
- Relevance to DAO governance and decision-making
- Constructiveness of the discussion
- Technical accuracy (if applicable)
- Community value`;
  }

  /**
   * Parse and validate LLM evaluation response
   */
  parseEvaluationResponse(content: string): PostEvaluation {
    let parsed: any;

    try {
      parsed = JSON.parse(content);
    } catch (error) {
      throw new Error('Invalid evaluation response format: not valid JSON');
    }

    // Validate required fields
    const requiredFields = ['quality_score', 'relevance_score', 'summary', 'tags'];
    const missingFields = requiredFields.filter(field => !(field in parsed));

    if (missingFields.length > 0) {
      throw new Error(`Missing required evaluation fields: ${missingFields.join(', ')}`);
    }

    // Validate types and ranges
    if (
      typeof parsed.quality_score !== 'number' ||
      parsed.quality_score < 0 ||
      parsed.quality_score > 1
    ) {
      throw new Error('quality_score must be a number between 0 and 1');
    }

    if (
      typeof parsed.relevance_score !== 'number' ||
      parsed.relevance_score < 0 ||
      parsed.relevance_score > 1
    ) {
      throw new Error('relevance_score must be a number between 0 and 1');
    }

    if (typeof parsed.summary !== 'string' || parsed.summary.length === 0) {
      throw new Error('summary must be a non-empty string');
    }

    if (!Array.isArray(parsed.tags) || parsed.tags.length === 0) {
      throw new Error('tags must be a non-empty array');
    }

    return {
      quality_score: Math.round(parsed.quality_score * 100) / 100, // Round to 2 decimal places
      relevance_score: Math.round(parsed.relevance_score * 100) / 100,
      summary: parsed.summary,
      tags: parsed.tags.map((tag: any) => String(tag)), // Ensure all tags are strings
    };
  }
}
