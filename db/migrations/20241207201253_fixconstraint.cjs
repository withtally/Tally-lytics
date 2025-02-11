/* eslint-env node, commonjs */
/* global exports, process, console */

exports.up = function (knex) {
  return knex.schema.alterTable('token_market_data', function (table) {
    table.unique(['forum_name', 'coingecko_id', 'timestamp'], 'token_market_data_unique_idx');
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('token_market_data', function (table) {
    table.dropUnique(['forum_name', 'coingecko_id', 'timestamp'], 'token_market_data_unique_idx');
  });
};
