#!/bin/bash

# Production startup script for Railway deployment
# Runs migrations in background and starts server immediately

echo "Starting production server..."

# Run migrations in background (non-blocking)
echo "Running database migrations in background..."
bun migrate 2>&1 | tee migrations.log &

# Start the server immediately (so health checks pass)
echo "Starting server on port ${PORT:-3004}..."
exec bun start