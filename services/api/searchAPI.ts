import { generateEmbeddings } from '../llm/embeddings/embeddingService';
import { Logger } from '../logging';
import { loggerConfig } from '../../config/loggerConfig';
import { VectorSearchService } from '../search/vectorSearchService';

// Keep Knex for other operations
import db from '../../db/db';

const logger = new Logger({
  ...loggerConfig,
  logFile: 'logs/search-api.log',
});

// Type Definitions
interface SearchRequest {
  query: string;
  type: 'topic' | 'post' | 'snapshot' | 'tally';
  forum: string;
  limit?: number;
  threshold?: number;
  boostRecent?: boolean;
  boostPopular?: boolean;
  useCache?: boolean;
}

interface RankingFactors {
  similarity: number;
  recency_boost: number;
  popularity_boost: number;
}

interface SearchResult {
  type: string;
  id: number | string;
  forum_name: string;
  title: string | null;
  content: string | null;
  similarity: number;
  final_score: number;
  rank: number;
  ranking_factors: RankingFactors;
}

interface SearchResponse {
  results: SearchResult[];
  metadata: {
    query: string;
    type: string;
    forum: string;
    threshold: number;
    total: number;
    settings: {
      boostRecent: boolean;
      boostPopular: boolean;
      useCache: boolean;
    };
  };
}

interface ErrorResponse {
  error: string;
  details?: string;
  required?: string[];
}

const searchService = new VectorSearchService();

async function searchVectorTable(
  tableName: string,
  vectorTableName: string,
  queryVector: number[],
  forum_name?: string,
  limit: number = 10,
  threshold: number = 0.7
): Promise<SearchResult[]> {
  try {
    // Validate inputs
    if (!queryVector || queryVector.length !== 1536) {
      throw new Error(`Invalid vector dimensions: expected 1536, got ${queryVector?.length}`);
    }

    if (!forum_name) {
      throw new Error('forum_name is required');
    }

    // Define the vector ID column based on table type
    const vectorIdColumn =
      vectorTableName === 'topic_vectors'
        ? 'topic_id'
        : vectorTableName === 'post_vectors'
          ? 'post_id'
          : vectorTableName === 'snapshot_proposal_vectors'
            ? 'proposal_id'
            : vectorTableName === 'tally_proposal_vectors'
              ? 'proposal_id'
              : 'id';

    // First check if we have any vectors for this forum
    const vectorCount = await db(vectorTableName)
      .whereRaw('LOWER(forum_name) = LOWER(?)', [forum_name])
      .count('* as count')
      .first();

    if (!vectorCount || vectorCount.count === '0') {
      console.log(`No vectors found for forum ${forum_name} in ${vectorTableName}`);
      return [];
    }

    // Build the query with proper error handling
    const vectorString = `[${queryVector.join(',')}]`;

    const results = await db.raw(
      `
            WITH vector_matches AS (
                SELECT 
                    v.${vectorIdColumn} AS source_id,
                    v.forum_name,
                    1 / (1 + (v.vector <-> ?::vector)) AS similarity
                FROM ${vectorTableName} v
                WHERE LOWER(v.forum_name) = LOWER(?)
                AND 1 / (1 + (v.vector <-> ?::vector)) >= ?
                ORDER BY similarity DESC
                LIMIT ?
            )
            SELECT 
                vm.source_id as id,
                vm.forum_name,
                vm.similarity,
                t.*
            FROM vector_matches vm
            JOIN ${tableName} t ON t.id = vm.source_id AND LOWER(t.forum_name) = LOWER(vm.forum_name)
            ORDER BY vm.similarity DESC
        `,
      [vectorString, forum_name, vectorString, threshold, limit]
    );

    console.log(`Found ${results.rows.length} results for ${forum_name} in ${tableName}`);

    return results.rows.map(row => ({
      type: tableName.slice(0, -1), // Remove 's' from end
      id: row.id,
      forum_name: row.forum_name,
      similarity: row.similarity,
      title: row.title || null,
      content: row.plain_text || row.body || row.description || null,
      description: row.description || row.ai_summary || null,
    }));
  } catch (error: any) {
    console.error('Error in vector search:', error);
    console.error('Search params:', {
      table: tableName,
      vectorTable: vectorTableName,
      forum: forum_name,
      limit,
      threshold,
    });
    throw new Error(`Vector search failed: ${error.message}`);
  }
}

export async function searchByType(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as SearchRequest;
    const {
      query,
      type,
      forum,
      limit = 10,
      threshold = 0.5,
      boostRecent = true,
      boostPopular = true,
      useCache = true,
    } = body;

    // Validate required fields
    if (!query || !type || !forum) {
      const errorResponse: ErrorResponse = {
        error: 'Missing required parameters',
        required: ['query', 'type', 'forum'],
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate type
    const validTypes = ['topic', 'post', 'snapshot', 'tally'] as const;
    if (!validTypes.includes(type)) {
      const errorResponse: ErrorResponse = {
        error: 'Invalid type parameter',
        details: `Type must be one of: ${validTypes.join(', ')}`,
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate numeric parameters
    if (limit && (!Number.isInteger(limit) || limit < 1)) {
      const errorResponse: ErrorResponse = {
        error: 'Invalid limit parameter',
        details: 'Limit must be a positive integer',
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (threshold && (typeof threshold !== 'number' || threshold < 0 || threshold > 1)) {
      const errorResponse: ErrorResponse = {
        error: 'Invalid threshold parameter',
        details: 'Threshold must be a number between 0 and 1',
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Execute search
    const results = await searchService.search({
      query,
      type,
      forum,
      limit,
      threshold,
      boostRecent,
      boostPopular,
      useCache,
    });

    // Prepare response
    const response: SearchResponse = {
      results,
      metadata: {
        query,
        type,
        forum,
        threshold,
        total: results.length,
        settings: {
          boostRecent,
          boostPopular,
          useCache,
        },
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Search error:', error);

    const errorResponse: ErrorResponse = {
      error: 'Search failed',
      details: error instanceof Error ? error.message : 'Unknown error occurred',
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Search across all types
export async function searchAll(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as SearchRequest;
    const { query, forum, limit = 10, threshold = 0.7 } = body;

    if (!query) {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    logger.info(`Searching all content types for query: ${query}`);

    // Generate embedding for search query
    const [queryVector] = await generateEmbeddings([query]);

    // Search all vector tables
    const [topics, posts, snapshot, tally] = await Promise.all([
      searchVectorTable('topics', 'topic_vectors', queryVector, forum, limit, threshold),
      searchVectorTable('posts', 'post_vectors', queryVector, forum, limit, threshold),
      searchVectorTable(
        'snapshot_proposals',
        'snapshot_proposal_vectors',
        queryVector,
        forum,
        limit,
        threshold
      ),
      searchVectorTable(
        'tally_proposals',
        'tally_proposal_vectors',
        queryVector,
        forum,
        limit,
        threshold
      ),
    ]);

    // Combine and sort results by similarity
    const allResults = [...topics, ...posts, ...snapshot, ...tally]
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    logger.info(`Found ${allResults.length} total results across all types`);
    // console.log('Search results:', allResults);

    return new Response(JSON.stringify({ results: allResults }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    logger.error('Error in search:', error);
    return new Response(JSON.stringify({ error: 'Search failed', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export type { SearchRequest, SearchResult, SearchResponse, ErrorResponse, RankingFactors };
