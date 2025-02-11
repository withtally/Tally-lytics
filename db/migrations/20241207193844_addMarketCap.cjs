/* eslint-env node, commonjs */
/* global exports, process, console */

exports.up = function (knex) {
  return knex.schema.createTable('token_market_data', function (table) {
    table.increments('id').primary();
    table.string('forum_name').notNullable();
    table.string('coingecko_id').notNullable(); // The coin's id on coingecko
    table.bigint('timestamp').notNullable();
    table.date('date').notNullable();
    table.decimal('price', 30, 10).nullable();
    table.decimal('market_cap', 40, 10).nullable();
    table.decimal('volume', 40, 10).nullable();
    table.timestamps(true, true);

    // Indexes for faster querying
    table.index(['forum_name', 'date']);
    table.index(['coingecko_id', 'date']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('token_market_data');
};
