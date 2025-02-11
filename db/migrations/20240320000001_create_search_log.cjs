/* eslint-env node, commonjs */

exports.up = function (knex) {
  return knex.schema.createTable('search_log', table => {
    table.increments('id').primary();
    table.string('query').notNullable();
    table.string('forum_name').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Add index for frequent queries
    table.index(['created_at']);
    table.index(['forum_name']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('search_log');
};
