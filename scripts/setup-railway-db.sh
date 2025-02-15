#!/bin/bash

# Exit on error
set -e

echo "Starting Railway PostgreSQL database setup..."

# Verify Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "Railway CLI not found. Please install it first:"
    echo "npm i -g @railway/cli"
    exit 1
fi

# Verify Railway login
echo "Verifying Railway login..."
railway whoami || {
    echo "Please login to Railway first:"
    echo "railway login"
    exit 1
}

# Enable pgvector extension
echo "Enabling pgvector extension..."
railway run --service postgresql "psql \$DATABASE_URL -f scripts/enable-pgvector.sql"

# Verify pgvector installation
echo "Verifying pgvector installation..."
railway run --service postgresql "psql \$DATABASE_URL -c \"SELECT * FROM pg_extension WHERE extname = 'vector';\""

# Run migrations
echo "Running database migrations..."
railway run npm run migrate:prod

echo "Database setup complete!"
echo "Your Railway PostgreSQL database is now ready for use." 