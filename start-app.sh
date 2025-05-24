#!/bin/bash

# Script to start both backend and frontend with different environment configurations
# Usage: ./start-app.sh [local|prod]

# Default to local if no argument is provided
ENV=${1:-local}

# Function to handle process termination
cleanup() {
  echo "Shutting down processes..."
  # Kill background processes
  if [ ! -z "$BACKEND_PID" ]; then
    kill $BACKEND_PID 2>/dev/null
  fi
  if [ ! -z "$FRONTEND_PID" ]; then
    kill $FRONTEND_PID 2>/dev/null
  fi
  exit 0
}

# Set up trap for clean exit
trap cleanup SIGINT SIGTERM

case "$ENV" in
  local)
    echo "Starting application in LOCAL environment"
    echo "----------------------------------------"
    
    # Start backend
    echo "Starting backend server on http://localhost:3004..."
    cd "$(dirname "$0")"
    bun start &
    BACKEND_PID=$!
    echo "Backend started with PID: $BACKEND_PID"
    
    # Wait a bit for backend to initialize
    sleep 2
    
    # Start frontend with local environment
    echo "Starting frontend with local environment..."
    cd "$(dirname "$0")/frontend/dao-helper-frontened"
    NEXT_PUBLIC_API_URL=http://localhost:3004 npm run dev &
    FRONTEND_PID=$!
    echo "Frontend started with PID: $FRONTEND_PID"
    ;;
    
  prod)
    echo "Starting application in PRODUCTION environment"
    echo "---------------------------------------------"
    
    # Start frontend with production environment
    echo "Starting frontend with production environment..."
    cd "$(dirname "$0")/frontend/dao-helper-frontened"
    NEXT_PUBLIC_API_URL=https://web-production-88af4.up.railway.app npm run dev &
    FRONTEND_PID=$!
    echo "Frontend started with PID: $FRONTEND_PID"
    ;;
    
  *)
    echo "Invalid environment: $ENV"
    echo "Usage: ./start-app.sh [local|prod]"
    exit 1
    ;;
esac

echo "----------------------------------------"
echo "Application is running!"
echo "Press Ctrl+C to stop all processes"

# Wait for user to terminate
wait
