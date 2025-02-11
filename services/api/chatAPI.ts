import { generateChatResponse } from '../llm/chatLLMService';
import { VectorSearchService } from '../search/vectorSearchService';
import { Logger } from '../logging';
import db from '../../db/db';

const logger = new Logger({ logFile: 'logs/chat-api.log', level: 'info' });
const searchService = new VectorSearchService();

interface ChatRequest {
  message: string;
  forumNames?: string[];
}

interface ChatResponse {
  answer: string;
  context?: string;
  sources?: {
    title: string;
    content: string;
    similarity: number;
  }[];
}

export async function generalChat(body: ChatRequest): Promise<ChatResponse> {
  try {
    const { message, forumNames } = body;
    if (!message) {
      throw new Error('Missing message');
    }

    // Search across all content types for relevant context
    const searchResults = await searchService.search({
      query: message,
      type: 'topic', // Start with topics for broader context
      forum: forumNames?.join(',') || '',
      limit: 5,
      threshold: 0.5,
      boostRecent: true, // Prefer recent content
      useCache: true, // Use LLM reranking
    });

    // If no relevant results found, inform the user
    if (!searchResults.length) {
      return {
        answer:
          "I couldn't find any relevant information in the database to answer your question. Could you try rephrasing your question or providing more specific details about what you'd like to know?",
        context: '',
        sources: [],
      };
    }

    // Construct context from search results
    const contextText = searchResults
      .map(
        result =>
          `Title: ${result.title || 'Untitled'}\nContent: ${result.content}\nSimilarity: ${result.similarity}`
      )
      .join('\n\n');

    const answer = await generateChatResponse(contextText, message);

    // Log the interaction for analytics
    try {
      await db('search_log').insert({
        query: message,
        forum_name: forumNames?.join(',') || 'all',
      });
    } catch (error) {
      logger.warn('Failed to log chat interaction:', error as Error);
      // Don't throw - logging failure shouldn't affect the response
    }

    return {
      answer,
      context: contextText,
      sources: searchResults.map(({ title, content, similarity }) => ({
        title: title || 'Untitled',
        content: content?.slice(0, 200) + '...' || 'No content available', // Truncate for response
        similarity,
      })),
    };
  } catch (error) {
    logger.error('Error in general chat:', error as Error);
    throw error;
  }
}
