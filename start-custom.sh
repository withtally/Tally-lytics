#!/bin/bash

# Start DAO Helper Tool with custom ports
# Usage: ./start-custom.sh [backend-port] [frontend-port]
# Example: ./start-custom.sh 4000 4001

BACKEND_PORT=${1:-3005}
FRONTEND_PORT=${2:-3006}
BACKEND_API_URL="http://localhost:$BACKEND_PORT"

echo "Starting DAO Helper Tool..."
echo "Backend port: $BACKEND_PORT"
echo "Frontend port: $FRONTEND_PORT"

# Kill any existing processes on these ports
lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null || true
lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null || true

# Start backend
echo "Starting backend on port $BACKEND_PORT..."
PORT=$BACKEND_PORT bun server.ts &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Update frontend env to point to backend
echo "Updating frontend configuration..."
cat > frontend/dao-helper-frontened/.env.local << EOF
# Authentication
NEXTAUTH_URL=http://localhost:$FRONTEND_PORT
NEXTAUTH_SECRET=Z/tDzbDrFHO4ReveBP5FEXxVLbIzECTeN1SINx4Y41M=
ADMIN_PASSWORD=admin123

# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:$BACKEND_PORT
EOF

# Start frontend
echo "Starting frontend on port $FRONTEND_PORT..."
cd frontend/dao-helper-frontened
PORT=$FRONTEND_PORT npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ DAO Helper Tool is running!"
echo "   Backend:  http://localhost:$BACKEND_PORT"
echo "   Frontend: http://localhost:$FRONTEND_PORT"
echo ""
echo "Press Ctrl+C to stop both services"

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait