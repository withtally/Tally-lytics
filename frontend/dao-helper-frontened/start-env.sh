#!/bin/bash

# Script to start the frontend with different environment configurations
# Usage: ./start-env.sh [local|prod]

# Default to local if no argument is provided
ENV=${1:-local}

case "$ENV" in
  local)
    echo "Starting frontend with local environment..."
    echo "API URL: http://localhost:3001"
    NEXT_PUBLIC_API_URL=http://localhost:3001 npm run dev
    ;;
  prod)
    echo "Starting frontend with production environment..."
    echo "API URL: https://web-production-88af4.up.railway.app"
    NEXT_PUBLIC_API_URL=https://web-production-88af4.up.railway.app npm run dev
    ;;
  *)
    echo "Invalid environment: $ENV"
    echo "Usage: ./start-env.sh [local|prod]"
    exit 1
    ;;
esac
