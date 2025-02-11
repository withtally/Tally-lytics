// services/embeddings/index.ts
import { populateVectors } from './vectorPopulator';
import { initializeStateTracker } from './stateTracker';

import { Logger } from '../../logging';
import { loggerConfig } from '../../../config/loggerConfig';

const logger = new Logger({
  ...loggerConfig,
  logFile: 'logs/embedding-population.log',
});

/**
 * Main function to run the embedding population process.
 */
export const runEmbeddingPopulation = async (): Promise<void> => {
  try {
    logger.info('Starting embedding population process');
    await initializeStateTracker();
    await populateVectors();
    logger.info('Embedding population process completed successfully');
  } catch (error: any) {
    logger.error('Embedding population process failed:', error.message);
    // Optionally, you might want to rethrow the error if you want calling code to handle it
    // throw error;
  }
};

// If you need to run this as a standalone script, you can add:
// if (require.main === module) {
//   runEmbeddingPopulation().catch((error) => {
//     console.error('Failed to run embedding population:', error);
//     process.exit(1);
//   });
// }
