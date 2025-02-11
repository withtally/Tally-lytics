/* eslint-env node, commonjs */
/* global exports, process, console */

exports.up = async function (knex) {
  // Remove all existing articles
  await knex('news_articles').truncate();

  // Now alter columns to TEXT
  await knex.schema.alterTable('news_articles', function (table) {
    table.text('author').alter();
    table.text('content').alter();
    table.text('description').alter();
    table.text('title').alter();
    table.text('url').alter();
    table.text('url_to_image').alter();
    table.text('source_name').alter();
    table.text('source_id').alter();
  });
};

exports.down = async function (knex) {
  // If needed, revert changes (not strictly necessary if you won't roll back)
  await knex.schema.alterTable('news_articles', function (table) {
    table.string('author', 255).alter();
    table.string('content', 255).alter();
    table.string('description', 255).alter();
    table.string('title', 255).alter();
    table.string('url', 255).alter();
    table.string('url_to_image', 255).alter();
    table.string('source_name', 255).alter();
    table.string('source_id', 255).alter();
  });
};
