import { openai } from './openaiClient';
import { Logger } from '../logging';
import { loggerConfig } from '../../config/loggerConfig';

const logger = new Logger({
  ...loggerConfig,
  logFile: 'logs/llm-retry.log',
});

interface RetryConfig {
  max_tokens?: number;
  temperature?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
}

export async function callLLMWithRetry(
  model: string,
  prompt: string,
  maxRetries: number = 3,
  backoffDelay: number = 1000,
  config: RetryConfig = {}
): Promise<any> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        ...config,
      });

      return completion;
    } catch (error: any) {
      lastError = error;

      // Check if error is due to rate limiting
      if (error.status === 429) {
        const delay = Math.pow(2, attempt) * backoffDelay;
        logger.warn(`Rate limit hit, waiting ${delay}ms before retry ${attempt}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // Check if error is due to invalid API key or other auth issues
      if (error.status === 401 || error.status === 403) {
        logger.error('Authentication error:', error);
        throw error;
      }

      // For other errors, retry with backoff if we haven't exceeded max retries
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * backoffDelay;
        logger.warn(`Error calling LLM, retrying in ${delay}ms. Attempt ${attempt}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // If we've exhausted all retries, throw the last error
      logger.error(`Failed after ${maxRetries} attempts:`, error);
      throw error;
    }
  }

  throw lastError || new Error('Unknown error in LLM call');
}
