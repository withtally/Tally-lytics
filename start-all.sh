#!/bin/bash

# Start both backend and frontend with proper port management
# Usage: ./start-all.sh [backend-port] [frontend-port]
# Example: ./start-all.sh 3005 4000

BACKEND_PORT=${1:-3005}
FRONTEND_PORT=${2:-4000}

echo "🚀 Starting DAO Helper Tool"
echo "   Backend port:  $BACKEND_PORT"
echo "   Frontend port: $FRONTEND_PORT"
echo ""

# Function to kill process on port
kill_port() {
    local port=$1
    if lsof -ti:$port > /dev/null 2>&1; then
        echo "🔄 Killing existing process on port $port..."
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
}

# Kill existing processes
kill_port $BACKEND_PORT
kill_port $FRONTEND_PORT

# Start backend
echo "🟢 Starting backend on port $BACKEND_PORT..."
PORT=$BACKEND_PORT bun server.ts &
BACKEND_PID=$!

# Wait for backend to be ready
echo "⏳ Waiting for backend to start..."
for i in {1..30}; do
    if curl -s http://localhost:$BACKEND_PORT/api/health > /dev/null 2>&1; then
        echo "✅ Backend is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Backend failed to start after 30 seconds"
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
    sleep 1
done

# Start frontend
echo "🟢 Starting frontend on port $FRONTEND_PORT..."
cd frontend/dao-helper-frontened
BACKEND_URL=http://localhost:$BACKEND_PORT npm run dev -- -p $FRONTEND_PORT &
FRONTEND_PID=$!

# Wait for frontend to be ready
echo "⏳ Waiting for frontend to start..."
sleep 5

echo ""
echo "✅ DAO Helper Tool is running!"
echo "   Backend:  http://localhost:$BACKEND_PORT"
echo "   Frontend: http://localhost:$FRONTEND_PORT"
echo ""
echo "🛑 Press Ctrl+C to stop both services"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    # Also kill any orphaned processes
    kill_port $BACKEND_PORT
    kill_port $FRONTEND_PORT
    echo "👋 Goodbye!"
    exit 0
}

# Set up trap to cleanup on Ctrl+C
trap cleanup INT TERM

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID