/* eslint-env node, commonjs */
/* global exports */

exports.up = function (knex) {
  return knex.schema.alterTable('news_articles', table => {
    // Drop existing index and unique constraint that use dao_name
    table.dropIndex(['dao_name', 'published_at']);
    table.dropUnique(['dao_name', 'url'], 'news_articles_dao_name_url_unique');
    
    // Rename the column
    table.renameColumn('dao_name', 'forum_name');
    
    // Recreate index and unique constraints with new column name
    table.index(['forum_name', 'published_at']);
    table.unique(['forum_name', 'url'], 'news_articles_forum_name_url_unique');
    table.unique(['id', 'forum_name'], 'news_articles_id_forum_name_unique');
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('news_articles', table => {
    // Drop indexes and unique constraints that use forum_name
    table.dropIndex(['forum_name', 'published_at']);
    table.dropUnique(['forum_name', 'url'], 'news_articles_forum_name_url_unique');
    table.dropUnique(['id', 'forum_name'], 'news_articles_id_forum_name_unique');
    
    // Rename the column back
    table.renameColumn('forum_name', 'dao_name');
    
    // Recreate original index and unique constraint
    table.index(['dao_name', 'published_at']);
    table.unique(['dao_name', 'url'], 'news_articles_dao_name_url_unique');
  });
}; 