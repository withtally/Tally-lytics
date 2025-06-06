FROM pgvector/pgvector:pg16

# Install pg_cron extension
RUN apt-get update && \
    apt-get install -y postgresql-16-cron && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create initialization script
COPY init-extensions.sql /docker-entrypoint-initdb.d/

# The pgvector/pgvector image already includes PostgreSQL with pgvector installed