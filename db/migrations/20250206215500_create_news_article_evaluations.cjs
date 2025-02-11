/* eslint-env node, commonjs */
/* global exports */

exports.up = function (knex) {
  return knex.schema.createTable('news_article_evaluations', table => {
    table.increments('id').primary();
    table.integer('news_article_id').notNullable();
    table.string('forum_name').notNullable();
    table.text('evaluation').notNullable();
    table.float('relevance_score');
    table.float('sentiment_score');
    table.jsonb('metadata');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Add foreign key constraint
    table.foreign(['news_article_id', 'forum_name'])
      .references(['id', 'forum_name'])
      .on('news_articles')
      .onDelete('CASCADE');

    // Add unique constraint to prevent duplicate evaluations
    table.unique(['news_article_id', 'forum_name']);

    // Add index for faster lookups
    table.index(['forum_name', 'relevance_score']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('news_article_evaluations');
}; 
