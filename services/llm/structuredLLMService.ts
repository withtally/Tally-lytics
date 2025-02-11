import { Logger } from '../logging';
import { OpenAI } from 'openai';
import { withLLMErrorHandling } from '../errorHandling/llmErrors';

const logger = new Logger({ logFile: 'logs/structured-llm-service.log', level: 'info' });
const openai = new OpenAI();

/**
 * Generates a structured JSON response using GPT-4 Turbo
 * @param prompt The chat prompt
 * @returns Generated JSON response string
 */
export async function generateStructuredResponse(prompt: string): Promise<string> {
  return withLLMErrorHandling(async () => {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-1106-preview',
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
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    return content;
  }, 'generateStructuredResponse');
}

/**
 * Generates common topics from forum posts with proper JSON formatting
 * @param forum Forum name
 * @param timeframe Time period
 * @param recentPosts Array of recent posts
 * @returns Array of common topics
 */
export async function generateCommonTopicsStructured(
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
    
    Format the response as a JSON object with a 'topics' array containing objects with properties:
    {
      "topics": [
        {
          "title": string,
          "description": string,
          "frequency": number
        }
      ]
    }
    `;

    const response = await generateStructuredResponse(prompt);
    const topics = JSON.parse(response).topics;

    if (!Array.isArray(topics)) {
      throw new Error('Invalid topics format returned');
    }

    return topics;
  } catch (error) {
    logger.error('Error generating common topics:', error);
    throw error;
  }
}
