// services/embeddings/stateTracker.ts
import db from '../../../db/db';
import { Logger } from '../../logging';
import { loggerConfig } from '../../../config/loggerConfig';

const logger = new Logger({
  ...loggerConfig,
  logFile: 'logs/state-tracker.log',
});

/**
 * Retrieves the last processed ID for a given table.
 * @param tableName Name of the table.
 * @returns Last processed ID or null.
 */
export const getLastProcessedId = async (tableName: string): Promise<string | null> => {
  const result = await db('embedding_state')
    .where({ table_name: tableName })
    .select('last_processed_id')
    .first();

  return result ? result.last_processed_id : null;
};

/**
 * Updates the last processed ID for a given table.
 * @param tableName Name of the table.
 * @param lastId Last processed ID.
 */
export const updateLastProcessedId = async (tableName: string, lastId: string): Promise<void> => {
  await db('embedding_state')
    .insert({ table_name: tableName, last_processed_id: lastId })
    .onConflict('table_name')
    .merge();

  logger.debug(`Updated embedding_state for ${tableName} to ID ${lastId}.`);
};

/**
 * Initializes the state tracker.
 */
export const initializeStateTracker = async (): Promise<void> => {
  try {
    logger.info('State tracker initialized.');
  } catch (error: any) {
    logger.error('Failed to initialize state tracker:', error);
    throw error;
  }
};
