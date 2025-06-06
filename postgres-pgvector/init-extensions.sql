-- Initialize database with required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant permissions for cron if needed
ALTER SYSTEM SET cron.database_name = 'railway';