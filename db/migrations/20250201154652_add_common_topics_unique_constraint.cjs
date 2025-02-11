/* eslint-env node, commonjs */
/* global exports, process, console */

exports.up = async function (knex) {
  const result = await knex.raw(`SELECT constraint_name FROM information_schema.table_constraints WHERE table_name = 'common_topics' AND constraint_name = 'common_topics_name_forum_name_unique';`);
  if (result.rows && result.rows.length === 0) {
    return knex.schema.alterTable('common_topics', function (table) {
      table.unique(['name', 'forum_name'], 'common_topics_name_forum_name_unique');
    });
  } else {
    console.log("Constraint 'common_topics_name_forum_name_unique' already exists. Skipping migration.");
    return Promise.resolve();
  }
};

exports.down = async function (knex) {
  const result = await knex.raw(`SELECT constraint_name FROM information_schema.table_constraints WHERE table_name = 'common_topics' AND constraint_name = 'common_topics_name_forum_name_unique';`);
  if (result.rows && result.rows.length > 0) {
    return knex.schema.alterTable('common_topics', function (table) {
      table.dropUnique(['name', 'forum_name'], 'common_topics_name_forum_name_unique');
    });
  } else {
    console.log("Constraint 'common_topics_name_forum_name_unique' does not exist. Skipping rollback.");
    return Promise.resolve();
  }
};
