import { Logger } from '../logging';
import { OpenAI } from 'openai';
import { withLLMErrorHandling } from '../errorHandling/llmErrors';

const logger = new Logger({ logFile: 'logs/llm-service.log', level: 'info' });
const openai = new OpenAI();

/**
 * Generates alternative phrasings or similes for a search query to improve search context
 * @param query The original search query
 * @returns Array of alternative phrasings/similes
 */
export async function generateQuerySimile(query: string, forum?: string): Promise<string> {
  try {
    const prompt = `Given the search query "${query}"${forum ? ` for the ${forum} forum` : ''}, 
    generate a semantically similar but differently worded query that might help find relevant results. 
    The new query should:
    1. Maintain the core intent of the original query
    2. Use alternative terminology or phrasing
    3. Be concise and clear
    4. Not include any explanatory text, just return the query
    `;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant that generates alternative search queries while maintaining the original intent.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 100,
    });

    const similarQuery = completion.choices[0]?.message?.content?.trim();
    if (!similarQuery) {
      throw new Error('No similar query generated');
    }

    return similarQuery;
  } catch (error: any) {
    logger.error('Error generating similar query:', error as object);
    throw error;
  }
}

/**
 * Generates a chat response based on provided context
 * @param prompt The chat prompt
 * @returns Generated response string
 */
export async function generateLLMChatResponse(prompt: string): Promise<string> {
  return withLLMErrorHandling(async () => {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant that always returns responses in valid JSON format.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    return content;
  }, 'generateLLMChatResponse');
}

/**
 * Generates follow-up questions based on search results
 * @param query Original search query
 * @param forum Forum name
 * @param context Search results
 * @returns Array of follow-up questions
 */
export async function generateFollowUpQuestions(
  query: string,
  forum?: string,
  context?: any
): Promise<string[]> {
  try {
    let contextPrompt = '';
    if (context) {
      contextPrompt = `\nBased on the search results: ${JSON.stringify(context)}`;
    }

    const prompt = `Given the search query "${query}"${forum ? ` in the ${forum} forum` : ''}${contextPrompt},
    generate 3-5 relevant follow-up questions that would help users explore related topics or get more specific information.
    The questions should:
    1. Be naturally related to the original query
    2. Cover different aspects or angles of the topic
    3. Help users dive deeper into the subject
    4. Be clear and concise
    5. Return only the questions, one per line, without any numbering or explanatory text
    `;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant that generates relevant follow-up questions to help users explore topics more deeply.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    const questions = completion.choices[0]?.message?.content
      ?.trim()
      .split('\n')
      .map(q => q.trim())
      .filter(q => q.length > 0);

    if (!questions || questions.length === 0) {
      throw new Error('No follow-up questions generated');
    }

    return questions;
  } catch (error: any) {
    logger.error('Error generating follow-up questions:', error as object);
    throw error;
  }
}

export async function generateCommonTopics(
  forum: string,
  timeframe: string,
  recentPosts: any[]
): Promise<any[]> {
  try {
    const prompt = `Given the following recent posts from the ${forum} forum in the ${timeframe} timeframe:
    ${JSON.stringify(recentPosts)}

    Identify and summarize the most common or trending topics. For each topic provide:
    1. A clear, concise title
    2. A brief description
    3. The frequency or relevance score
    
    Format the response as a JSON array of objects with properties:
    {
      title: string,
      description: string,
      frequency: number
    }
    `;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant that analyzes forum posts to identify common topics and trends.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.5,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No topics generated');
    }

    const topics = JSON.parse(response).topics;
    if (!Array.isArray(topics)) {
      throw new Error('Invalid topics format returned');
    }

    return topics;
  } catch (error: any) {
    logger.error('Error generating common topics:', error as object);
    throw error;
  }
}
