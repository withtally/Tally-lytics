#!/bin/bash

# Simple startup script - no parameters needed
# Backend: 3005, Frontend: 3006

echo "🚀 Starting DAO Helper Tool"

# Kill anything on our default ports
echo "🔄 Cleaning up ports..."
lsof -ti:3005 | xargs kill -9 2>/dev/null || true
lsof -ti:3006 | xargs kill -9 2>/dev/null || true
sleep 1

# Start backend on 3005 in production mode to use Supabase
echo "🟢 Starting backend on port 3005..."
NODE_ENV=production PORT=3005 bun server.ts &
BACKEND_PID=$!

# Wait for backend
echo "⏳ Waiting for backend..."
for i in {1..10}; do
    if curl -s http://localhost:3005/api/health > /dev/null 2>&1; then
        echo "✅ Backend ready!"
        break
    fi
    sleep 1
done

# Update frontend .env.local to point to backend
echo "📝 Configuring frontend..."
cd frontend/dao-helper-frontened
cat > .env.local << EOF
# Authentication
NEXTAUTH_URL=http://localhost:3006
NEXTAUTH_SECRET=Z/tDzbDrFHO4ReveBP5FEXxVLbIzECTeN1SINx4Y41M=
ADMIN_PASSWORD=admin123

# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:3005
EOF

# Start frontend on 3006
echo "🟢 Starting frontend on port 3006..."
npm run dev -- -p 3006 &
FRONTEND_PID=$!

# Give frontend time to start
sleep 5

echo ""
echo "✅ DAO Helper Tool is running!"
echo "   Backend:  http://localhost:3005"
echo "   Frontend: http://localhost:3006"
echo "   Password: admin123"
echo ""
echo "🛑 Press Ctrl+C to stop"

# Cleanup on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait