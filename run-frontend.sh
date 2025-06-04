#!/bin/bash

# Run frontend connected to a specific backend port
# Usage: ./run-frontend.sh [backend-port] [frontend-port]
# Example: ./run-frontend.sh 8080 4000

BACKEND_PORT=${1:-3005}
FRONTEND_PORT=${2:-3006}

echo "🚀 Starting Frontend"
echo "   Backend port: $BACKEND_PORT"
echo "   Frontend port: $FRONTEND_PORT"

# Kill any existing process on the frontend port
echo "🔄 Checking for existing processes on port $FRONTEND_PORT..."
if lsof -ti:$FRONTEND_PORT > /dev/null 2>&1; then
    echo "   Killing existing process on port $FRONTEND_PORT"
    lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null || true
    sleep 1
fi

cd frontend/dao-helper-frontened

# The BACKEND_URL is used by next.config.ts for API rewrites
echo "📡 Connecting to backend at http://localhost:$BACKEND_PORT"
BACKEND_URL=http://localhost:$BACKEND_PORT npm run dev -- -p $FRONTEND_PORT