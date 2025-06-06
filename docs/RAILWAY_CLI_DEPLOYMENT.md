# Railway CLI Deployment Guide

This guide shows how to deploy the DAO Helper Tool entirely from the command line using Railway's CLI.

## Prerequisites

1. **Node.js** installed (for Railway CLI)
2. **jq** installed for JSON parsing: `brew install jq` (macOS) or `apt-get install jq` (Linux)
3. **Railway account** - Sign up at [railway.app](https://railway.app)
4. **.env file** with your API keys

## Quick Start

```bash
# Run the automated deployment script
./scripts/deploy-to-railway.sh
```

## Manual CLI Deployment

### 1. Install Railway CLI

```bash
npm install -g @railway/cli
```

### 2. Login to Railway

```bash
railway login
```

### 3. Initialize Project

```bash
# Create new project
railway init

# Or link to existing project
railway link
```

### 4. Create PostgreSQL Database

```bash
# Add PostgreSQL service
railway add --database postgres

# Wait for database to be ready, then enable pgvector
railway run --service postgres -- psql -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### 5. Set Environment Variables

```bash
# Set individual variables
railway variables set OPENAI_API_KEY="your-key"
railway variables set OPENAI_ORG_ID="your-org-id"
railway variables set NODE_ENV="production"

# Or load from .env file
cat .env | while IFS='=' read -r key value; do
    railway variables set "$key=$value"
done
```

### 6. Deploy Backend Service

```bash
# Create backend service
railway service create backend
railway link backend

# Deploy
railway up

# Get the backend URL
railway open
```

### 7. Deploy Frontend Service

```bash
# Create frontend service
railway service create frontend
railway link frontend

# Set frontend-specific variables
railway variables set NEXT_PUBLIC_API_URL="https://your-backend.railway.app"
railway variables set RAILWAY_BUILD_COMMAND="cd frontend/dao-helper-frontened && npm install && npm run build"
railway variables set RAILWAY_START_COMMAND="cd frontend/dao-helper-frontened && npm start"

# Deploy
railway up
```

### 8. Run Database Migrations

```bash
railway link backend
railway run bun migrate:prod
```

### 9. Setup Cron Service (Optional)

```bash
railway service create cron
railway link cron
railway up
```

## Useful Railway CLI Commands

### Project Management

```bash
# List all projects
railway list

# Show project status
railway status

# Open project in browser
railway open
```

### Service Management

```bash
# List services in project
railway service list

# Switch between services
railway link [service-name]

# View service logs
railway logs

# Follow logs in real-time
railway logs -f
```

### Environment Variables

```bash
# List all variables
railway variables

# Set a variable
railway variables set KEY=value

# Get a specific variable
railway variables get KEY

# Delete a variable
railway variables delete KEY
```

### Database Operations

```bash
# Connect to database
railway connect postgres

# Run SQL command
railway run --service postgres -- psql -c "SELECT * FROM users LIMIT 5;"

# Database URL
railway variables get DATABASE_URL
```

### Deployment

```bash
# Deploy current directory
railway up

# Deploy with custom Dockerfile
railway up -d ./path/to/Dockerfile

# Redeploy service
railway redeploy

# Cancel deployment
railway cancel
```

### Monitoring

```bash
# View logs
railway logs --service backend

# View build logs
railway logs --build

# Service metrics
railway metrics
```

## Advanced Automation

### Deploy All Services Script

```bash
#!/bin/bash
# deploy-all.sh

services=("backend" "frontend" "cron")

for service in "${services[@]}"; do
    echo "Deploying $service..."
    railway link $service
    railway up --detach
done
```

### Environment Sync Script

```bash
#!/bin/bash
# sync-env.sh

# Export from one environment
railway link production
railway variables > prod.env

# Import to another
railway link staging
source prod.env
```

### Health Check Script

```bash
#!/bin/bash
# health-check.sh

BACKEND_URL=$(railway status --json | jq -r '.domains[0]')

if curl -s "https://$BACKEND_URL/api/health" | grep -q "ok"; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend health check failed"
    railway logs --tail 50
fi
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy to Railway

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Railway
        run: npm install -g @railway/cli
      
      - name: Deploy to Railway
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        run: |
          railway link ${{ secrets.RAILWAY_PROJECT_ID }}
          railway up
```

To get your Railway token:
```bash
railway tokens create deployment-token
```

## Troubleshooting

### Common Issues

1. **Authentication Error**
   ```bash
   railway logout
   railway login
   ```

2. **Service Not Found**
   ```bash
   railway service list
   railway link [correct-service-name]
   ```

3. **Environment Variables Not Set**
   ```bash
   railway variables
   # Check if variables are set for the correct service
   ```

4. **Database Connection Issues**
   ```bash
   # Check database logs
   railway logs --service postgres
   
   # Test connection
   railway connect postgres
   ```

### Debug Mode

```bash
# Enable debug output
export RAILWAY_DEBUG=1
railway up
```

## Best Practices

1. **Use Service-Specific Configs**: Keep configurations separated by service
2. **Version Control**: Don't commit sensitive `.env` files
3. **Automated Scripts**: Create scripts for common operations
4. **Monitor Deployments**: Use `railway logs -f` during deployments
5. **Backup Database**: Before major changes, export your data:
   ```bash
   railway run --service postgres -- pg_dump > backup.sql
   ```