#!/bin/bash

# Run frontend connected to a specific backend port
# Usage: ./run-frontend.sh [backend-port] [frontend-port]
# Example: ./run-frontend.sh 8080 4000

BACKEND_PORT=${1:-3005}
FRONTEND_PORT=${2:-3006}

echo "🚀 Starting Frontend"
echo "   Backend port: $BACKEND_PORT"
echo "   Frontend port: $FRONTEND_PORT"

cd frontend/dao-helper-frontened

# The BACKEND_URL is used by next.config.ts for API rewrites
BACKEND_URL=http://localhost:$BACKEND_PORT PORT=$FRONTEND_PORT npm run dev