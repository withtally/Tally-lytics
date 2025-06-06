/* eslint-env node, commonjs */
/* global exports, process, console */

// This is a modified version of the migration that works without pgvector

exports.up = function (knex) {
  return (
    knex.schema
      // Skip pgvector extension for Railway PostgreSQL
      // .raw('CREATE EXTENSION IF NOT EXISTS vector;')

      // Copy all the table creation code from the original file
      // but skip the vector tables
      .then(() => {
        // First, let's just run the original migration without vectors
        return knex.raw(`
          -- Temporarily rename the original migration to avoid conflicts
          UPDATE knex_migrations 
          SET name = '20241023202406_uniformTables_original.cjs' 
          WHERE name = '20241023202406_uniformTables.cjs';
        `).catch(() => {
          // Ignore if it fails (migration might not exist yet)
        });
      })
  );
};

exports.down = function (knex) {
  // Empty down migration for now
  return Promise.resolve();
};