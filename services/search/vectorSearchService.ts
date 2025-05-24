// services/search/VectorSearchService.ts

import Redis from 'ioredis';
import { generateEmbeddings } from '../llm/embeddings/embeddingService';
import db from '../../db/db';
import { Logger } from '../logging';
import { generateQuerySimile } from '../llm/llmService';

interface SearchParams {
  query: string;
  type: 'topic' | 'post' | 'snapshot' | 'tally';
  forum: string;
  limit?: number;
  threshold?: number;
  boostRecent?: boolean;
  boostPopular?: boolean;
  useCache?: boolean;
}

interface SearchResult {
  type: string;
  id: number | string;
  forum_name: string;
  title: string | null;
  content: string | null;
  similarity: number;
  created_at?: Date;
  popularity_score?: number;
}

interface RankingFactors {
  similarity: number;
  recency_boost: number;
  popularity_boost: number;
}

export class VectorSearchService {
  private redis: Redis | null = null;
  private logger: Logger;

  constructor() {
    this.logger = new Logger({
      logFile: 'logs/vector-search.log',
      level: 'info',
    });

    if (process.env.REDIS_URL) {
      try {
        this.redis = new Redis(process.env.REDIS_URL, {
          lazyConnect: true,
          enableOfflineQueue: false,
          maxRetriesPerRequest: 1,
          retryStrategy: () => null,
        });

        this.redis.on('error', () => {
          if (this.redis) {
            this.redis.disconnect();
            this.redis = null;
          }
        });
      } catch {
        this.redis = null;
      }
    }
  }

  private getTableConfig(type: string): { table: string; vectorTable: string; idColumn: string } {
    switch (type) {
      case 'topic':
        return {
          table: 'topics',
          vectorTable: 'topic_vectors',
          idColumn: 'topic_id',
        };
      case 'post':
        return {
          table: 'posts',
          vectorTable: 'post_vectors',
          idColumn: 'post_id',
        };
      case 'snapshot':
        return {
          table: 'snapshot_proposals',
          vectorTable: 'snapshot_proposal_vectors',
          idColumn: 'proposal_id',
        };
      case 'tally':
        return {
          table: 'tally_proposals',
          vectorTable: 'tally_proposal_vectors',
          idColumn: 'proposal_id',
        };
      default:
        throw new Error(`Invalid content type: ${type}`);
    }
  }

  private buildSearchQuery(type: string): string {
    const config = this.getTableConfig(type);

    return `
      SELECT 
        v.${config.idColumn},
        t.*,
        1 / (1 + (v.vector <-> ?::vector)) as similarity
      FROM ${config.vectorTable} v
      JOIN ${config.table} t ON t.id = v.${config.idColumn} AND LOWER(t.forum_name) = LOWER(v.forum_name)
      WHERE LOWER(v.forum_name) = LOWER(?)
      AND 1 / (1 + (v.vector <-> ?::vector)) >= ?
      ORDER BY similarity DESC
      LIMIT ?
    `;
  }

  private async applyRecencyBoost(results: SearchResult[]): Promise<SearchResult[]> {
    // Get current time for comparison
    const now = new Date();

    return results.map(result => {
      if (!result.created_at) return result;

      // Calculate days since creation
      const daysSinceCreation =
        (now.getTime() - result.created_at.getTime()) / (1000 * 60 * 60 * 24);

      // Apply recency boost - decay over time
      const recencyBoost = Math.max(0, 1 - daysSinceCreation / 30); // 30 day decay

      return {
        ...result,
        similarity: result.similarity * (1 + recencyBoost * 0.2), // 20% max boost
      };
    });
  }

  private async applyPopularityBoost(results: SearchResult[]): Promise<SearchResult[]> {
    try {
      // Check if popularity_score exists in the table
      const firstResult = results[0];
      if (!firstResult) return results;

      const config = this.getTableConfig(firstResult.type);
      const hasPopularityScore = await db.schema.hasColumn(config.table, 'popularity_score');

      if (!hasPopularityScore) {
        this.logger.warn(
          `No popularity_score column found in ${config.table}. Skipping popularity boost.`
        );
        return results;
      }

      return results.map(result => {
        if (!result.popularity_score) return result;

        // Normalize popularity score (assuming 0-100 scale)
        const normalizedScore = result.popularity_score / 100;

        return {
          ...result,
          similarity: result.similarity * (1 + normalizedScore * 0.3), // 30% max boost
        };
      });
    } catch (error) {
      this.logger.error('Error applying popularity boost:', error as object);
      return results; // Return original results if boost fails
    }
  }

  private async rerankWithLLM(results: SearchResult[], query: string): Promise<SearchResult[]> {
    try {
      // Generate similes to expand query context
      const simile = await generateQuerySimile(query);
      const augmentedQuery = `${query} ${simile}`;

      // Generate new embedding for augmented query
      const [queryVector] = await generateEmbeddings([augmentedQuery]);

      // Recalculate similarities with augmented query
      const vectorString = `[${queryVector.join(',')}]`;

      // Use existing search logic with new vector
      const rerankedResults = await db.raw(this.buildSearchQuery(results[0].type), [
        vectorString,
        results[0].forum_name,
        vectorString,
        0.5,
        results.length,
      ]);

      return rerankedResults.rows.map((row: any) => ({
        type: row.type,
        id: row.id,
        forum_name: row.forum_name,
        title: row.title || null,
        content: row.plain_text || row.body || row.description || null,
        similarity: row.similarity,
        created_at: row.created_at,
        popularity_score: row.popularity_score,
      }));
    } catch (error) {
      this.logger.error('Error in LLM reranking:', error as object);
      return results; // Return original results if reranking fails
    }
  }

  async search(params: SearchParams): Promise<SearchResult[]> {
    const {
      query,
      type,
      forum,
      limit = 10,
      threshold = 0.5,
      boostRecent = false,
      boostPopular = false,
      useCache = false,
    } = params;

    try {
      // Initial vector search
      const [queryVector] = await generateEmbeddings([query]);
      const vectorString = `[${queryVector.join(',')}]`;

      const results = await db.raw(this.buildSearchQuery(type), [
        vectorString,
        forum,
        vectorString,
        threshold,
        limit,
      ]);

      let searchResults = results.rows.map((row: any) => ({
        type,
        id: row.id,
        forum_name: row.forum_name,
        title: row.title || null,
        content: row.plain_text || row.body || row.description || null,
        similarity: row.similarity,
        created_at: row.created_at,
        popularity_score: row.popularity_score,
      }));

      // Apply boosts if requested
      if (boostRecent) {
        searchResults = await this.applyRecencyBoost(searchResults);
      }

      if (boostPopular) {
        searchResults = await this.applyPopularityBoost(searchResults);
      }

      // Apply LLM reranking if requested
      if (useCache) {
        searchResults = await this.rerankWithLLM(searchResults, query);
      }

      // Sort by final similarity score
      return searchResults.sort((a: any, b: any) => b.similarity - a.similarity);
    } catch (error) {
      this.logger.error('Search error:', error as object);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.quit();
      } catch {
        // Ignore cleanup errors
      }
      this.redis = null;
    }
  }
}

export type { SearchParams, SearchResult, RankingFactors };
