/* eslint-env node, commonjs */
/* global exports, process, console */

exports.up = function (knex) {
  return (
    knex.schema
      // Enable pgvector extension (skip for Railway PostgreSQL)
      // .raw('CREATE EXTENSION IF NOT EXISTS vector;')

      // Tally Proposals Table
      .createTable('tally_proposals', function (table) {
        table.string('id').notNullable();
        table.string('forum_name').notNullable();
        table.string('onchain_id').notNullable();
        table.string('original_id').nullable();
        table.string('status').notNullable();
        table.text('description').nullable();
        table.text('title').nullable();
        table.timestamp('start_timestamp').nullable();
        table.string('governor_id').notNullable();
        table.string('governor_name').nullable();
        table.string('quorum').nullable();
        table.string('timelock_id').nullable();
        table.integer('token_decimals').nullable();
        table.text('vote_stats').nullable();
        table.timestamps(true, true);
        // Add both composite primary key and unique constraint on id
        table.primary(['id', 'forum_name']);
        table.unique(['id']); // Add this for upsert support
      })

      // Tally Crawl Status Table
      .createTable('tally_crawl_status', function (table) {
        table.string('forum_name').primary();
        table.string('last_proposal_id').nullable();
        table.timestamp('last_crawl_timestamp').defaultTo(knex.fn.now());
      })

      // Topics Table
      .createTable('topics', function (table) {
        table.integer('id').notNullable();
        table.string('forum_name').notNullable();
        table.text('title').notNullable();
        table.text('slug').notNullable();
        table.integer('posts_count').notNullable();
        table.integer('reply_count').notNullable();
        table.timestamp('created_at').notNullable();
        table.timestamp('updated_at').notNullable();
        table.timestamp('last_analyzed').nullable();
        table.text('ai_summary').nullable();
        table.primary(['id', 'forum_name']);
      })

      // Posts Table
      .createTable('posts', function (table) {
        table.integer('id').notNullable();
        table.string('forum_name').notNullable();
        table.integer('topic_id').notNullable();
        table.string('username').notNullable();
        table.text('plain_text').notNullable();
        table.text('cooked').notNullable();
        table.timestamp('created_at').notNullable();
        table.timestamp('updated_at').notNullable();
        table.timestamp('last_analyzed').nullable();
        table.primary(['id', 'forum_name']);

        table
          .foreign(['topic_id', 'forum_name'])
          .references(['id', 'forum_name'])
          .inTable('topics')
          .onDelete('CASCADE');
      })

      // Users Table
      .createTable('users', function (table) {
        table.integer('id').notNullable();
        table.string('forum_name').notNullable();
        table.string('username').notNullable();
        table.timestamp('created_at').notNullable();
        table.timestamp('updated_at').notNullable();
        table.primary(['id', 'forum_name']);
      })

      // Tags Table
      .createTable('tags', function (table) {
        table.increments('id').primary();
        table.string('name').unique().notNullable();
      })

      // Topic Tags Table
      .createTable('topic_tags', function (table) {
        table.integer('topic_id').notNullable();
        table.string('forum_name').notNullable();
        table.integer('tag_id').notNullable();
        table.primary(['topic_id', 'forum_name', 'tag_id']);

        table
          .foreign(['topic_id', 'forum_name'])
          .references(['id', 'forum_name'])
          .inTable('topics')
          .onDelete('CASCADE');

        table.foreign('tag_id').references('id').inTable('tags').onDelete('CASCADE');
      })

      // Post Tags Table
      .createTable('post_tags', function (table) {
        table.integer('post_id').notNullable();
        table.string('forum_name').notNullable();
        table.integer('tag_id').notNullable();
        table.primary(['post_id', 'forum_name', 'tag_id']);

        table
          .foreign(['post_id', 'forum_name'])
          .references(['id', 'forum_name'])
          .inTable('posts')
          .onDelete('CASCADE');

        table.foreign('tag_id').references('id').inTable('tags').onDelete('CASCADE');
      })

      // User Tags Table
      .createTable('user_tags', function (table) {
        table.integer('user_id').notNullable();
        table.string('forum_name').notNullable();
        table.integer('tag_id').notNullable();
        table.primary(['user_id', 'forum_name', 'tag_id']);

        table
          .foreign(['user_id', 'forum_name'])
          .references(['id', 'forum_name'])
          .inTable('users')
          .onDelete('CASCADE');

        table.foreign('tag_id').references('id').inTable('tags').onDelete('CASCADE');
      })

      // Topic Evaluations Table
      .createTable('topic_evaluations', function (table) {
        table.increments('id').primary();
        table.integer('topic_id').notNullable();
        table.string('forum_name').notNullable();
        table.string('llm_model').notNullable();
        table.integer('overall_quality').notNullable();
        table.integer('helpfulness').notNullable();
        table.integer('relevance').notNullable();
        table.integer('unique_perspective').notNullable();
        table.integer('logical_reasoning').notNullable();
        table.integer('fact_based').notNullable();
        table.integer('clarity').notNullable();
        table.integer('constructiveness').notNullable();
        table.integer('hostility').notNullable();
        table.integer('emotional_tone').notNullable();
        table.integer('engagement_potential').notNullable();
        table.integer('persuasiveness').notNullable();
        table.text('dominant_topic').nullable();
        table.text('key_points').nullable();
        table.text('tags').nullable();
        table.text('suggested_improvements').nullable();
        table.timestamps(true, true);
        table.unique(['id', 'forum_name']); // Add this line

        table
          .foreign(['topic_id', 'forum_name'])
          .references(['id', 'forum_name'])
          .inTable('topics')
          .onDelete('CASCADE');
        table.index(['topic_id', 'forum_name']);
      })

      // Post Evaluations Table - Updated version
      .createTable('post_evaluations', function (table) {
        table.increments('id').primary();
        table.integer('post_id').notNullable();
        table.string('forum_name').notNullable();
        table.string('llm_model').notNullable();
        table.integer('overall_quality').notNullable();
        table.integer('helpfulness').notNullable();
        table.integer('relevance').notNullable();
        table.integer('unique_perspective').notNullable();
        table.integer('logical_reasoning').notNullable();
        table.integer('fact_based').notNullable();
        table.integer('clarity').notNullable();
        table.integer('constructiveness').notNullable();
        table.integer('hostility').notNullable();
        table.integer('emotional_tone').notNullable();
        table.integer('engagement_potential').notNullable();
        table.integer('persuasiveness').notNullable();
        table.text('dominant_topic').nullable();
        table.text('key_points').nullable();
        table.text('tags').nullable();
        table.text('suggested_improvements').nullable();
        table.timestamps(true, true);
        table.unique(['id', 'forum_name']); // Add this line

        // Add composite foreign key constraint
        table
          .foreign(['post_id', 'forum_name'])
          .references(['id', 'forum_name'])
          .inTable('posts')
          .onDelete('CASCADE');

        // Add an index for the foreign key columns
        table.index(['post_id', 'forum_name']);
      })

      // Tally Proposal Evaluations Table
      .createTable('tally_proposal_evaluations', function (table) {
        table.increments('id').primary();
        table.string('proposal_id').notNullable();
        table.string('forum_name').notNullable();
        table.text('summary').notNullable();
        table.text('impact').notNullable();
        table.text('pros_and_cons').notNullable();
        table.text('risks_and_concerns').notNullable();
        table.text('overall_assessment').notNullable();
        table.timestamps(true, true);
        table.unique(['proposal_id', 'forum_name']);

        // Keep your existing foreign key
        table
          .foreign(['proposal_id', 'forum_name'])
          .references(['id', 'forum_name'])
          .inTable('tally_proposals')
          .onDelete('CASCADE');
      })

      .createTable('snapshot_proposals', function (table) {
        table.string('id').notNullable();
        table.string('forum_name').notNullable();
        table.text('title').notNullable();
        table.text('body').notNullable();
        table.text('choices').notNullable();
        table.text('scores').nullable();
        table.timestamp('start').notNullable();
        table.timestamp('end').notNullable();
        table.string('snapshot').notNullable();
        table.string('state').notNullable();
        table.string('author').notNullable();
        table.string('space_id').notNullable();
        table.string('space_name').notNullable();
        table.text('scores_total').nullable();
        table.timestamps(true, true);
        // Add both composite primary key and unique constraint on id
        table.primary(['id', 'forum_name']);
        table.unique(['id']); // Add this for upsert support
      })

      // Snapshot Proposal Evaluations Table
      .createTable('snapshot_proposal_evaluations', function (table) {
        table.increments('id').primary();
        table.string('proposal_id').notNullable();
        table.string('forum_name').notNullable();
        table.text('summary').notNullable();
        table.text('impact').notNullable();
        table.text('pros_and_cons').notNullable();
        table.text('risks_and_concerns').notNullable();
        table.text('overall_assessment').notNullable();
        table.timestamps(true, true);

        // Replace single-column unique constraint with composite
        table.unique(['proposal_id', 'forum_name']);

        // Make sure foreign key is composite
        table
          .foreign(['proposal_id', 'forum_name'])
          .references(['id', 'forum_name'])
          .inTable('snapshot_proposals')
          .onDelete('CASCADE');

        // Add index for the foreign key columns
        table.index(['proposal_id', 'forum_name']);
      })

      // Crawl Status Table
      .createTable('crawl_status', function (table) {
        table.string('id').notNullable();
        table.string('forum_name').notNullable();
        table.datetime('last_crawl_at');
        table.primary(['id', 'forum_name']);
      })

      // Post Evaluation Tags Table
      .createTable('post_evaluation_tags', function (table) {
        table.integer('post_evaluation_id').notNullable();
        table.integer('tag_id').notNullable();
        table.primary(['post_evaluation_id', 'tag_id']);

        table
          .foreign('post_evaluation_id')
          .references('id')
          .inTable('post_evaluations')
          .onDelete('CASCADE');

        table.foreign('tag_id').references('id').inTable('tags').onDelete('CASCADE');
      })

      // Vector Tables - Commented out for Railway PostgreSQL
      /*
      .createTable('topic_vectors', function (table) {
        table.increments('id').primary();
        table.integer('topic_id').notNullable();
        table.string('forum_name').notNullable();
        table.specificType('vector', 'vector(1536)').notNullable();
        table.timestamps(true, true);
        table.unique(['topic_id', 'forum_name']); // Change to composite unique
      })

      .createTable('post_vectors', function (table) {
        table.increments('id').primary();
        table.integer('post_id').notNullable();
        table.string('forum_name').notNullable();
        table.specificType('vector', 'vector(1536)').notNullable();
        table.timestamps(true, true);
        table.unique(['post_id', 'forum_name']); // Change to composite unique
      })

      .createTable('topic_evaluation_vectors', function (table) {
        table.increments('id').primary();
        table.integer('evaluation_id').notNullable();
        table.string('forum_name').notNullable();
        table.specificType('vector', 'vector(1536)').notNullable();
        table.timestamps(true, true);
        table.unique(['evaluation_id', 'forum_name']); // Change to composite unique
      })

      .createTable('post_evaluation_vectors', function (table) {
        table.increments('id').primary();
        table.integer('evaluation_id').notNullable();
        table.string('forum_name').notNullable();
        table.specificType('vector', 'vector(1536)').notNullable();
        table.timestamps(true, true);
        table.unique(['evaluation_id', 'forum_name']); // Change to composite unique
      })

      .createTable('snapshot_proposal_vectors', function (table) {
        table.increments('id').primary();
        table.string('proposal_id').notNullable();
        table.string('forum_name').notNullable();
        table.specificType('vector', 'vector(1536)').notNullable();
        table.timestamps(true, true);
        table.unique(['proposal_id', 'forum_name']); // Change to composite unique
      })

      .createTable('tally_proposal_vectors', function (table) {
        table.increments('id').primary();
        table.string('proposal_id').notNullable();
        table.string('forum_name').notNullable();
        table.specificType('vector', 'vector(1536)').notNullable();
        table.timestamps(true, true);
        table.unique(['proposal_id', 'forum_name']); // Change to composite unique
      })
      */
      // Embedding State Tracker Table
      .createTable('embedding_state', function (table) {
        table.string('table_name').primary();
        table.string('last_processed_id');
        table.timestamps(true, true);
      })

      // Add Foreign Key Constraints for Vector Tables - Commented out for Railway
      .then(() => {
        return knex.raw(`
    -- Vector table foreign keys commented out for Railway PostgreSQL
    /*
    -- Foreign Keys for Topic Vectors
    ALTER TABLE topic_vectors
    ADD CONSTRAINT fk_topic_vectors_topics
    FOREIGN KEY (topic_id, forum_name)
    REFERENCES topics(id, forum_name)
    ON DELETE CASCADE;

    -- Foreign Keys for Post Vectors
    ALTER TABLE post_vectors
    ADD CONSTRAINT fk_post_vectors_posts
    FOREIGN KEY (post_id, forum_name)
    REFERENCES posts(id, forum_name)
    ON DELETE CASCADE;

    -- Foreign Keys for Topic Evaluation Vectors
    ALTER TABLE topic_evaluation_vectors
    ADD CONSTRAINT fk_topic_evaluation_vectors_topic_evaluations
    FOREIGN KEY (evaluation_id, forum_name)
    REFERENCES topic_evaluations(id, forum_name)
    ON DELETE CASCADE;

    -- Foreign Keys for Post Evaluation Vectors
    ALTER TABLE post_evaluation_vectors
    ADD CONSTRAINT fk_post_evaluation_vectors_post_evaluations
    FOREIGN KEY (evaluation_id, forum_name)
    REFERENCES post_evaluations(id, forum_name)
    ON DELETE CASCADE;

    -- Foreign Keys for Snapshot Proposal Vectors
    ALTER TABLE snapshot_proposal_vectors
    ADD CONSTRAINT fk_snapshot_proposal_vectors_snapshot_proposals
    FOREIGN KEY (proposal_id, forum_name)
    REFERENCES snapshot_proposals(id, forum_name)
    ON DELETE CASCADE;

    -- Foreign Keys for Tally Proposal Vectors
    ALTER TABLE tally_proposal_vectors
    ADD CONSTRAINT fk_tally_proposal_vectors_tally_proposals
    FOREIGN KEY (proposal_id, forum_name)
    REFERENCES tally_proposals(id, forum_name)
    ON DELETE CASCADE;
    */

    -- Keep non-vector foreign keys
    -- Foreign Keys for Proposal Evaluations
    ALTER TABLE tally_proposal_evaluations
    ADD CONSTRAINT fk_tally_proposal_evaluations_tally_proposals
    FOREIGN KEY (proposal_id, forum_name)
    REFERENCES tally_proposals(id, forum_name)
    ON DELETE CASCADE;

    ALTER TABLE snapshot_proposal_evaluations
    ADD CONSTRAINT fk_snapshot_proposal_evaluations_snapshot_proposals
    FOREIGN KEY (proposal_id, forum_name)
    REFERENCES snapshot_proposals(id, forum_name)
    ON DELETE CASCADE;
  `);
      })

      // Create Indexes for Efficient Vector Search - Commented out for Railway
      /*
      .then(() => {
        return knex.raw(`
          CREATE INDEX IF NOT EXISTS idx_topic_vectors_vector ON topic_vectors USING ivfflat (vector vector_l2_ops) WITH (lists = 100);
          CREATE INDEX IF NOT EXISTS idx_post_vectors_vector ON post_vectors USING ivfflat (vector vector_l2_ops) WITH (lists = 100);
          CREATE INDEX IF NOT EXISTS idx_topic_evaluation_vectors_vector ON topic_evaluation_vectors USING ivfflat (vector vector_l2_ops) WITH (lists = 100);
          CREATE INDEX IF NOT EXISTS idx_post_evaluation_vectors_vector ON post_evaluation_vectors USING ivfflat (vector vector_l2_ops) WITH (lists = 100);
          CREATE INDEX IF NOT EXISTS idx_snapshot_proposal_vectors_vector ON snapshot_proposal_vectors USING ivfflat (vector vector_l2_ops) WITH (lists = 100);
          CREATE INDEX IF NOT EXISTS idx_tally_proposal_vectors_vector ON tally_proposal_vectors USING ivfflat (vector vector_l2_ops) WITH (lists = 100);
        `);
      })
      */

      .then(() => {
        return knex.raw(`
          CREATE INDEX idx_topics_forum_name ON topics(forum_name);
          CREATE INDEX idx_posts_forum_name ON posts(forum_name);
          CREATE INDEX idx_proposals_forum_name ON tally_proposals(forum_name);
          `);
      })
      .then(() => {
        return knex.raw(`
      CREATE INDEX IF NOT EXISTS idx_post_evaluations_post_forum 
      ON post_evaluations(post_id, forum_name);
    `);
      })
  );
};

exports.down = function (knex) {
  return (
    knex.schema
      // Drop tables in reverse order of creation
      .dropTableIfExists('embedding_state')
      // Vector tables
      .dropTableIfExists('tally_proposal_vectors')
      .dropTableIfExists('snapshot_proposal_vectors')
      .dropTableIfExists('post_evaluation_vectors')
      .dropTableIfExists('topic_evaluation_vectors')
      .dropTableIfExists('post_vectors')
      .dropTableIfExists('topic_vectors')
      // Evaluation and tag tables
      .dropTableIfExists('post_evaluation_tags')
      .dropTableIfExists('tally_proposal_evaluations')
      .dropTableIfExists('snapshot_proposal_evaluations')
      .dropTableIfExists('post_evaluations')
      .dropTableIfExists('topic_evaluations')
      // Status tables
      .dropTableIfExists('crawl_status')
      // Proposal tables
      .dropTableIfExists('snapshot_proposals')
      .dropTableIfExists('tally_proposals')
      .dropTableIfExists('tally_crawl_status')
      // Tag relationship tables
      .dropTableIfExists('user_tags')
      .dropTableIfExists('post_tags')
      .dropTableIfExists('topic_tags')
      .dropTableIfExists('tags')
      // Core content tables
      .dropTableIfExists('users')
      .dropTableIfExists('posts')
      .dropTableIfExists('topics')
  );
};
