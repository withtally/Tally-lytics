// services/embeddings/embeddingService.ts

import { Logger } from '../../logging';
import { loggerConfig } from '../../../config/loggerConfig';
import { openai } from '../openaiClient';

const logger = new Logger({
  ...loggerConfig,
  logFile: 'logs/generate_embeddings.log',
});

/**
 * Generates embeddings for a batch of texts.
 * @param texts Array of text strings to embed.
 * @returns Array of embeddings.
 */
export const generateEmbeddings = async (texts: string[]): Promise<number[][]> => {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: texts,
    });
    const embeddings = response.data.map(item => item.embedding);
    logger.info(`Generated embeddings for ${texts.length} texts.`);
    return embeddings;
  } catch (error: any) {
    console.log('error:', error);
    logger.error('Error generating embeddings:', error.response?.data || error.message);
    throw error;
  }
};
