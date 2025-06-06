#!/bin/bash

# Railway CLI Deployment Script for DAO Helper Tool
# This script automates the entire Railway deployment process

set -e  # Exit on error

echo "🚂 Railway Deployment Script for DAO Helper Tool"
echo "=============================================="

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
else
    echo "✅ Railway CLI is installed"
fi

# Check if user is logged in
if ! railway whoami &> /dev/null; then
    echo "🔐 Please login to Railway:"
    railway login
else
    echo "✅ Already logged in to Railway"
fi

# Function to create or use existing project
setup_project() {
    echo -e "\n📦 Setting up Railway project..."
    
    # Check if we're already linked to a project
    if railway status &> /dev/null; then
        echo "✅ Already linked to a Railway project"
        PROJECT_ID=$(railway status --json | jq -r '.projectId')
    else
        echo "Creating new Railway project..."
        railway init
        PROJECT_ID=$(railway status --json | jq -r '.projectId')
    fi
    
    echo "Project ID: $PROJECT_ID"
}

# Function to create PostgreSQL database with pgvector
setup_database() {
    echo -e "\n🗄️  Setting up PostgreSQL database..."
    
    # Check if database already exists
    if railway service list | grep -q "postgres"; then
        echo "✅ PostgreSQL service already exists"
    else
        echo "Creating PostgreSQL service..."
        railway add --database postgres
        
        # Wait for database to be ready
        echo "Waiting for database to be ready..."
        sleep 30
    fi
    
    # Get database connection details
    echo "Getting database connection string..."
    railway variables set SUPABASE_CONNECTION_STRING="$(railway variables get DATABASE_URL)"
    
    # Enable pgvector extension
    echo "Enabling pgvector extension..."
    railway run --service postgres -- psql -c "CREATE EXTENSION IF NOT EXISTS vector;"
}

# Function to set environment variables
setup_environment_variables() {
    echo -e "\n🔧 Setting up environment variables..."
    
    # Check for .env file
    if [ ! -f .env ]; then
        echo "❌ .env file not found. Please create one with your API keys."
        echo "Required variables:"
        echo "  - OPENAI_API_KEY"
        echo "  - OPENAI_ORG_ID"
        echo "Optional variables:"
        echo "  - COINGECKO_PRO_API_KEY"
        echo "  - NEWS_API_KEY"
        echo "  - Forum API keys (ARBITRUM_API_KEY, etc.)"
        exit 1
    fi
    
    # Load variables from .env file and set them in Railway
    echo "Loading environment variables from .env..."
    while IFS='=' read -r key value; do
        # Skip comments and empty lines
        if [[ ! "$key" =~ ^#.*$ ]] && [[ -n "$key" ]]; then
            # Remove quotes from value if present
            value="${value%\"}"
            value="${value#\"}"
            value="${value%\'}"
            value="${value#\'}"
            
            echo "Setting $key..."
            railway variables set "$key=$value"
        fi
    done < .env
    
    # Set production-specific variables
    railway variables set NODE_ENV=production
    railway variables set PORT=3004
}

# Function to deploy backend service
deploy_backend() {
    echo -e "\n🚀 Deploying backend service..."
    
    # Create or switch to backend service
    if railway service list | grep -q "backend"; then
        echo "✅ Backend service exists"
        railway link backend
    else
        echo "Creating backend service..."
        railway service create backend
        railway link backend
    fi
    
    # Deploy using existing railway.toml configuration
    echo "Deploying backend..."
    railway up --detach
    
    # Get backend URL
    BACKEND_URL=$(railway open --json | jq -r '.url')
    echo "Backend URL: $BACKEND_URL"
}

# Function to deploy frontend service
deploy_frontend() {
    echo -e "\n🎨 Deploying frontend service..."
    
    # Create or switch to frontend service
    if railway service list | grep -q "frontend"; then
        echo "✅ Frontend service exists"
        railway link frontend
    else
        echo "Creating frontend service..."
        railway service create frontend
        railway link frontend
    fi
    
    # Set frontend-specific variables
    railway variables set NEXT_PUBLIC_API_URL="https://$BACKEND_URL"
    railway variables set RAILWAY_BUILD_COMMAND="cd frontend/dao-helper-frontened && npm install && npm run build"
    railway variables set RAILWAY_START_COMMAND="cd frontend/dao-helper-frontened && npm start"
    
    # Deploy frontend
    echo "Deploying frontend..."
    railway up --detach
    
    # Get frontend URL
    FRONTEND_URL=$(railway open --json | jq -r '.url')
    echo "Frontend URL: $FRONTEND_URL"
}

# Function to run database migrations
run_migrations() {
    echo -e "\n📋 Running database migrations..."
    railway link backend
    railway run bun migrate:prod
}

# Function to setup cron jobs
setup_cron() {
    echo -e "\n⏰ Setting up cron jobs..."
    
    # The cron configuration is already in railway.toml
    # Just need to ensure the cron service is created
    if railway service list | grep -q "cron"; then
        echo "✅ Cron service already exists"
    else
        echo "Creating cron service..."
        railway service create cron
        railway link cron
        railway up --detach
    fi
}

# Function to verify deployment
verify_deployment() {
    echo -e "\n✅ Verifying deployment..."
    
    # Check backend health
    echo "Checking backend health..."
    if curl -s "https://$BACKEND_URL/api/health" | grep -q "ok"; then
        echo "✅ Backend is healthy"
    else
        echo "❌ Backend health check failed"
    fi
    
    # Check frontend
    echo "Checking frontend..."
    if curl -s "https://$FRONTEND_URL" | grep -q "DAO Helper"; then
        echo "✅ Frontend is accessible"
    else
        echo "❌ Frontend check failed"
    fi
}

# Main deployment flow
main() {
    echo "Starting Railway deployment..."
    
    setup_project
    setup_database
    setup_environment_variables
    deploy_backend
    deploy_frontend
    run_migrations
    setup_cron
    verify_deployment
    
    echo -e "\n🎉 Deployment complete!"
    echo "Backend URL: https://$BACKEND_URL"
    echo "Frontend URL: https://$FRONTEND_URL"
    echo "Default admin password: ${ADMIN_PASSWORD:-admin123}"
    echo -e "\nNext steps:"
    echo "1. Visit the frontend URL and login"
    echo "2. Check system health at /system/health"
    echo "3. Monitor logs with: railway logs"
}

# Run main deployment
main