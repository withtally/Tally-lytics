-- Rename dao_name column to forum_name
ALTER TABLE news_articles 
RENAME COLUMN dao_name TO forum_name;

-- Rename the index to match the new column name
DROP INDEX IF EXISTS idx_news_articles_dao_name;
CREATE INDEX idx_news_articles_forum_name ON news_articles(forum_name);

-- Update the unique constraint
ALTER TABLE news_articles 
DROP CONSTRAINT IF EXISTS news_articles_dao_name_url_key;
ALTER TABLE news_articles 
ADD CONSTRAINT news_articles_forum_name_url_key UNIQUE(forum_name, url); 