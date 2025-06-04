#!/bin/bash

# Start DAO Helper Tool backend indexer
# Usage: ./start-backend.sh [port]
# Example: ./start-backend.sh 8080

BACKEND_PORT=${1:-3005}

echo "🚀 Starting DAO Helper Tool Backend Indexer"
echo "   Port: $BACKEND_PORT"

# Kill any existing process on this port
lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null || true

# Start backend
PORT=$BACKEND_PORT bun server.ts