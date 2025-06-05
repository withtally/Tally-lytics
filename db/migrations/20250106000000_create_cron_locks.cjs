/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('cron_locks', function(table) {
    table.string('lock_name').primary();
    table.string('instance_id').notNullable();
    table.timestamp('acquired_at').notNullable();
    table.timestamp('expires_at').notNullable();
    table.timestamp('heartbeat_at').notNullable();
    
    // Indexes for performance
    table.index(['expires_at'], 'idx_cron_locks_expires_at');
    table.index(['instance_id'], 'idx_cron_locks_instance_id');
    table.index(['heartbeat_at'], 'idx_cron_locks_heartbeat_at');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('cron_locks');
};