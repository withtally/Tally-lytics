# Docker Setup for DAO Helper Tool

This guide explains how to run the DAO Helper Tool with Claude inside Docker containers.

## Prerequisites

- Docker and Docker Compose installed
- Environment variables configured (see below)

## Setup Instructions

### 1. Create Environment File

Create a `.env` file in the project root with your API keys:

```bash
OPENAI_API_KEY=your_openai_key
ARBITRUM_API_KEY=your_arbitrum_key
OPTIMISM_API_KEY=your_optimism_key
APECOIN_API_KEY=your_apecoin_key
PENDLE_API_KEY=your_pendle_key
COMPOUND_API_KEY=your_compound_key
COINGECKO_PRO_API_KEY=your_coingecko_key
NEWS_API_KEY=your_news_api_key
```

### 2. Build and Start Services

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

This will start:
- PostgreSQL with pgvector extension (port 5432)
- Backend API (port 3004)
- Frontend Next.js app (port 3000)

### 3. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:3004
- Database: localhost:5432 (user: postgres, password: postgres)

## Working with Claude in Docker

### Option 1: Develop Inside Container (Recommended)

1. Start the containers:
   ```bash
   docker-compose up -d
   ```

2. Access the backend container:
   ```bash
   docker exec -it dao-helper-backend sh
   ```

3. Now Claude can work directly in the container environment with all dependencies available.

### Option 2: Mount Project Directory

The docker-compose.yml already mounts your local project directory into the container, so changes made locally will be reflected inside the container.

### Option 3: VS Code Dev Containers

Create `.devcontainer/devcontainer.json`:

```json
{
  "name": "DAO Helper Tool",
  "dockerComposeFile": "../docker-compose.yml",
  "service": "backend",
  "workspaceFolder": "/app",
  "customizations": {
    "vscode": {
      "extensions": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode"
      ]
    }
  }
}
```

## Common Docker Commands

```bash
# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres

# Restart services
docker-compose restart backend

# Run database migrations
docker exec dao-helper-backend bun migrate

# Access database
docker exec -it dao-helper-postgres psql -U postgres -d dao_helper

# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v
```

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is healthy: `docker-compose ps`
- Check logs: `docker-compose logs postgres`
- Verify pgvector extension is installed

### Frontend Can't Connect to Backend
- Ensure backend is running: `docker-compose ps backend`
- Check backend logs: `docker-compose logs backend`
- Verify NEXT_PUBLIC_API_URL is set correctly

### Permission Issues
- The containers run as non-root users for security
- If you encounter permission issues, check file ownership

## Development Workflow

1. Make code changes locally
2. Changes are automatically reflected in containers (via volume mounts)
3. Backend will auto-restart with Bun's watch mode
4. Frontend will hot-reload with Next.js

## Production Considerations

For production deployment:
1. Use specific image tags instead of building
2. Set NODE_ENV=production
3. Use secrets management for API keys
4. Configure proper health checks
5. Set up container orchestration (Kubernetes, ECS, etc.)