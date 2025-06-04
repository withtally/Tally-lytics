#!/bin/bash

# Start DAO Helper Tool frontend pointing to specific backend port
# Usage: ./start-with-ports.sh [backend-port] [frontend-port]
# Example: ./start-with-ports.sh 8080 3000

BACKEND_PORT=${1:-3005}
FRONTEND_PORT=${2:-3006}

echo "🚀 Starting DAO Helper Tool Frontend"
echo "   Backend indexer port: $BACKEND_PORT"
echo "   Frontend port: $FRONTEND_PORT"

# Kill any existing process on frontend port
lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null || true

# Update .env.local with the backend URL
cd frontend/dao-helper-frontened
echo "Updating .env.local with backend URL..."
sed -i '' "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=http://localhost:$BACKEND_PORT|" .env.local 2>/dev/null || \
echo "NEXT_PUBLIC_API_URL=http://localhost:$BACKEND_PORT" >> .env.local

# Start frontend
PORT=$FRONTEND_PORT npm run dev