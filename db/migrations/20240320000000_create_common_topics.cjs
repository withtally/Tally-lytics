/* eslint-env node, commonjs */

exports.up = function (knex) {
  return knex.schema.createTable('common_topics', table => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.text('base_metadata').nullable();
    table.text('full_data').nullable();
    table.text('context').nullable();
    table.text('citations').nullable();
    table.string('forum_name').notNullable();
    table.timestamps(true, true);

    // Add indexes for common queries
    table.index(['forum_name']);
    table.index(['name']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('common_topics');
};
