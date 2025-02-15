-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify the extension is installed
SELECT * FROM pg_extension WHERE extname = 'vector'; 