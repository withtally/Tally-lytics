// File: /services/llm/embeddings/vectorPopulator.ts

import db from '../../../db/db';
import { generateEmbeddings } from './embeddingService';
import { Logger } from '../../logging';
import { loggerConfig } from '../../../config/loggerConfig';
import { getLastProcessedId, updateLastProcessedId } from './stateTracker';

const batchSize = 100;

const logger = new Logger({
  ...loggerConfig,
  logFile: 'logs/vector-populator.log',
});

interface TableMapping {
  tableName: string;
  idColumns: { source: string; target: string }[]; // Array of source and target column mappings
  textColumn: string;
  vectorTableName: string;
  uniqueIdentifier?: string;
  relatedTables?: { table: string; sourceColumns: { source: string; target: string }[] }[]; // Related tables and their column mappings
}

// Define table mappings with related tables
const tables: TableMapping[] = [
  {
    tableName: 'topics',
    idColumns: [
      { source: 'id', target: 'topic_id' },
      { source: 'forum_name', target: 'forum_name' },
    ],
    textColumn: 'title',
    vectorTableName: 'topic_vectors',
    relatedTables: [], // No related tables
  },
  {
    tableName: 'posts',
    idColumns: [
      { source: 'id', target: 'post_id' },
      { source: 'forum_name', target: 'forum_name' },
    ],
    textColumn: 'plain_text',
    vectorTableName: 'post_vectors',
    relatedTables: [
      {
        table: 'topics',
        sourceColumns: [
          { source: 'topic_id', target: 'id' },
          { source: 'forum_name', target: 'forum_name' },
        ],
      },
    ],
  },
  {
    tableName: 'topic_evaluations',
    idColumns: [
      { source: 'id', target: 'evaluation_id' },
      { source: 'forum_name', target: 'forum_name' }, // Add this
    ],
    textColumn: 'suggested_improvements',
    vectorTableName: 'topic_evaluation_vectors',
    uniqueIdentifier: 'id',
    relatedTables: [
      {
        table: 'topics',
        sourceColumns: [
          { source: 'topic_id', target: 'id' },
          { source: 'forum_name', target: 'forum_name' }, // Add this
        ],
      },
    ],
  },
  {
    tableName: 'post_evaluations',
    idColumns: [
      { source: 'id', target: 'evaluation_id' },
      { source: 'forum_name', target: 'forum_name' },
    ],
    textColumn: 'suggested_improvements',
    vectorTableName: 'post_evaluation_vectors',
    uniqueIdentifier: 'id',
    relatedTables: [
      {
        table: 'posts',
        sourceColumns: [
          { source: 'post_id', target: 'id' },
          { source: 'forum_name', target: 'forum_name' },
        ],
      },
    ],
  },
  {
    tableName: 'tally_proposals',
    idColumns: [
      { source: 'id', target: 'proposal_id' },
      { source: 'forum_name', target: 'forum_name' }, // Add this
    ],
    textColumn: 'title',
    vectorTableName: 'tally_proposal_vectors',
  },
  {
    tableName: 'snapshot_proposals',
    idColumns: [
      { source: 'id', target: 'proposal_id' },
      { source: 'forum_name', target: 'forum_name' }, // Add this
    ],
    textColumn: 'title',
    vectorTableName: 'snapshot_proposal_vectors',
  },
];

/**
 * Processes a single table: fetches new records, generates embeddings, and inserts them into the vector table.
 * Skips records without necessary related entries and logs them.
 * @param mapping TableMapping configuration.
 */
export const processTable = async (mapping: TableMapping): Promise<void> => {
  const { tableName, idColumns, textColumn, vectorTableName, uniqueIdentifier, relatedTables } =
    mapping;

  logger.info(`Processing table: ${tableName}`);

  try {
    // Build the base query
    const selectedColumns = idColumns
      .map(col => `${tableName}.${col.source}`)
      .concat(`${tableName}.${textColumn}`);
    let query = db(tableName).select(selectedColumns);

    // Apply INNER JOINs for related tables to ensure data integrity
    if (relatedTables && relatedTables.length > 0) {
      relatedTables.forEach(rel => {
        query = query.innerJoin(rel.table, function () {
          rel.sourceColumns.forEach((col, index) => {
            if (index === 0) {
              this.on(`${tableName}.${col.source}`, '=', `${rel.table}.${col.target}`);
            } else {
              this.andOn(`${tableName}.${col.source}`, '=', `${rel.table}.${col.target}`);
            }
          });
        });
      });
    }

    if (uniqueIdentifier) {
      // Incremental processing based on uniqueIdentifier
      const lastProcessedId = await getLastProcessedId(tableName);
      query = query
        .where('id', '>', lastProcessedId || 0)
        .orderBy('id', 'asc')
        .limit(batchSize);
    } else {
      // Exclude records that already have vectors
      const subQuery = db(vectorTableName)
        .select(1)
        .whereRaw(
          idColumns
            .map(col => `${vectorTableName}.${col.target} = ${tableName}.${col.source}`)
            .join(' AND ')
        );
      query = query.whereNotExists(subQuery);
    }

    const records = await query;

    logger.info(`Fetched ${records.length} new records from ${tableName}.`);

    if (records.length === 0) {
      logger.info(`No new records to process for ${tableName}.`);
      return;
    }

    // Process in batches
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const texts = batch.map(record => record[textColumn]).filter((text: string) => text);

      if (texts.length === 0) {
        logger.warn(`Batch ${Math.floor(i / batchSize) + 1}: No valid texts to embed.`);
        continue;
      }

      const embeddings = await generateEmbeddings(texts);

      // Validate embedding dimensions
      const expectedDim = 1536; // Adjust based on your model
      if (embeddings.length !== texts.length) {
        logger.warn(
          `Mismatch in embeddings generated. Expected ${texts.length}, got ${embeddings.length}.`
        );
      }

      const insertPromises = batch.map(async (record, idx) => {
        const embedding = embeddings[idx];
        const idValues = idColumns.map(col => record[col.source]);

        // Ensure embedding has correct dimensions
        if (!embedding || embedding.length !== expectedDim) {
          logger.error(`Invalid embedding dimensions for record: ${JSON.stringify(idValues)}`);
          return;
        }

        const insertData: any = {};
        idColumns.forEach((col, index) => {
          insertData[col.target] = idValues[index];
        });
        insertData.vector = db.raw(`'[${embedding.join(',')}]'::vector(1536)`); // Correctly cast the embedding

        try {
          await db(vectorTableName)
            .insert(insertData)
            .onConflict(idColumns.map(col => col.target))
            .ignore();
          logger.debug(`Inserted embedding for ${tableName} record: ${JSON.stringify(idValues)}`);
        } catch (error: any) {
          logger.error(
            `Failed to insert embedding for ${tableName} record: ${JSON.stringify(idValues)}`,
            error
          );
        }
      });

      await Promise.all(insertPromises);
      logger.info(`Inserted ${embeddings.length} embeddings into ${vectorTableName}.`);

      if (uniqueIdentifier) {
        const lastRecord = batch[batch.length - 1];
        const lastId = lastRecord[uniqueIdentifier];
        await updateLastProcessedId(tableName, lastId);
        logger.info(`Updated last processed ID for ${tableName} to ${lastId}.`);
      }
    }
  } catch (error: any) {
    logger.error(`Error processing table ${tableName}:`, error.stack || error.message);
    throw error;
  }
};

/**
 * Populates vectors for all configured tables.
 */
export const populateVectors = async (): Promise<void> => {
  for (const table of tables) {
    await processTable(table);
  }
  logger.info('All vector tables have been populated.');
};
