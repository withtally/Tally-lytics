#!/bin/bash

# Start DAO Helper Tool backend indexer
# Usage: ./start-backend.sh [port]
# Example: ./start-backend.sh 8080

BACKEND_PORT=${1:-3005}

echo "🚀 Starting DAO Helper Tool Backend Indexer"
echo "   Port: $BACKEND_PORT"

# Kill any existing process on this port
echo "🔄 Checking for existing processes on port $BACKEND_PORT..."
if lsof -ti:$BACKEND_PORT > /dev/null 2>&1; then
    echo "   Killing existing process on port $BACKEND_PORT"
    lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null || true
    sleep 1
fi

# Start backend
echo "🟢 Starting backend server..."
PORT=$BACKEND_PORT bun server.ts