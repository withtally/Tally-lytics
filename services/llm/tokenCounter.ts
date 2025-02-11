import { encode } from 'gpt-3-encoder';
import { Logger } from '../logging';
import { loggerConfig } from '../../config/loggerConfig';

const logger = new Logger({
  ...loggerConfig,
  logFile: 'logs/token-counter.log',
});

const MODEL_TOKEN_LIMITS: { [key: string]: number } = {
  'gpt-4': 8192,
  'gpt-4-32k': 32768,
  'gpt-3.5-turbo': 4096,
  'gpt-3.5-turbo-16k': 16384,
  'gpt-4-1106-preview': 128000,
  'gpt-4-vision-preview': 128000,
};

export async function countTokens(text: string, _model: string): Promise<number> {
  try {
    // Use GPT tokenizer to count tokens
    const tokens = encode(text);
    return tokens.length;
  } catch (error: any) {
    logger.error('Error counting tokens:', error);
    // Fallback to rough estimation if tokenizer fails
    return Math.ceil(text.split(/\s+/).length * 1.3);
  }
}

export function checkTokenLimit(text: string, model: string = 'gpt-4'): boolean {
  const limit = MODEL_TOKEN_LIMITS[model] || 4096; // Default to 4096 if model not found
  const count = countTokens(text, model);
  return count <= limit;
}

export function truncateToTokenLimit(
  text: string,
  model: string = 'gpt-4',
  buffer: number = 100
): string {
  const limit = MODEL_TOKEN_LIMITS[model] || 4096;
  const targetLimit = limit - buffer;

  let tokens = encode(text);
  if (tokens.length <= targetLimit) {
    return text;
  }

  // Truncate tokens and decode back to text
  tokens = tokens.slice(0, targetLimit);
  const truncatedText = tokens.map(token => String.fromCharCode(token)).join('');

  logger.info(
    `Text truncated from ${text.length} chars to ${truncatedText.length} chars to fit token limit`
  );
  return truncatedText;
}
