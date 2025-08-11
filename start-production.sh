#!/bin/bash

# Production startup script for Railway deployment
# IMPORTANT: This is production with existing tables - migrations are optional

echo "Starting production server..."

# Check if we should run migrations (opt-in for safety)
if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "RUN_MIGRATIONS is set to true - running database migrations..."
  bun migrate 2>&1 | tee migrations.log
  echo "Migrations complete."
else
  echo "Skipping migrations (set RUN_MIGRATIONS=true to run them)"
fi

# Start the server
echo "Starting server on port ${PORT:-3004}..."
exec bun start