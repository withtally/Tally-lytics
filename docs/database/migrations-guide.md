# Database Migrations Guide

## Overview

This guide details our migration strategy for managing vector-enabled PostgreSQL databases using Knex.js. Our migrations handle both standard database tables and vector-specific operations.

## Migration Structure

Migrations are stored in `db/migrations` and follow the timestamp naming convention:
```
YYYYMMDDHHMMSS_descriptive_name.ts
```

## Key Migration Types

### 1. Initial Setup Migration

```typescript
// db/migrations/20240211000001_initial_setup.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Enable pgvector extension
  await knex.raw('CREATE EXTENSION IF NOT EXISTS vector');

  // Create base tables
  await knex.schema.createTable('forums', (table) => {
    table.increments('id').primary();
    table.string('name').unique().notNullable();
    table.string('url').notNullable();
    table.jsonb('metadata').defaultTo('{}');
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('forums');
  await knex.raw('DROP EXTENSION IF EXISTS vector');
}
```

### 2. Content Tables Migration

```typescript
// db/migrations/20240211000002_create_content_tables.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create topics table
  await knex.schema.createTable('topics', (table) => {
    table.increments('id').primary();
    table.integer('forum_id').references('forums.id').onDelete('CASCADE');
    table.string('title').notNullable();
    table.text('content').notNullable();
    table.string('author').notNullable();
    table.integer('view_count').defaultTo(0);
    table.jsonb('metadata').defaultTo('{}');
    table.timestamps(true, true);

    // Add indexes
    table.index(['forum_id']);
    table.index(['created_at']);
  });

  // Create posts table
  await knex.schema.createTable('posts', (table) => {
    table.increments('id').primary();
    table.integer('topic_id').references('topics.id').onDelete('CASCADE');
    table.integer('forum_id').references('forums.id').onDelete('CASCADE');
    table.text('content').notNullable();
    table.string('author').notNullable();
    table.jsonb('metadata').defaultTo('{}');
    table.timestamps(true, true);

    // Add indexes
    table.index(['topic_id']);
    table.index(['forum_id']);
    table.index(['created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('posts');
  await knex.schema.dropTableIfExists('topics');
}
```

### 3. Vector Tables Migration

```typescript
// db/migrations/20240211000003_create_vector_tables.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create topic vectors table
  await knex.raw(`
    CREATE TABLE topic_vectors (
      id SERIAL PRIMARY KEY,
      topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
      forum_id INTEGER REFERENCES forums(id) ON DELETE CASCADE,
      title_vector vector(1536),
      content_vector vector(1536) NOT NULL,
      combined_vector vector(1536) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create post vectors table
  await knex.raw(`
    CREATE TABLE post_vectors (
      id SERIAL PRIMARY KEY,
      post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
      forum_id INTEGER REFERENCES forums(id) ON DELETE CASCADE,
      content_vector vector(1536) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add indexes
  await knex.raw(`
    CREATE INDEX topic_vectors_topic_id_idx ON topic_vectors (topic_id);
    CREATE INDEX topic_vectors_forum_id_idx ON topic_vectors (forum_id);
    CREATE INDEX post_vectors_post_id_idx ON post_vectors (post_id);
    CREATE INDEX post_vectors_forum_id_idx ON post_vectors (forum_id);
  `);

  // Add IVF indexes for similarity search
  await knex.raw(`
    CREATE INDEX topic_vectors_combined_vector_idx ON topic_vectors 
    USING ivfflat (combined_vector vector_cosine_ops) WITH (lists = 100);

    CREATE INDEX post_vectors_content_vector_idx ON post_vectors 
    USING ivfflat (content_vector vector_cosine_ops) WITH (lists = 100);
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('post_vectors');
  await knex.schema.dropTableIfExists('topic_vectors');
}
```

### 4. Evaluation Tables Migration

```typescript
// db/migrations/20240211000004_create_evaluation_tables.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('content_evaluations', (table) => {
    table.increments('id').primary();
    table.integer('content_id').notNullable();
    table.string('content_type').notNullable(); // 'topic' or 'post'
    table.integer('forum_id').references('forums.id').onDelete('CASCADE');
    table.float('quality_score').notNullable();
    table.float('relevance_score').notNullable();
    table.text('summary').nullable();
    table.jsonb('metadata').defaultTo('{}');
    table.timestamps(true, true);

    // Add indexes
    table.index(['content_id', 'content_type']);
    table.index(['forum_id']);
    table.index(['quality_score']);
    table.index(['relevance_score']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('content_evaluations');
}
```

## Running Migrations

### Development Environment

```bash
# Run all pending migrations
npm run migrate

# Rollback last migration
npm run migrate:rollback

# Refresh database (rollback all and migrate)
npm run migrate:refresh
```

### Production Environment

```bash
# Run migrations in production
npm run migrate:prod

# Rollback last migration in production
npm run migrate:rollback:prod
```

## Migration Best Practices

1. **Atomic Changes**
   - Each migration should be self-contained
   - Include both up and down migrations
   - Test both migration and rollback

2. **Vector Operations**
   - Always specify vector dimensions explicitly
   - Create appropriate indexes for vector columns
   - Use IVF indexes for large vector tables

3. **Data Integrity**
   - Use foreign key constraints
   - Add appropriate indexes
   - Include CASCADE rules where appropriate

4. **Performance**
   - Create indexes after bulk data operations
   - Use batch operations for large data sets
   - Consider partitioning for large tables

5. **Safety**
   - Backup database before migrations
   - Test migrations on staging first
   - Use transactions where appropriate

## Common Migration Patterns

### Adding Vector Columns

```typescript
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE topic_vectors
    ADD COLUMN sentiment_vector vector(1536),
    ADD COLUMN category_vector vector(768)
  `);
}
```

### Updating Vector Dimensions

```typescript
export async function up(knex: Knex): Promise<void> {
  // Create new column
  await knex.raw(`
    ALTER TABLE topic_vectors
    ADD COLUMN content_vector_new vector(1536)
  `);

  // Copy and transform data (implement transformation logic)
  await knex.raw(`
    UPDATE topic_vectors
    SET content_vector_new = transform_vector(content_vector)
  `);

  // Drop old column and rename new
  await knex.raw(`
    ALTER TABLE topic_vectors
    DROP COLUMN content_vector,
    RENAME COLUMN content_vector_new TO content_vector
  `);
}
```

### Adding Indexes

```typescript
export async function up(knex: Knex): Promise<void> {
  // Add composite index
  await knex.raw(`
    CREATE INDEX topic_vectors_forum_content_idx 
    ON topic_vectors (forum_id, created_at DESC)
  `);

  // Add vector similarity index
  await knex.raw(`
    CREATE INDEX topic_vectors_content_vector_idx 
    ON topic_vectors USING ivfflat (content_vector vector_cosine_ops)
    WITH (lists = 100)
  `);
}
```

## Troubleshooting Migrations

### Common Issues and Solutions

1. **Vector Extension Not Found**
   ```sql
   -- Check if extension is available
   SELECT * FROM pg_available_extensions WHERE name = 'vector';
   
   -- Enable extension if available
   CREATE EXTENSION vector;
   ```

2. **Dimension Mismatch**
   ```sql
   -- Check vector dimensions
   SELECT octet_length(content_vector::bytea)/4 as dims 
   FROM topic_vectors 
   LIMIT 1;
   ```

3. **Index Creation Failure**
   ```sql
   -- Check existing indexes
   SELECT * FROM pg_indexes 
   WHERE tablename = 'topic_vectors';
   
   -- Rebuild index
   REINDEX TABLE topic_vectors;
   ```

## Migration Scripts

### package.json Scripts

```json
{
  "scripts": {
    "migrate": "knex migrate:latest",
    "migrate:rollback": "knex migrate:rollback",
    "migrate:refresh": "knex migrate:rollback --all && knex migrate:latest",
    "migrate:prod": "NODE_ENV=production knex migrate:latest",
    "migrate:make": "knex migrate:make"
  }
}
``` 