import { Logger } from '../logging';
import db from '../../db/db';
import { VectorSearchService } from '../search/vectorSearchService';
import { generateLLMChatResponse } from '../llm/llmService';
import { generateCommonTopicsStructured } from '../llm/structuredLLMService';
import { CitationFormatter } from '../utils/citationFormatter';
import { config } from '../../config/index';
import type { ForumConfig } from '../../config/forumConfig';
import { LoggingConfig } from '../logging/types';

const logger = new Logger({
  logFile: 'logs/common-topics.log',
  level: 'info',
} as LoggingConfig);
const searchService = new VectorSearchService();

interface CommonTopic {
  id?: number;
  name: string;
  base_metadata: string;
  full_data: string;
  context: string;
  citations: string;
  forum_name: string;
}

interface ForumSearchResult {
  id: number;
  title: string;
  content: string;
  topic_id: number;
  post_number?: number;
  username?: string;
  slug?: string;
  forum_name: string;
}

interface TopicSummary {
  name: string;
  base_metadata: string;
  full_data: string;
  context: string;
  citations: string;
}

interface GeneratedTopic {
  title: string;
  description: string;
  frequency?: number;
}

export class CommonTopicsService {
  /**
   * Gets a citation formatter for a specific forum
   */
  private getCitationFormatter(forumName: string): CitationFormatter {
    const forumConfig = config.forums[forumName.toLowerCase() as keyof typeof config.forums];
    if (!forumConfig) {
      logger.warn(`No forum config found for ${forumName}, using default citation formatting`);
      // Use a basic formatter without forum-specific config if none exists
      return new CitationFormatter({
        apiConfig: {
          apiKey: '',
          apiUsername: '',
          discourseUrl: '',
        },
      } as ForumConfig);
    }
    return new CitationFormatter(forumConfig);
  }

  /**
   * Generates a common topic summary from search results
   */
  private async generateTopicSummary(
    query: string,
    results: ForumSearchResult[]
  ): Promise<Omit<CommonTopic, 'id'>> {
    // Format citations with URLs
    const formattedCitations = this.getCitationFormatter(
      results[0]?.forum_name || 'unknown'
    ).formatCitations(results);

    // Create context from results
    const context = results
      .slice(0, 5)
      .map(r => `Title: ${r.title}\nContent: ${r.content}`)
      .join('\n\n');

    // Generate summary prompt
    const summaryPrompt = `Analyze these search results about "${query}":
${context}

Generate a comprehensive summary and return it as a JSON object with these exact fields:
{
  "name": "topic name",
  "base_metadata": "brief overview (2-3 sentences)",
  "full_data": "comprehensive summary with key points and details",
  "context": "key concepts and relationships",
  "citations": "relevant quotes from the source material"
}

Important: Return ONLY the JSON object, no additional text or explanation.`;

    const response = await generateLLMChatResponse(summaryPrompt);

    try {
      const summary = JSON.parse(response) as TopicSummary;
      return {
        name: query,
        base_metadata: summary.base_metadata,
        full_data: summary.full_data,
        context: summary.context,
        citations: formattedCitations,
        forum_name: results[0]?.forum_name || 'unknown',
      };
    } catch (error) {
      logger.error('Error parsing LLM summary response:', error as Error);
      throw new Error('Failed to generate topic summary');
    }
  }

  /**
   * Processes recent search queries to generate common topics
   * @param {string} timeframe - Time range in PostgreSQL interval format (e.g., '7d', '2 weeks', '1 month')
   */
  async generateCommonTopicsFromSearchLogs(timeframe: string = '14d'): Promise<void> {
    try {
      // Get recent search queries
      const recentQueries = await db('search_log')
        .select('query', 'forum_name')
        .where('created_at', '>', db.raw(`NOW() - INTERVAL '${timeframe}'`))
        .groupBy('query', 'forum_name')
        .orderByRaw('COUNT(*) DESC')
        .limit(20);

      for (const { query, forum_name } of recentQueries) {
        try {
          // Search for relevant content
          const results = await searchService.search({
            query,
            type: 'topic',
            forum: forum_name,
            limit: 10,
            threshold: 0.5,
          });

          if (results.length === 0) {
            logger.warn(`No results found for query: ${query}`);
            continue;
          }

          // Generate topic summary using structured LLM service
          const topics = await generateCommonTopicsStructured(
            forum_name,
            timeframe,
            results.map(r => ({ title: r.title, content: r.content }))
          );

          // Store each generated topic
          for (const topic of topics) {
            await db('common_topics')
              .insert({
                name: topic.title,
                base_metadata: topic.description,
                full_data: JSON.stringify(topic),
                context: results.map(r => r.title).join(', '),
                citations: results.map(r => r.content).join('\n\n'),
                forum_name,
                updated_at: db.fn.now(),
              })
              .onConflict(['name', 'forum_name'])
              .merge();
          }

          logger.info(`Generated common topics for: ${query}`);
        } catch (error) {
          logger.error('Error processing query:', error as Error);
          continue;
        }
      }
    } catch (error) {
      logger.error('Error in generateCommonTopics:', error as Error);
      throw error;
    }
  }

  /**
   * Retrieves common topics, optionally filtered by forum
   */
  async getCommonTopics(forumNames?: string[]): Promise<CommonTopic[]> {
    try {
      let query = db('common_topics').select('*').orderBy('updated_at', 'desc');

      if (forumNames && forumNames.length > 0) {
        query = query.whereIn('forum_name', forumNames);
      }

      return await query;
    } catch (error) {
      logger.error('Error fetching common topics:', error as Error);
      throw error;
    }
  }

  /**
   * Retrieves a specific common topic by ID
   */
  async getCommonTopicById(id: number): Promise<CommonTopic | null> {
    try {
      const topic = await db('common_topics').select('*').where({ id }).first();

      return topic || null;
    } catch (error) {
      logger.error(`Error fetching common topic ${id}:`, error as Error);
      throw error;
    }
  }

  /**
   * Generates common topics from recent posts in a specific forum
   * @param {string} forum - The forum name to generate topics for
   * @param {string} timeframe - Time range in PostgreSQL interval format (e.g., '7d', '2 weeks', '1 month')
   * @returns {Promise<GeneratedTopic[]>} Array of generated topics
   */
  async generateCommonTopics(forum: string, timeframe: string = '14d'): Promise<GeneratedTopic[]> {
    try {
      // Get recent posts from the database
      const recentPosts = await db('posts')
        .select('plain_text', 'cooked', 'topic_id', 'id', 'forum_name', 'username')
        .where('forum_name', forum)
        .where('created_at', '>', db.raw(`NOW() - INTERVAL '${timeframe}'`))
        .orderBy('created_at', 'desc')
        .limit(50);

      // Require at least 5 posts to generate meaningful topics
      const MINIMUM_POSTS_REQUIRED = 5;
      if (recentPosts.length < MINIMUM_POSTS_REQUIRED) {
        const error = new Error(
          `Insufficient data: Found ${recentPosts.length} posts, but need at least ${MINIMUM_POSTS_REQUIRED} posts to generate meaningful topics. Please wait for more forum activity.`
        );
        error.name = 'InsufficientDataError';
        throw error;
      }

      // Format posts for citation and LLM
      const formattedPosts = recentPosts.map(post => ({
        id: post.id,
        title: post.cooked.split('\n')[0].slice(0, 100), // Use first line of cooked content as title
        content: post.plain_text,
        topic_id: post.topic_id,
        username: post.username,
        forum_name: post.forum_name,
      }));

      // Generate formatted citations with URLs
      const formattedCitations = this.getCitationFormatter(forum).formatCitations(formattedPosts);

      // Generate topics using the structured LLM service
      const topics = await generateCommonTopicsStructured(forum, timeframe, formattedPosts);

      // Store each generated topic
      for (const topic of topics) {
        await db('common_topics')
          .insert({
            name: topic.title,
            base_metadata: topic.description,
            full_data: JSON.stringify(topic),
            context: formattedPosts.map(p => p.title).join(', '),
            citations: formattedCitations,
            forum_name: forum,
            updated_at: db.fn.now(),
          })
          .onConflict(['name', 'forum_name'])
          .merge();
      }

      return topics;
    } catch (error) {
      logger.error('Error generating common topics:', error as Error);
      throw error;
    }
  }
}

export const commonTopicsService = new CommonTopicsService();
