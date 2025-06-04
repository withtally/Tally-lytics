# Port Configuration Guide

## Overview

The DAO Helper Tool consists of two services:
- **Backend (Indexer)**: The API server that crawls forums and provides data
- **Frontend**: The Next.js web interface

## Configuration Methods

### 1. Local Development (Using Next.js Rewrites)

When running locally, the frontend can proxy API requests to the backend using Next.js rewrites.

**Start Backend:**
```bash
PORT=8080 bun server.ts
```

**Start Frontend:**
```bash
cd frontend/dao-helper-frontened
BACKEND_URL=http://localhost:8080 PORT=4000 npm run dev
```

The frontend will:
- Run on port 4000
- Proxy all `/api/*` requests to `http://localhost:8080/api/*`
- No CORS issues since requests come from the Next.js server

### 2. Production Deployment (Direct API Calls)

For production deployments (e.g., Railway), set the full backend URL:

**Frontend `.env` or Railway variables:**
```
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

### 3. Using Helper Scripts

**Quick start with custom ports:**
```bash
# Backend on 8080, Frontend on 4000
./run-frontend.sh 8080 4000
```

**Start backend only:**
```bash
./start-backend.sh 8080
```

## How It Works

1. **Backend Port**: Set via `PORT` environment variable
   - Default: 3000
   - The server will find the next available port if the preferred one is taken

2. **Frontend Port**: Set via `PORT` environment variable or `-p` flag
   - Default: 3005
   - Example: `PORT=4000 npm run dev` or `npm run dev -- -p 4000`

3. **API Connection**:
   - **Local**: Uses `BACKEND_URL` for Next.js rewrites (server-side proxy)
   - **Production**: Uses `NEXT_PUBLIC_API_URL` for direct client-side calls

## Environment Variables

### Backend
- `PORT`: The port to run the server on (default: 3000)

### Frontend
- `PORT`: The port to run the frontend on (default: 3005)
- `BACKEND_URL`: Backend URL for Next.js rewrites (local development)
- `NEXT_PUBLIC_API_URL`: Backend URL for direct API calls (production)

## Examples

### Local Development
```bash
# Terminal 1: Start backend on port 7000
PORT=7000 bun server.ts

# Terminal 2: Start frontend on port 3000, connecting to backend on 7000
cd frontend/dao-helper-frontened
BACKEND_URL=http://localhost:7000 PORT=3000 npm run dev
```

### Production Build
```bash
# Set environment variable before building
export NEXT_PUBLIC_API_URL=https://api.yourdomain.com
npm run build
npm start
```

### Docker Compose
```yaml
services:
  backend:
    environment:
      - PORT=3000
  frontend:
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:3000
```

## Troubleshooting

1. **CORS Errors**: In local development, use the Next.js rewrite approach (BACKEND_URL) instead of direct API calls
2. **Network Errors**: Ensure the backend is running and accessible on the specified port
3. **Port Conflicts**: The backend will automatically find the next available port if the preferred one is taken