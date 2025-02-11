import { Logger } from '../logging';

const logger = new Logger({ logFile: 'logs/llm-errors.log' });

export class LLMError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

export function handleLLMError(error: any): never {
  // OpenAI API errors
  if (error?.response?.status === 429) {
    logger.warn('OpenAI rate limit exceeded:', error);
    throw new LLMError('Rate limit exceeded. Please try again later.', 'RATE_LIMIT_EXCEEDED', true);
  }

  if (error?.response?.status === 400) {
    logger.error('OpenAI bad request:', error);
    throw new LLMError('Invalid request to language model.', 'INVALID_REQUEST', false);
  }

  // Generic error handling
  logger.error('Unexpected LLM error:', error);
  throw new LLMError('An error occurred while processing your request.', 'INTERNAL_ERROR', true);
}

export async function withLLMErrorHandling<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    logger.error(`LLM error in ${context}:`, error);
    handleLLMError(error);
  }
}
