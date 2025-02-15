# Vector Database Setup with Knex and PostgreSQL

## Overview

This document details the setup of a PostgreSQL database with vector search capabilities using the `pgvector` extension, managed through Knex.js migrations. This setup is designed for LLM applications requiring semantic search functionality.

## System Architecture

### Components
1. PostgreSQL (15.x or later)
2. pgvector extension
3. Knex.js for migrations and query building
4. Node.js/TypeScript runtime

### Database Schema Design
The architecture uses paired tables for content and vectors:
- Primary content tables (e.g., `topics`, `posts`)
- Corresponding vector tables (e.g., `topic_vectors`, `post_vectors`)

This separation allows for efficient storage and querying while maintaining data organization.

## Setup Instructions

### 1. Database Configuration

#### Development Environment
```typescript
// knexfile.js
const commonConfig = {
  client: 'pg',
  migrations: {
    directory: './db/migrations',
  },
  pool: {
    min: 2,
    max: 10,
  },
};

export default {
  development: {
    ...commonConfig,
    connection: {
      host: process.env.POSTGRES_HOST,
      port: process.env.POSTGRES_PORT,
      database: process.env.POSTGRES_DB,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      ssl: false,
    },
  },
  production: {
    ...commonConfig,
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    },
  },
};
```

#### Database Connection Setup
```typescript
// db/db.ts
import knex from 'knex';
import knexConfig from '../knexfile.js';

const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment];

const db = knex(config);

export default db;
```

### 2. Enable pgvector Extension

Create a migration to enable the pgvector extension:

```typescript
// db/migrations/[timestamp]_enable_vector_extension.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS vector');
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP EXTENSION IF EXISTS vector');
}
```

### 3. Base Table Structure

Example migration for content tables:

```typescript
// db/migrations/[timestamp]_create_base_tables.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create topics table
  await knex.schema.createTable('topics', (table) => {
    table.increments('id').primary();
    table.string('forum_name').notNullable();
    table.string('title').notNullable();
    table.text('content').notNullable();
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Add indexes
    table.index(['forum_name']);
    table.index(['created_at']);
  });

  // Create vector table for topics
  await knex.raw(`
    CREATE TABLE topic_vectors (
      id SERIAL PRIMARY KEY,
      topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
      forum_name VARCHAR NOT NULL,
      vector vector(1536) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add indexes for vector table
  await knex.raw(`
    CREATE INDEX topic_vectors_forum_name_idx ON topic_vectors (forum_name);
    CREATE INDEX topic_vectors_topic_id_idx ON topic_vectors (topic_id);
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('topic_vectors');
  await knex.schema.dropTableIfExists('topics');
}
```

### 4. Vector Search Implementation

Create a service for vector operations:

```typescript
// services/search/vectorSearchService.ts
import { generateEmbeddings } from '../llm/embeddings';
import db from '../../db/db';

interface SearchParams {
  query: string;
  type: 'topic' | 'post';
  forum: string;
  limit?: number;
  threshold?: number;
}

export class VectorSearchService {
  private buildSearchQuery(type: string): string {
    return `
      SELECT 
        v.topic_id,
        t.*,
        1 / (1 + (v.vector <-> ?::vector)) as similarity
      FROM topic_vectors v
      JOIN topics t ON t.id = v.topic_id 
      WHERE LOWER(v.forum_name) = LOWER(?)
      AND 1 / (1 + (v.vector <-> ?::vector)) >= ?
      ORDER BY similarity DESC
      LIMIT ?
    `;
  }

  async search(params: SearchParams) {
    const {
      query,
      type,
      forum,
      limit = 10,
      threshold = 0.5,
    } = params;

    // Generate embedding for search query
    const [queryVector] = await generateEmbeddings([query]);
    const vectorString = `[${queryVector.join(',')}]`;

    // Execute vector search
    const results = await db.raw(
      this.buildSearchQuery(type),
      [vectorString, forum, vectorString, threshold, limit]
    );

    return results.rows;
  }
}
```

### 5. Vector Insertion Implementation

Create a service for managing vector insertions:

```typescript
// services/vectors/vectorInsertionService.ts
import db from '../../db/db';
import { generateEmbeddings } from '../llm/embeddings';

export class VectorInsertionService {
  async insertTopicVector(
    topicId: number,
    forumName: string,
    content: string
  ): Promise<void> {
    // Generate embedding
    const [vector] = await generateEmbeddings([content]);
    
    // Insert vector
    await db('topic_vectors').insert({
      topic_id: topicId,
      forum_name: forumName,
      vector: `[${vector.join(',')}]`,
    });
  }

  async updateTopicVector(
    topicId: number,
    content: string
  ): Promise<void> {
    const [vector] = await generateEmbeddings([content]);
    
    await db('topic_vectors')
      .where({ topic_id: topicId })
      .update({
        vector: `[${vector.join(',')}]`,
        updated_at: db.fn.now(),
      });
  }
}
```

## Production Deployment

### Railway Setup

1. Create PostgreSQL instance:
```bash
railway add postgresql
```

2. Enable pgvector:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

3. Run migrations:
```bash
railway run npm run migrate:prod
```

### Environment Variables

Required environment variables:
```env
# Development
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=your_db_name
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password

# Production
DATABASE_URL=postgresql://user:password@host:port/database
NODE_ENV=production
```

## Performance Optimization

### Indexing Strategies

1. Create an IVF index for faster similarity search:
```sql
CREATE INDEX ON topic_vectors 
USING ivfflat (vector vector_cosine_ops)
WITH (lists = 100);
```

2. Create composite indexes for common queries:
```sql
CREATE INDEX topic_vectors_composite_idx 
ON topic_vectors (forum_name, topic_id);
```

### Connection Pooling

Configure connection pooling in knexfile.js:
```typescript
pool: {
  min: 2,
  max: 10,
  acquireTimeoutMillis: 30000,
  createTimeoutMillis: 30000,
  idleTimeoutMillis: 30000,
  reapIntervalMillis: 1000,
  createRetryIntervalMillis: 100,
  propagateCreateError: false
}
```

## Maintenance Tasks

### Vector Reindexing

Periodic reindexing script:
```typescript
async function reindexVectors() {
  await db.raw('REINDEX TABLE topic_vectors');
  await db.raw('VACUUM ANALYZE topic_vectors');
}
```

### Database Monitoring

Monitor vector table size:
```sql
SELECT pg_size_pretty(pg_total_relation_size('topic_vectors'));
```

## Testing

### Unit Tests

```typescript
// tests/vectorSearch.test.ts
describe('Vector Search', () => {
  it('should find similar content', async () => {
    const service = new VectorSearchService();
    const results = await service.search({
      query: 'test query',
      type: 'topic',
      forum: 'test_forum',
      threshold: 0.7
    });
    
    expect(results).toHaveLength(10);
    expect(results[0].similarity).toBeGreaterThan(0.7);
  });
});
```

## Troubleshooting

### Common Issues

1. Vector Dimension Mismatch
```sql
-- Check vector dimensions
SELECT octet_length(vector::bytea)/4 as dims 
FROM topic_vectors 
LIMIT 1;
```

2. Performance Issues
```sql
-- Check query performance
EXPLAIN ANALYZE 
SELECT * FROM topic_vectors 
WHERE vector <-> '[vector]' < 0.5 
LIMIT 10;
```

## Migration Strategies

### Adding New Vector Columns

```typescript
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE topic_vectors 
    ADD COLUMN alternative_vector vector(768)
  `);
}
```

### Backfilling Vectors

```typescript
async function backfillVectors() {
  const topics = await db('topics')
    .leftJoin('topic_vectors', 'topics.id', 'topic_vectors.topic_id')
    .whereNull('topic_vectors.id');
    
  for (const topic of topics) {
    await vectorInsertionService.insertTopicVector(
      topic.id,
      topic.forum_name,
      topic.content
    );
  }
}
```

## Best Practices

1. Always validate vector dimensions before insertion
2. Implement retry logic for vector generation
3. Use transactions for related content/vector operations
4. Implement proper error handling for vector operations
5. Regular monitoring of vector table size and performance
6. Implement proper backup strategies for vector data

## Security Considerations

1. Input validation for vector operations
2. Access control for vector tables
3. Rate limiting for vector search operations
4. Secure connection strings and credentials
5. Regular security audits of vector operations

This setup provides a robust foundation for vector search capabilities in a PostgreSQL database, managed through Knex.js. The architecture is scalable and can be extended to support additional vector types and search requirements. 