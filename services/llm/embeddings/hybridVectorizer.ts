// File: /services/vectorization/hybridVectorizer.ts

import { generateEmbeddings } from './embeddingService';
import db from '../../../db/db';
import { Logger } from '../../logging';
import { loggerConfig } from '../../../config/loggerConfig';

const logger = new Logger({
  ...loggerConfig,
  logFile: 'logs/vectorization.log',
});

export async function vectorizeContent(
  type: 'topic' | 'post' | 'snapshot_proposals' | 'tally_proposals',
  id: number | string,
  forumName: string,
  retryCount = 3
): Promise<void> {
  // Check if database is available
  try {
    await db.raw('SELECT 1');
  } catch (error) {
    logger.warn(`Skipping vectorization for ${type} ${id}: Database not available`);
    return;
  }

  try {
    let content: string = '';
    let tableName: string = '';
    let idColumn: string = '';
    let topic;
    let post;
    let snapshotProposal;
    let tallyProposal;

    switch (type) {
      case 'topic':
        topic = await db('topics').where({ id, forum_name: forumName }).select('title').first();
        if (!topic || !topic.title) {
          logger.warn(`Skipping vectorization for topic ${id}: No title found`);
          return;
        }
        content = topic.title;
        tableName = 'topic_vectors';
        idColumn = 'topic_id';
        break;
      case 'post':
        post = await db('posts').where({ id, forum_name: forumName }).select('plain_text').first();
        if (!post || !post.plain_text) {
          logger.warn(`Skipping vectorization for post ${id}: No plain_text content found`);
          return;
        }
        content = post.plain_text;
        tableName = 'post_vectors';
        idColumn = 'post_id';
        break;
      case 'snapshot_proposals':
        snapshotProposal = await db('snapshot_proposals')
          .where({
            id,
            forum_name: forumName,
          })
          .select('title', 'body')
          .first();
        if (!snapshotProposal || !snapshotProposal.title) {
          logger.warn(`Skipping vectorization for snapshot proposal ${id}: No title found`);
          return;
        }
        content = `${snapshotProposal.title}\n\n${snapshotProposal.body}`;
        tableName = 'snapshot_proposal_vectors';
        idColumn = 'proposal_id';
        break;
      case 'tally_proposals':
        tallyProposal = await db('tally_proposals')
          .where({
            id,
            forum_name: forumName,
          })
          .select('title', 'description')
          .first();
        if (!tallyProposal || !tallyProposal.title) {
          logger.warn(`Skipping vectorization for tally proposal ${id}: No title found`);
          return;
        }
        content = `${tallyProposal.title}\n\n${tallyProposal.description}`;
        tableName = 'tally_proposal_vectors';
        idColumn = 'proposal_id';
        break;
      default:
        throw new Error(`Invalid content type: ${type}`);
    }

    // Input validation
    if (!content || content.trim().length === 0) {
      logger.warn(`Skipping vectorization for ${type} ${id}: Empty content`);
      return;
    }

    // Trim and truncate content if necessary
    const trimmedContent = content.trim().slice(0, 8000); // Adjust as needed

    const [embedding] = await generateEmbeddings([trimmedContent]);

    if (!embedding || !Array.isArray(embedding) || embedding.length !== 1536) {
      throw new Error(`Invalid embedding generated for ${type} ${id}`);
    }

    const vectorString = `[${embedding.join(',')}]`;

    await db(tableName)
      .insert({
        [idColumn]: id,
        forum_name: forumName,
        vector: db.raw(`'${vectorString}'::vector(1536)`),
      })
      .onConflict([idColumn, 'forum_name'])
      .merge();

    logger.info(`Vectorized ${type} ${id}`);
  } catch (error: any) {
    if (retryCount > 0) {
      logger.warn(`Retrying vectorization for ${type} ${id}, ${retryCount} attempts remaining`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
      return vectorizeContent(type, id, forumName, retryCount - 1);
    }
    logger.error(`Failed to vectorize ${type} ${id} after all retries: ${error.message}`);
    throw error; // Rethrow after retries exhausted
  }
}

export async function vectorizeEnrichedContent(
  type: 'topic' | 'post',
  id: number,
  forumName: string
): Promise<void> {
  try {
    const tableName = type === 'topic' ? 'topics' : 'posts';
    const content = await db(tableName)
      .where({ id, forum_name: forumName })
      .select('plain_text', 'ai_summary')
      .first();

    if (!content) {
      logger.warn(`${type} ${id} not found for enriched vectorization`);
      return;
    }

    const enrichedContent = `${content.plain_text}\n\nSummary: ${content.ai_summary}`;
    const [embedding] = await generateEmbeddings([enrichedContent]);

    const vectorTableName = `${type}_vectors`;
    const idColumn = `${type}_id`;

    await db(vectorTableName)
      .insert({
        [idColumn]: id,
        forum_name: forumName,
        vector: db.raw('?::vector', [embedding]),
        is_raw: false,
      })
      .onConflict([idColumn, 'forum_name', 'is_raw'])
      .merge();

    logger.info(`Vectorized ${type} ${id} (enriched content)`);
  } catch (error: any) {
    logger.error(`Error vectorizing enriched ${type} ${id}: ${error}`);
  }
}

export async function vectorizeAllEnrichedContent(): Promise<void> {
  const types: ('topic' | 'post')[] = ['topic', 'post'];

  for (const type of types) {
    const tableName = `${type}s`;
    const items = await db(tableName).whereNotNull('ai_summary').select('id', 'forum_name');

    for (const item of items) {
      await vectorizeEnrichedContent(type, item.id, item.forum_name);
    }

    logger.info(`Completed vectorization of enriched ${type}s`);
  }
}
