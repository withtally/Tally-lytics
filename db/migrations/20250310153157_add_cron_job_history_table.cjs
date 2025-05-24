/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('cron_job_history', function (table) {
    table.increments('id').primary();
    table.string('job_name').notNullable();
    table.string('status').notNullable();
    table.text('message');
    table.timestamp('started_at').defaultTo(knex.fn.now());
    table.timestamp('completed_at');
    table.integer('duration_ms');

    // Add indexes
    table.index('job_name');
    table.index('status');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable('cron_job_history');
};
