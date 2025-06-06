#!/bin/bash

# Script to help set up environment variables for Railway deployment
# This script creates a proper .env file from user input

set -e

echo "🔧 Railway Environment Setup Helper"
echo "=================================="
echo ""
echo "This script will help you create a .env file for Railway deployment."
echo "Press Enter to use default values where available."
echo ""

# Function to read input with default value
read_with_default() {
    local prompt="$1"
    local default="$2"
    local var_name="$3"
    
    if [ -n "$default" ]; then
        read -p "$prompt [$default]: " input
        eval "$var_name='${input:-$default}'"
    else
        read -p "$prompt: " input
        eval "$var_name='$input'"
    fi
}

# Create .env file
cat > .env << EOF
# DAO Helper Tool Environment Variables
# Generated on $(date)

EOF

# Required variables
echo "📌 Required Configuration"
echo "------------------------"

read_with_default "OpenAI API Key" "" "OPENAI_API_KEY"
if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ OpenAI API Key is required!"
    exit 1
fi

read_with_default "OpenAI Organization ID" "" "OPENAI_ORG_ID"
if [ -z "$OPENAI_ORG_ID" ]; then
    echo "❌ OpenAI Organization ID is required!"
    exit 1
fi

cat >> .env << EOF
# Required - OpenAI Configuration
OPENAI_API_KEY=$OPENAI_API_KEY
OPENAI_ORG_ID=$OPENAI_ORG_ID

EOF

# Optional variables
echo ""
echo "📋 Optional Configuration (press Enter to skip)"
echo "----------------------------------------------"

# Admin password
read_with_default "Admin Password" "admin123" "ADMIN_PASSWORD"
cat >> .env << EOF
# Admin Configuration
ADMIN_PASSWORD=$ADMIN_PASSWORD

EOF

# Forum API Keys
echo ""
echo "Forum API Keys (optional):"
read_with_default "Arbitrum API Key" "" "ARBITRUM_API_KEY"
read_with_default "Optimism API Key" "" "OPTIMISM_API_KEY"
read_with_default "Apecoin API Key" "" "APECOIN_API_KEY"
read_with_default "Pendle API Key" "" "PENDLE_API_KEY"
read_with_default "Compound API Key" "" "COMPOUND_API_KEY"

if [ -n "$ARBITRUM_API_KEY" ] || [ -n "$OPTIMISM_API_KEY" ] || [ -n "$APECOIN_API_KEY" ] || [ -n "$PENDLE_API_KEY" ] || [ -n "$COMPOUND_API_KEY" ]; then
    cat >> .env << EOF
# Forum API Keys
EOF
    [ -n "$ARBITRUM_API_KEY" ] && echo "ARBITRUM_API_KEY=$ARBITRUM_API_KEY" >> .env
    [ -n "$OPTIMISM_API_KEY" ] && echo "OPTIMISM_API_KEY=$OPTIMISM_API_KEY" >> .env
    [ -n "$APECOIN_API_KEY" ] && echo "APECOIN_API_KEY=$APECOIN_API_KEY" >> .env
    [ -n "$PENDLE_API_KEY" ] && echo "PENDLE_API_KEY=$PENDLE_API_KEY" >> .env
    [ -n "$COMPOUND_API_KEY" ] && echo "COMPOUND_API_KEY=$COMPOUND_API_KEY" >> .env
    echo "" >> .env
fi

# External services
echo ""
echo "External Services (optional):"
read_with_default "CoinGecko Pro API Key" "" "COINGECKO_PRO_API_KEY"
read_with_default "News API Key" "" "NEWS_API_KEY"
read_with_default "Tally API Key" "" "TALLY_API"

if [ -n "$COINGECKO_PRO_API_KEY" ] || [ -n "$NEWS_API_KEY" ] || [ -n "$TALLY_API" ]; then
    cat >> .env << EOF
# External Services
EOF
    [ -n "$COINGECKO_PRO_API_KEY" ] && echo "COINGECKO_PRO_API_KEY=$COINGECKO_PRO_API_KEY" >> .env
    [ -n "$NEWS_API_KEY" ] && echo "NEWS_API_KEY=$NEWS_API_KEY" >> .env
    [ -n "$TALLY_API" ] && echo "TALLY_API=$TALLY_API" >> .env
    echo "" >> .env
fi

# LLM Configuration
echo ""
echo "LLM Configuration (optional):"
read_with_default "Primary LLM Model" "gpt-4-turbo-preview" "LLM_MODEL"
read_with_default "Mini LLM Model" "gpt-3.5-turbo" "LLM_MINI_MODEL"

cat >> .env << EOF
# LLM Configuration
LLM_MODEL=$LLM_MODEL
LLM_MINI_MODEL=$LLM_MINI_MODEL

EOF

# Cron configuration
read_with_default "Cron API Key (for security)" "" "CRON_API_KEY"
if [ -n "$CRON_API_KEY" ]; then
    cat >> .env << EOF
# Cron Configuration
CRON_API_KEY=$CRON_API_KEY

EOF
fi

echo ""
echo "✅ .env file created successfully!"
echo ""

# Ask if user wants to deploy now
read -p "Would you like to deploy to Railway now? (y/n): " deploy_now

if [ "$deploy_now" = "y" ] || [ "$deploy_now" = "Y" ]; then
    echo ""
    echo "Starting Railway deployment..."
    echo ""
    
    # Check if railway-quick-deploy.sh exists
    if [ -f "./scripts/railway-quick-deploy.sh" ]; then
        ./scripts/railway-quick-deploy.sh init
        ./scripts/railway-quick-deploy.sh setup
        ./scripts/railway-quick-deploy.sh env
        ./scripts/railway-quick-deploy.sh deploy
        ./scripts/railway-quick-deploy.sh migrate
        ./scripts/railway-quick-deploy.sh health
    else
        echo "❌ railway-quick-deploy.sh not found. Please run the deployment manually."
    fi
else
    echo ""
    echo "To deploy later, run:"
    echo "  ./scripts/railway-quick-deploy.sh init"
    echo "  ./scripts/railway-quick-deploy.sh setup"
    echo "  ./scripts/railway-quick-deploy.sh env"
    echo "  ./scripts/railway-quick-deploy.sh deploy"
    echo "  ./scripts/railway-quick-deploy.sh migrate"
fi