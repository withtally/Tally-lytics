#!/bin/sh
# Script to execute cron job with detailed logging

# Log start time
echo "========================================" 
echo "Cron job started at $(date)"

# Check if MAIN_SERVICE_URL is set
if [ -z "$MAIN_SERVICE_URL" ]; then
  echo "ERROR: MAIN_SERVICE_URL environment variable is not set!"
  echo "Please set this variable in your Railway project configuration."
  echo "Example: https://your-main-service.railway.app"
  
  # Try to use a default URL if available
  DEFAULT_URL="https://tally-lytics-production.up.railway.app"
  echo "Attempting to use default URL: $DEFAULT_URL"
  MAIN_SERVICE_URL="$DEFAULT_URL"
fi

echo "Attempting to call: $MAIN_SERVICE_URL/api/crawl/start/all"

# Execute the curl command with verbose output
curl -v -X POST $MAIN_SERVICE_URL/api/crawl/start/all -H 'Content-Type: application/json'

# Log the exit status
EXIT_CODE=$?
echo "Curl command completed with exit code: $EXIT_CODE"

# Additional environment debugging
echo "Environment variables:"
echo "MAIN_SERVICE_URL: $MAIN_SERVICE_URL"
echo "NODE_ENV: $NODE_ENV"

echo "Cron job finished at $(date)"
echo "========================================"

# Return the exit code from curl
exit $EXIT_CODE
