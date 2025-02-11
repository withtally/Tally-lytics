/* eslint-env node, commonjs */
/* global exports, process, console */

exports.up = function (knex) {
  return knex.schema.alterTable('users', function (table) {
    // Basic user info
    table.string('avatar_template').nullable();
    table.string('name').nullable();
    table.text('bio').nullable();
    table.string('website').nullable();
    table.string('location').nullable();
    table.timestamp('last_seen_at').nullable();
    table.boolean('moderator').defaultTo(false);
    table.boolean('admin').defaultTo(false);
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('users', function (table) {
    table.dropColumn('avatar_template');
    table.dropColumn('name');
    table.dropColumn('bio');
    table.dropColumn('website');
    table.dropColumn('location');
    table.dropColumn('last_seen_at');
    table.dropColumn('moderator');
    table.dropColumn('admin');
  });
};
