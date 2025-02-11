-- Create news_articles table
CREATE TABLE IF NOT EXISTS news_articles (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    description TEXT,
    author TEXT,
    published_at TIMESTAMP WITH TIME ZONE,
    url TEXT NOT NULL,
    url_to_image TEXT,
    source_id TEXT,
    source_name TEXT,
    dao_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(dao_name, url)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_news_articles_dao_name ON news_articles(dao_name);
CREATE INDEX IF NOT EXISTS idx_news_articles_published_at ON news_articles(published_at); 