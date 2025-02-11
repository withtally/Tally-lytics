/* eslint-env node, commonjs */
/* global exports, process, console */

exports.up = function (knex) {
  return knex.schema.createTable('news_articles', function (table) {
    table.increments('id').primary();
    table.string('dao_name').notNullable();
    table.string('source_id').nullable();
    table.string('source_name').nullable();
    table.string('author').nullable();
    table.string('title').notNullable();
    table.text('description').nullable();
    table.text('url').notNullable();
    table.text('url_to_image').nullable();
    table.timestamp('published_at').nullable();
    table.text('content').nullable();
    table.timestamps(true, true);

    // Indexes
    table.index(['dao_name', 'published_at']);

    // Unique constraint so we can use ON CONFLICT in inserts
    table.unique(['dao_name', 'url'], 'news_articles_dao_name_url_unique');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('news_articles');
};
