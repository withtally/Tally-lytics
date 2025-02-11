/* eslint-env node, commonjs */
/* global exports, process, console */

exports.up = function (knex) {
  return knex.schema.createTable('snapshot_crawl_status', function (table) {
    table.string('space_id').notNullable().primary();
    table.timestamp('last_crawl_timestamp').defaultTo(knex.fn.now()).notNullable();
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('snapshot_crawl_status');
};
