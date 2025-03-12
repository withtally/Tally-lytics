FROM node:18-slim

WORKDIR /app

# Install curl
RUN apt-get update && apt-get install -y curl && apt-get clean

# Set environment variables
ENV NODE_ENV=production

# Create a simple script to run the curl command with error handling
RUN echo '#!/bin/sh\n\
echo "Cron job started at $(date)"\n\
# Check if MAIN_SERVICE_URL is set\n\
if [ -z "$MAIN_SERVICE_URL" ]; then\n\
  echo "ERROR: MAIN_SERVICE_URL environment variable is not set!"\n\
  echo "Attempting to use default URL: https://tally-lytics-production.up.railway.app"\n\
  MAIN_SERVICE_URL="https://tally-lytics-production.up.railway.app"\n\
fi\n\
echo "Calling: $MAIN_SERVICE_URL/api/crawl/start/all"\n\
curl -v -X POST $MAIN_SERVICE_URL/api/crawl/start/all -H "Content-Type: application/json"\n\
EXIT_CODE=$?\n\
echo "Environment variables:"\n\
echo "MAIN_SERVICE_URL: $MAIN_SERVICE_URL"\n\
echo "NODE_ENV: $NODE_ENV"\n\
echo "Curl completed with exit code: $EXIT_CODE at $(date)"\n\
' > /app/run.sh
RUN chmod +x /app/run.sh

# Set the command to run
CMD ["/app/run.sh"]