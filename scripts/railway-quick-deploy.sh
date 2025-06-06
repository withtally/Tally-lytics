#!/bin/bash

# Quick Railway deployment commands for DAO Helper Tool
# Usage: ./railway-quick-deploy.sh [command]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check Railway CLI installation
check_railway_cli() {
    if ! command -v railway &> /dev/null; then
        log_error "Railway CLI not found. Installing..."
        npm install -g @railway/cli
    fi
}

# Commands
case "$1" in
    "init")
        log_info "Initializing new Railway project..."
        check_railway_cli
        railway login
        railway init
        ;;
        
    "setup")
        log_info "Setting up complete Railway environment..."
        check_railway_cli
        
        # Create services
        railway service create backend
        railway service create frontend
        railway service create cron
        railway add --database postgres
        
        log_info "Services created. Run './railway-quick-deploy.sh env' to set environment variables"
        ;;
        
    "env")
        log_info "Setting environment variables from .env file..."
        if [ ! -f .env ]; then
            log_error ".env file not found!"
            exit 1
        fi
        
        # Set variables for all services
        services=("backend" "frontend" "cron")
        for service in "${services[@]}"; do
            log_info "Setting variables for $service..."
            railway link $service
            
            while IFS='=' read -r key value; do
                if [[ ! "$key" =~ ^#.*$ ]] && [[ -n "$key" ]]; then
                    value="${value%\"}"
                    value="${value#\"}"
                    railway variables set "$key=$value" &>/dev/null
                fi
            done < .env
        done
        
        # Set service-specific variables
        railway link backend
        railway variables set NODE_ENV=production
        railway variables set PORT=3004
        
        railway link frontend
        BACKEND_URL=$(railway link backend && railway status --json | jq -r '.domains[0]' || echo "")
        if [ -n "$BACKEND_URL" ]; then
            railway link frontend
            railway variables set NEXT_PUBLIC_API_URL="https://$BACKEND_URL"
        fi
        
        log_info "Environment variables set"
        ;;
        
    "deploy")
        log_info "Deploying all services..."
        
        # Deploy backend
        log_info "Deploying backend..."
        railway link backend
        railway up --detach
        
        # Deploy frontend
        log_info "Deploying frontend..."
        railway link frontend
        railway up --detach
        
        # Deploy cron
        log_info "Deploying cron service..."
        railway link cron
        railway up --detach
        
        log_info "All services deployed"
        ;;
        
    "migrate")
        log_info "Running database migrations..."
        railway link backend
        railway run bun migrate:prod
        ;;
        
    "logs")
        service="${2:-backend}"
        log_info "Showing logs for $service..."
        railway link $service
        railway logs -f
        ;;
        
    "status")
        log_info "Project Status:"
        railway status
        echo ""
        log_info "Services:"
        railway service list
        echo ""
        log_info "Recent deployments:"
        railway link backend
        railway deployments
        ;;
        
    "health")
        log_info "Checking service health..."
        
        # Get URLs
        railway link backend
        BACKEND_URL=$(railway status --json 2>/dev/null | jq -r '.domains[0]' || echo "")
        
        railway link frontend  
        FRONTEND_URL=$(railway status --json 2>/dev/null | jq -r '.domains[0]' || echo "")
        
        # Check backend
        if [ -n "$BACKEND_URL" ]; then
            if curl -s "https://$BACKEND_URL/api/health" | grep -q "ok"; then
                log_info "✅ Backend is healthy: https://$BACKEND_URL"
            else
                log_error "❌ Backend health check failed"
            fi
        else
            log_warning "Backend URL not found"
        fi
        
        # Check frontend
        if [ -n "$FRONTEND_URL" ]; then
            if curl -s "https://$FRONTEND_URL" | grep -q "</html>"; then
                log_info "✅ Frontend is accessible: https://$FRONTEND_URL"
            else
                log_error "❌ Frontend check failed"
            fi
        else
            log_warning "Frontend URL not found"
        fi
        ;;
        
    "urls")
        log_info "Service URLs:"
        
        railway link backend
        BACKEND_URL=$(railway status --json 2>/dev/null | jq -r '.domains[0]' || echo "Not deployed")
        echo "Backend:  https://$BACKEND_URL"
        
        railway link frontend
        FRONTEND_URL=$(railway status --json 2>/dev/null | jq -r '.domains[0]' || echo "Not deployed")
        echo "Frontend: https://$FRONTEND_URL"
        ;;
        
    "redeploy")
        service="${2:-backend}"
        log_info "Redeploying $service..."
        railway link $service
        railway redeploy
        ;;
        
    "delete")
        log_warning "This will delete the entire project and all data!"
        read -p "Are you sure? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            railway delete
        else
            log_info "Deletion cancelled"
        fi
        ;;
        
    "pgvector")
        log_info "Setting up pgvector extension..."
        railway run --service postgres -- psql -c "CREATE EXTENSION IF NOT EXISTS vector;"
        log_info "pgvector extension enabled"
        ;;
        
    "backup")
        log_info "Creating database backup..."
        timestamp=$(date +%Y%m%d_%H%M%S)
        railway run --service postgres -- pg_dump > "backup_${timestamp}.sql"
        log_info "Backup saved to backup_${timestamp}.sql"
        ;;
        
    *)
        echo "Railway Quick Deploy Commands"
        echo "============================"
        echo ""
        echo "Usage: $0 [command] [options]"
        echo ""
        echo "Commands:"
        echo "  init      - Initialize new Railway project"
        echo "  setup     - Create all required services"
        echo "  env       - Set environment variables from .env"
        echo "  deploy    - Deploy all services"
        echo "  migrate   - Run database migrations"
        echo "  logs      - Show logs (default: backend)"
        echo "  status    - Show project and deployment status"
        echo "  health    - Check service health"
        echo "  urls      - Show service URLs"
        echo "  redeploy  - Redeploy a service"
        echo "  delete    - Delete the entire project"
        echo "  pgvector  - Enable pgvector extension"
        echo "  backup    - Backup the database"
        echo ""
        echo "Examples:"
        echo "  $0 logs frontend     # Show frontend logs"
        echo "  $0 redeploy frontend # Redeploy frontend"
        echo ""
        echo "Quick start:"
        echo "  1. $0 init"
        echo "  2. $0 setup"
        echo "  3. $0 env"
        echo "  4. $0 deploy"
        echo "  5. $0 migrate"
        echo "  6. $0 health"
        ;;
esac