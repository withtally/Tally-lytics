/* eslint-env node, commonjs */
/* global exports, process, console */

// Example migration: db/migrations/20241202000000_add_token_market_data_state.cjs
exports.up = function (knex) {
  return knex.schema.createTable('token_market_data_state', function (table) {
    table.increments('id').primary();
    table.string('forum_name').notNullable();
    table.string('coingecko_id').notNullable();
    table.date('last_processed_date').nullable();
    table.unique(['forum_name', 'coingecko_id']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('token_market_data_state');
};
